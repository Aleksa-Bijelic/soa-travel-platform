package service

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"example.com/reservation-service/dto"
	"example.com/reservation-service/model"
	"example.com/reservation-service/repo"
	grpcclient "example.com/reservation-service/grpc"
)

type ReservationService struct {
	EventRepo       *repo.EventRepository
	ReservationRepo *repo.ReservationRepository
	TourSessionRepo *repo.TourSessionRepository
	ActivityRepo    *repo.ActivityRepository
	TourClient      *grpcclient.TourClient
	DB              *gorm.DB
}

func (s *ReservationService) CreateEvent(req dto.CreateEventRequest, creatorID string) (*model.Event, error) {
	eventDate, err := time.Parse(time.RFC3339, req.EventDate)
	if err != nil {
		return nil, fmt.Errorf("invalid event_date format: %w", err)
	}

	if eventDate.Before(time.Now()) {
		return nil, errors.New("event date must be in the future")
	}

	if req.MaxCapacity <= 0 {
		return nil, errors.New("max_capacity must be positive")
	}

	if req.Name == "" {
		return nil, errors.New("name is required")
	}

	event := &model.Event{
		ID:             uuid.New(),
		EventType:      model.EventType(req.EventType),
		Name:           req.Name,
		Description:    req.Description,
		Location:       req.Location,
		EventDate:      eventDate,
		MaxCapacity:    req.MaxCapacity,
		PricePerPerson: req.PricePerPerson,
		Status:         model.EventScheduled,
	}

	switch model.EventType(req.EventType) {
	case model.EventTourSession:
		if req.TourID == "" {
			return nil, errors.New("tour_id is required for tour_session")
		}
		// Validate tour exists and is published via gRPC
		published, err := s.TourClient.IsTourPublished(req.TourID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify tour: %w", err)
		}
		if !published {
			return nil, errors.New("tour is not published")
		}
		if err := s.EventRepo.Create(event); err != nil {
			return nil, err
		}
		session := &model.TourSession{
			EventID: event.ID,
			TourID:  req.TourID,
			GuideID: creatorID,
		}
		if err := s.TourSessionRepo.Create(session); err != nil {
			return nil, err
		}

	case model.EventActivity:
		if req.ActivityType == "" {
			return nil, errors.New("activity_type is required for activity")
		}
		if err := s.EventRepo.Create(event); err != nil {
			return nil, err
		}
		activity := &model.Activity{
			EventID:      event.ID,
			ActivityType: model.ActivityType(req.ActivityType),
			VenueInfo:    req.VenueInfo,
		}
		if err := s.ActivityRepo.Create(activity); err != nil {
			return nil, err
		}

	default:
		return nil, errors.New("invalid event_type: must be 'tour_session' or 'activity'")
	}

	return event, nil
}

// ReserveSeat is the core function that handles race conditions using
// pessimistic locking (SELECT FOR UPDATE).
//
// Flow:
// 1. BEGIN transaction
// 2. LOCK event row (SELECT ... FOR UPDATE)
// 3. Check capacity
// 4. Check seat availability (for activities)
// 5. Check for duplicate reservation
// 6. INSERT reservation
// 7. UPDATE event status if full
// 8. COMMIT
//
// If any step fails, the entire transaction is rolled back.
func (s *ReservationService) ReserveSeat(eventID uuid.UUID, touristID string, req dto.ReserveRequest) (*model.Reservation, error) {
	var result *model.Reservation

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// Step 1: Lock the event row to prevent concurrent modifications
		event, count, err := s.EventRepo.LockAndCountReservations(tx, eventID)
		if err != nil {
			return fmt.Errorf("failed to lock event: %w", err)
		}

		// Step 2: Check if event exists and is reservable
		if event == nil {
			return errors.New("event not found")
		}
		if event.Status == model.EventCancelled {
			return errors.New("event is cancelled")
		}
		if event.Status == model.EventCompleted {
			return errors.New("event is completed")
		}

		// Step 3: Check capacity
		if count >= int64(event.MaxCapacity) {
			return errors.New("event is full")
		}

		// Step 4: For activities, check if specific seat is available
		if req.SeatNumber != nil {
			seatNum := *req.SeatNumber
			if seatNum < 1 || seatNum > event.MaxCapacity {
				return fmt.Errorf("invalid seat number: must be between 1 and %d", event.MaxCapacity)
			}
			available, err := s.ReservationRepo.CheckSeatAvailability(tx, eventID, seatNum)
			if err != nil {
				return err
			}
			if !available {
				return fmt.Errorf("seat %d is already taken", seatNum)
			}
		} else if event.EventType == model.EventActivity {
			return errors.New("seat_number is required for activities")
		}

		// Step 5: Check for duplicate reservation
		isNew, err := s.ReservationRepo.CheckDuplicateReservation(tx, eventID, touristID)
		if err != nil {
			return err
		}
		if !isNew {
			return errors.New("you already have an active reservation for this event")
		}

		// Step 6: Create reservation
		reservation := &model.Reservation{
			ID:         uuid.New(),
			EventID:    eventID,
			TouristID:  touristID,
			SeatNumber: req.SeatNumber,
			Status:     model.ReservationPending,
			ReservedAt: time.Now(),
		}
		if err := s.ReservationRepo.CreateWithTx(tx, reservation); err != nil {
			return fmt.Errorf("failed to create reservation: %w", err)
		}

		// Step 7: Update event status if full
		newCount := count + 1
		if newCount >= int64(event.MaxCapacity) {
			if err := s.EventRepo.UpdateStatusWithTx(tx, eventID, model.EventFull); err != nil {
				return fmt.Errorf("failed to update event status: %w", err)
			}
		}

		result = reservation
		log.Printf("[RESERVATION] Created reservation %s for event %s by tourist %s (seat: %v)",
			reservation.ID, eventID, touristID, req.SeatNumber)
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *ReservationService) CancelReservation(reservationID uuid.UUID, touristID string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		reservation, err := s.ReservationRepo.FindByID(reservationID)
		if err != nil {
			return errors.New("reservation not found")
		}
		if reservation.TouristID != touristID {
			return errors.New("unauthorized")
		}
		if reservation.Status != model.ReservationPending && reservation.Status != model.ReservationConfirmed {
			return errors.New("cannot cancel this reservation")
		}

		if err := s.ReservationRepo.UpdateStatus(reservationID, model.ReservationCancelled); err != nil {
			return err
		}

		// If event was full, set it back to scheduled
		event, err := s.EventRepo.FindByID(reservation.EventID)
		if err == nil && event.Status == model.EventFull {
			_ = s.EventRepo.UpdateStatus(event.ID, model.EventScheduled)
		}

		log.Printf("[RESERVATION] Cancelled reservation %s by tourist %s", reservationID, touristID)
		return nil
	})
}

func (s *ReservationService) ConfirmReservation(reservationID uuid.UUID) error {
	return s.ReservationRepo.UpdateStatus(reservationID, model.ReservationConfirmed)
}

func (s *ReservationService) GetEventByID(id uuid.UUID) (*model.Event, error) {
	return s.EventRepo.FindByID(id)
}

func (s *ReservationService) GetEvents(eventType, status string) ([]model.Event, error) {
	return s.EventRepo.FindAll(eventType, status)
}

func (s *ReservationService) GetUserReservations(touristID string) ([]model.Reservation, error) {
	return s.ReservationRepo.FindByTourist(touristID)
}

func (s *ReservationService) GetSeatsForEvent(eventID uuid.UUID) ([]dto.SeatResponse, error) {
	event, err := s.EventRepo.FindByID(eventID)
	if err != nil {
		return nil, err
	}

	reservations, err := s.ReservationRepo.GetSeatsForEvent(eventID)
	if err != nil {
		return nil, err
	}

	// Build map of taken seats
	takenSeats := make(map[int]string)
	for _, res := range reservations {
		if res.SeatNumber != nil {
			takenSeats[*res.SeatNumber] = string(res.Status)
		}
	}

	// Build full seat list
	seats := make([]dto.SeatResponse, event.MaxCapacity)
	for i := 0; i < event.MaxCapacity; i++ {
		seatNum := i + 1
		status := "available"
		if s, ok := takenSeats[seatNum]; ok {
			status = s
		}
		seats[i] = dto.SeatResponse{
			SeatNumber: seatNum,
			Status:     status,
		}
	}
	return seats, nil
}

func (s *ReservationService) GetEventReservations(eventID uuid.UUID) ([]model.Reservation, error) {
	return s.ReservationRepo.GetReservationsByEvent(eventID)
}

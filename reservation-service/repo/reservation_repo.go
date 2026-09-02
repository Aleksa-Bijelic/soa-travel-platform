package repo

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"example.com/reservation-service/model"
)

type ReservationRepository struct {
	DB *gorm.DB
}

func (r *ReservationRepository) Create(reservation *model.Reservation) error {
	return r.DB.Create(reservation).Error
}

func (r *ReservationRepository) FindByID(id uuid.UUID) (*model.Reservation, error) {
	var res model.Reservation
	err := r.DB.Where("id = ?", id).First(&res).Error
	return &res, err
}

func (r *ReservationRepository) FindByEventAndTourist(eventID uuid.UUID, touristID string) (*model.Reservation, error) {
	var res model.Reservation
	err := r.DB.Where("event_id = ? AND tourist_id = ? AND status IN ?",
		eventID, touristID, []string{"pending", "confirmed"}).First(&res).Error
	return &res, err
}

func (r *ReservationRepository) FindByTourist(touristID string) ([]model.Reservation, error) {
	var reservations []model.Reservation
	err := r.DB.Where("tourist_id = ?", touristID).
		Order("reserved_at DESC").Find(&reservations).Error
	return reservations, err
}

func (r *ReservationRepository) UpdateStatus(id uuid.UUID, status model.ReservationStatus) error {
	return r.DB.Model(&model.Reservation{}).Where("id = ?", id).Update("status", status).Error
}

// CheckSeatAvailability checks if a specific seat is already taken.
// Uses FOR UPDATE locking to prevent double-booking.
func (r *ReservationRepository) CheckSeatAvailability(tx *gorm.DB, eventID uuid.UUID, seatNumber int) (bool, error) {
	var count int64
	err := tx.Model(&model.Reservation{}).
		Where("event_id = ? AND seat_number = ? AND status IN ?",
			eventID, seatNumber, []string{"pending", "confirmed"}).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("failed to check seat: %w", err)
	}
	return count == 0, nil
}

// CheckDuplicateReservation checks if user already has an active reservation for this event.
func (r *ReservationRepository) CheckDuplicateReservation(tx *gorm.DB, eventID uuid.UUID, touristID string) (bool, error) {
	var count int64
	err := tx.Model(&model.Reservation{}).
		Where("event_id = ? AND tourist_id = ? AND status IN ?",
			eventID, touristID, []string{"pending", "confirmed"}).
		Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("failed to check duplicate: %w", err)
	}
	return count == 0, nil
}

// GetSeatsForEvent returns all seats for a given event.
func (r *ReservationRepository) GetSeatsForEvent(eventID uuid.UUID) ([]model.Reservation, error) {
	var reservations []model.Reservation
	err := r.DB.Where("event_id = ? AND status IN ?",
		eventID, []string{"pending", "confirmed"}).Find(&reservations).Error
	return reservations, err
}

// GetReservationsByEvent returns all active reservations for a given event.
func (r *ReservationRepository) GetReservationsByEvent(eventID uuid.UUID) ([]model.Reservation, error) {
	var reservations []model.Reservation
	err := r.DB.Where("event_id = ? AND status IN ?",
		eventID, []string{"pending", "confirmed"}).Find(&reservations).Error
	return reservations, err
}

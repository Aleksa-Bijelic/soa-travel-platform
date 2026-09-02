package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"example.com/reservation-service/dto"
	"example.com/reservation-service/middleware"
	"example.com/reservation-service/service"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type ReservationHandler struct {
	Service *service.ReservationService
}

func (h *ReservationHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	userID, role, err := getUserIDAndRole(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if role != "guide" && role != "admin" {
		http.Error(w, "only guides and admins can create events", http.StatusForbidden)
		return
	}

	var req dto.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	event, err := h.Service.CreateEvent(req, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, event)
}

func (h *ReservationHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	eventType := r.URL.Query().Get("type")
	status := r.URL.Query().Get("status")

	events, err := h.Service.GetEvents(eventType, status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Enrich with current reservation counts
	type enrichedEvent struct {
		dto.EventResponse
		CurrentReserved int `json:"current_reserved"`
		AvailableSpots  int `json:"available_spots"`
	}

	var result []enrichedEvent
	for _, e := range events {
		count, _ := h.Service.EventRepo.CountReservations(e.ID)
		result = append(result, enrichedEvent{
			EventResponse: dto.EventResponse{
				ID:             e.ID.String(),
				EventType:      string(e.EventType),
				Name:           e.Name,
				Description:    e.Description,
				Location:       e.Location,
				EventDate:      e.EventDate,
				MaxCapacity:    e.MaxCapacity,
				PricePerPerson: e.PricePerPerson,
				Status:         string(e.Status),
				CreatedAt:      e.CreatedAt,
			},
			CurrentReserved: int(count),
			AvailableSpots:  e.MaxCapacity - int(count),
		})
	}

	writeJSON(w, result)
}

func (h *ReservationHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	event, err := h.Service.GetEventByID(eventID)
	if err != nil {
		http.Error(w, "event not found", http.StatusNotFound)
		return
	}

	count, _ := h.Service.EventRepo.CountReservations(eventID)

	resp := dto.EventResponse{
		ID:              event.ID.String(),
		EventType:       string(event.EventType),
		Name:            event.Name,
		Description:     event.Description,
		Location:        event.Location,
		EventDate:       event.EventDate,
		MaxCapacity:     event.MaxCapacity,
		CurrentReserved: int(count),
		AvailableSpots:  event.MaxCapacity - int(count),
		PricePerPerson:  event.PricePerPerson,
		Status:          string(event.Status),
		CreatedAt:       event.CreatedAt,
	}

	writeJSON(w, resp)
}

func (h *ReservationHandler) ReserveSeat(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	var req dto.ReserveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	reservation, err := h.Service.ReserveSeat(eventID, userID, req)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, errors.New("event is full")) {
			status = http.StatusConflict
		}
		http.Error(w, err.Error(), status)
		return
	}

	writeJSON(w, reservation)
}

func (h *ReservationHandler) CancelReservation(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	reservationID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "invalid reservation id", http.StatusBadRequest)
		return
	}

	if err := h.Service.CancelReservation(reservationID, userID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ReservationHandler) GetSeats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	eventID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "invalid event id", http.StatusBadRequest)
		return
	}

	seats, err := h.Service.GetSeatsForEvent(eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, seats)
}

func (h *ReservationHandler) GetMyReservations(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserID(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	reservations, err := h.Service.GetUserReservations(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Enrich with event names
	type enrichedReservation struct {
		dto.ReservationResponse
	}

	var result []enrichedReservation
	for _, res := range reservations {
		resp := dto.ReservationResponse{
			ID:         res.ID.String(),
			EventID:    res.EventID.String(),
			EventName:  "",
			TouristID:  res.TouristID,
			SeatNumber: res.SeatNumber,
			Status:     string(res.Status),
			ReservedAt: res.ReservedAt,
		}
		if event, err := h.Service.GetEventByID(res.EventID); err == nil {
			resp.EventName = event.Name
			resp.EventDate = event.EventDate
		}
		result = append(result, enrichedReservation{ReservationResponse: resp})
	}

	writeJSON(w, result)
}

func (h *ReservationHandler) ConfirmReservation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	reservationID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "invalid reservation id", http.StatusBadRequest)
		return
	}

	if err := h.Service.ConfirmReservation(reservationID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{"status": "confirmed"})
}

func getUserID(r *http.Request) (string, error) {
	userIDVal := r.Context().Value(middleware.UserIDKey)
	userIDStr, ok := userIDVal.(string)
	if !ok || userIDStr == "" {
		return "", errors.New("unauthorized")
	}
	return userIDStr, nil
}

func getUserIDAndRole(r *http.Request) (string, string, error) {
	userIDVal := r.Context().Value(middleware.UserIDKey)
	userIDStr, ok := userIDVal.(string)
	if !ok || userIDStr == "" {
		return "", "", errors.New("unauthorized")
	}
	roleVal := r.Context().Value(middleware.RoleKey)
	roleStr, _ := roleVal.(string)
	return userIDStr, roleStr, nil
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payload)
}

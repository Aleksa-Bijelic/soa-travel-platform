package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"example.com/reservation-service/dto"
	"example.com/reservation-service/middleware"
	"example.com/reservation-service/repo"
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

	count, _ := h.Service.EventRepo.CountReservations(event.ID)
	writeJSON(w, h.Service.EnrichEvent(*event, count))
}

func (h *ReservationHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repo.EventFilter{
		EventType: q.Get("type"),
		Status:    q.Get("status"),
		City:      q.Get("city"),
		Category:  q.Get("category"),
		Search:    q.Get("search"),
	}

	events, err := h.Service.GetEvents(filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result := make([]dto.EventResponse, 0, len(events))
	for _, e := range events {
		count, _ := h.Service.EventRepo.CountReservations(e.ID)
		result = append(result, h.Service.EnrichEvent(e, count))
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

	writeJSON(w, h.Service.EnrichEvent(*event, count))
}

func (h *ReservationHandler) ReserveSeat(w http.ResponseWriter, r *http.Request) {
	userID, role, err := getUserIDAndRole(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	if role != "tourist" {
		http.Error(w, "only tourists can reserve seats", http.StatusForbidden)
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

	event, _ := h.Service.GetEventByID(eventID)

	resp := dto.ReservationResponse{
		ID:           reservation.ID.String(),
		EventID:      reservation.EventID.String(),
		TouristID:    reservation.TouristID,
		SeatNumber:   reservation.SeatNumber,
		Status:       string(reservation.Status),
		ReservedAt:   reservation.ReservedAt,
		ExpiresAt:    reservation.ExpiresAt,
	}
	if event != nil {
		resp.EventName = event.Name
		resp.EventDate = event.EventDate
		resp.PricePerPerson = event.PricePerPerson
	}

	writeJSON(w, resp)
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

	if seats == nil {
		seats = []dto.SeatResponse{}
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

	type enrichedReservation struct {
		dto.ReservationResponse
	}

	result := make([]enrichedReservation, 0)
	for _, res := range reservations {
		resp := dto.ReservationResponse{
			ID:         res.ID.String(),
			EventID:    res.EventID.String(),
			EventName:  "",
			TouristID:  res.TouristID,
			SeatNumber: res.SeatNumber,
			Status:     string(res.Status),
			ReservedAt: res.ReservedAt,
			ExpiresAt:  res.ExpiresAt,
		}
		if event, err := h.Service.GetEventByID(res.EventID); err == nil {
			resp.EventName = event.Name
			resp.EventDate = event.EventDate
			resp.PricePerPerson = event.PricePerPerson
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
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, map[string]string{"status": "confirmed"})
}

func (h *ReservationHandler) GetReservation(w http.ResponseWriter, r *http.Request) {
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

	reservation, err := h.Service.GetReservationByID(reservationID)
	if err != nil {
		http.Error(w, "reservation not found", http.StatusNotFound)
		return
	}
	if reservation.TouristID != userID {
		http.Error(w, "unauthorized", http.StatusForbidden)
		return
	}

	event, _ := h.Service.GetEventByID(reservation.EventID)
	resp := dto.ReservationResponse{
		ID:         reservation.ID.String(),
		EventID:    reservation.EventID.String(),
		TouristID:  reservation.TouristID,
		SeatNumber: reservation.SeatNumber,
		Status:     string(reservation.Status),
		ReservedAt: reservation.ReservedAt,
		ExpiresAt:  reservation.ExpiresAt,
	}
	if event != nil {
		resp.EventName = event.Name
		resp.EventDate = event.EventDate
		resp.PricePerPerson = event.PricePerPerson
	}
	writeJSON(w, resp)
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

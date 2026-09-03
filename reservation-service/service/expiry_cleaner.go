package service

import (
	"log"
	"time"

	"example.com/reservation-service/model"
)

func (s *ReservationService) StartExpiryCleaner() {
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			s.cancelExpiredReservations()
		}
	}()
}

func (s *ReservationService) cancelExpiredReservations() {
	now := time.Now()
	// Collect expired reservations first so we can reopen their events.
	var expired []model.Reservation
	if err := s.DB.Where("status = ? AND expires_at IS NOT NULL AND expires_at < ?",
		model.ReservationPending, now).Find(&expired).Error; err != nil {
		log.Printf("[EXPIRY] error finding expired reservations: %v", err)
		return
	}
	if len(expired) == 0 {
		return
	}
	ids := make([]string, 0, len(expired))
	eventIDs := make(map[string]struct{})
	for _, r := range expired {
		ids = append(ids, r.ID.String())
		eventIDs[r.EventID.String()] = struct{}{}
	}
	result := s.DB.Model(&model.Reservation{}).
		Where("id IN ?", ids).
		Updates(map[string]interface{}{"status": model.ReservationCancelled, "expires_at": nil})
	if result.Error != nil {
		log.Printf("[EXPIRY] error cancelling expired reservations: %v", result.Error)
		return
	}
	if result.RowsAffected > 0 {
		log.Printf("[EXPIRY] cancelled %d expired reservations", result.RowsAffected)
	}
	// Reopen events that were full but now have free capacity.
	for eid := range eventIDs {
		_ = s.DB.Model(&model.Event{}).
			Where("id = ? AND status = ?", eid, model.EventFull).
			Update("status", model.EventScheduled).Error
	}
}

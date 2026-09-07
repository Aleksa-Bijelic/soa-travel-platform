package repo

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"example.com/reservation-service/model"
)

type EventRepository struct {
	DB *gorm.DB
}

func (r *EventRepository) Create(event *model.Event) error {
	return r.DB.Create(event).Error
}

func (r *EventRepository) FindByID(id uuid.UUID) (*model.Event, error) {
	var event model.Event
	err := r.DB.Where("id = ?", id).First(&event).Error
	return &event, err
}

type EventFilter struct {
	EventType string
	Status    string
	City      string
	Category  string // activity_type, e.g. "concert" | "theater" | "open_air_cinema"
	Search    string
}

func (r *EventRepository) FindAll(f EventFilter) ([]model.Event, error) {
	var events []model.Event
	q := r.DB.Model(&model.Event{})
	if f.EventType != "" {
		q = q.Where("events.event_type = ?", f.EventType)
	}
	if f.Status != "" {
		q = q.Where("events.status = ?", f.Status)
	}
	if f.City != "" {
		q = q.Where("LOWER(events.city) = LOWER(?)", f.City)
	}
	if f.Category != "" {
		q = q.Joins("JOIN activities ON activities.event_id = events.id").
			Where("activities.activity_type = ?", f.Category)
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("events.name ILIKE ? OR events.description ILIKE ? OR events.location ILIKE ? OR events.city ILIKE ?",
			like, like, like, like)
	}
	q = q.Where("events.event_date > NOW()")
	err := q.Order("events.event_date ASC").Find(&events).Error
	return events, err
}

func (r *EventRepository) UpdateStatus(id uuid.UUID, status model.EventStatus) error {
	return r.DB.Model(&model.Event{}).Where("id = ?", id).Update("status", status).Error
}

func (r *EventRepository) UpdateStatusWithTx(tx *gorm.DB, id uuid.UUID, status model.EventStatus) error {
	return tx.Model(&model.Event{}).Where("id = ?", id).Update("status", status).Error
}

func (r *EventRepository) CountReservations(eventID uuid.UUID) (int64, error) {
	var count int64
	err := r.DB.Model(&model.Reservation{}).
		Where("event_id = ? AND status IN ?", eventID, []string{"pending", "confirmed"}).
		Count(&count).Error
	return count, err
}

// LockAndCountReservations uses SELECT FOR UPDATE to prevent race conditions.
// This is the core mechanism: it locks the event row so no other transaction
// can modify the capacity check between our read and write.
func (r *EventRepository) LockAndCountReservations(tx *gorm.DB, eventID uuid.UUID) (*model.Event, int64, error) {
	var event model.Event
	err := tx.Where("id = ?", eventID).Clauses(clause.Locking{Strength: "UPDATE"}).First(&event).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to lock event: %w", err)
	}

	var count int64
	err = tx.Model(&model.Reservation{}).
		Where("event_id = ? AND status IN ?", eventID, []string{"pending", "confirmed"}).
		Count(&count).Error
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count reservations: %w", err)
	}

	return &event, count, nil
}

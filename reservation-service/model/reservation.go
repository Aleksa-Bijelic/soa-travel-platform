package model

import (
	"time"

	"github.com/google/uuid"
)

type ReservationStatus string

const (
	ReservationPending   ReservationStatus = "pending"
	ReservationConfirmed ReservationStatus = "confirmed"
	ReservationCancelled ReservationStatus = "cancelled"
)

type Reservation struct {
	ID         uuid.UUID          `gorm:"type:uuid;primaryKey"`
	EventID    uuid.UUID          `gorm:"type:uuid;not null;index:idx_event_seat"`
	TouristID  string             `gorm:"type:text;not null;index:idx_event_tourist"`
	SeatNumber *int               `gorm:"type:int;index:idx_event_seat"`
	Status     ReservationStatus  `gorm:"type:text;not null;default:pending"`
	ReservedAt time.Time          `gorm:"type:timestamptz;default:now()"`
	ExpiresAt  *time.Time         `gorm:"type:timestamptz"`
	Event      Event              `gorm:"foreignKey:EventID;references:ID;constraint:OnDelete:CASCADE"`
}

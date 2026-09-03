package model

import (
	"time"

	"github.com/google/uuid"
)

type EventType string

const (
	EventTourSession EventType = "tour_session"
	EventActivity    EventType = "activity"
)

type EventStatus string

const (
	EventScheduled EventStatus = "scheduled"
	EventFull      EventStatus = "full"
	EventCancelled EventStatus = "cancelled"
	EventCompleted EventStatus = "completed"
)

type Event struct {
	ID              uuid.UUID   `gorm:"type:uuid;primaryKey"`
	EventType       EventType   `gorm:"type:text;not null"`
	Name            string      `gorm:"type:text;not null"`
	Description     string      `gorm:"type:text"`
	Location        string      `gorm:"type:text"`
	City            string      `gorm:"type:text;index"`
	Latitude        *float64    `gorm:"type:double precision"`
	Longitude       *float64    `gorm:"type:double precision"`
	ImageURL        string      `gorm:"type:text"`
	EventDate       time.Time   `gorm:"type:timestamptz;not null"`
	MaxCapacity     int         `gorm:"type:int;not null"`
	PricePerPerson  float64     `gorm:"type:decimal(10,2);not null"`
	Status          EventStatus `gorm:"type:text;not null;scheduled"`
	CreatedAt       time.Time   `gorm:"type:timestamptz;default:now()"`
	CurrentReserved int         `gorm:"-"` // computed field, not stored
}

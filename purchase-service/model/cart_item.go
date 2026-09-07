package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CartItem struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID             uuid.UUID  `gorm:"type:uuid;not null;index"`
	TourID             *uuid.UUID `gorm:"type:uuid"`
	TourName           string     `gorm:"type:text;not null"`
	TourDescription    string     `gorm:"type:text;not null;default:''"`
	Price              float64    `gorm:"type:double precision;not null"`
	ItemType           string     `gorm:"type:text;not null;default:'tour'"` // "tour" or "reservation"
	ReservationID      *uuid.UUID `gorm:"type:uuid"`
	ReservationEventID *uuid.UUID `gorm:"type:uuid"`
	SeatNumber         *int       `gorm:"type:int"`
	CreatedAt          time.Time  `gorm:"autoCreateTime"`
}

func (item *CartItem) BeforeCreate(tx *gorm.DB) error {
	item.ID = uuid.New()
	return nil
}

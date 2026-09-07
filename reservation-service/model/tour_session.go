package model

import "github.com/google/uuid"

type TourSession struct {
	EventID  uuid.UUID `gorm:"type:uuid;primaryKey"`
	TourID   string    `gorm:"type:text;not null"`
	GuideID  string    `gorm:"type:text;not null"`
	Event    Event     `gorm:"foreignKey:EventID;references:ID;constraint:OnDelete:CASCADE"`
}

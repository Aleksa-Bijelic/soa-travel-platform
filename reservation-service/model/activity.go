package model

import "github.com/google/uuid"

type ActivityType string

const (
	ActivityWorkshop   ActivityType = "workshop"
	ActivityAdventure  ActivityType = "adventure"
	ActivityCultural   ActivityType = "cultural"
	ActivityTransport  ActivityType = "transport"
)

type Activity struct {
	EventID      uuid.UUID    `gorm:"type:uuid;primaryKey"`
	ActivityType ActivityType `gorm:"type:text;not null"`
	VenueInfo    string       `gorm:"type:text"`
	Event        Event        `gorm:"foreignKey:EventID;references:ID;constraint:OnDelete:CASCADE"`
}

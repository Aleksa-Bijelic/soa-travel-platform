package model

import "github.com/google/uuid"

type ActivityType string

const (
	// Supported activity categories.
	ActivityConcert      ActivityType = "concert"
	ActivityTheater      ActivityType = "theater"
	ActivityOpenAirCinema ActivityType = "open_air_cinema"

	// Deprecated: accepted by old data, no longer creatable.
	ActivityWorkshop  ActivityType = "workshop"
	ActivityAdventure ActivityType = "adventure"
	ActivityCultural  ActivityType = "cultural"
	ActivityTransport ActivityType = "transport"
)

// FixedActivityCapacity is kept for backward compatibility with events
// created before selectable capacities were introduced.
const FixedActivityCapacity = 100

// AllowedActivityCapacities are the seat counts a guide can choose from
// when creating an activity.
var AllowedActivityCapacities = []int{30, 80, 240, 400}

// IsAllowedCapacity reports whether n is a selectable activity capacity.
func IsAllowedCapacity(n int) bool {
	for _, c := range AllowedActivityCapacities {
		if c == n {
			return true
		}
	}
	return false
}

// IsSupportedCategory reports whether t is one of the 3 creatable categories.
func IsSupportedCategory(t ActivityType) bool {
	switch t {
	case ActivityConcert, ActivityTheater, ActivityOpenAirCinema:
		return true
	default:
		return false
	}
}

type Activity struct {
	EventID      uuid.UUID    `gorm:"type:uuid;primaryKey"`
	ActivityType ActivityType `gorm:"type:text;not null"`
	Event        Event        `gorm:"foreignKey:EventID;references:ID;constraint:OnDelete:CASCADE"`
}

package dto

import "time"

type CreateEventRequest struct {
	EventType      string   `json:"event_type"`      // "tour_session" | "activity"
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	Location       string   `json:"location"`
	City           string   `json:"city"`
	Latitude       *float64 `json:"latitude"`
	Longitude      *float64 `json:"longitude"`
	ImageURL       string   `json:"image_url"`
	EventDate      string   `json:"event_date"`       // RFC3339
	MaxCapacity    int      `json:"max_capacity"`     // activity: one of 30, 80, 240, 400
	PricePerPerson float64  `json:"price_per_person"`

	// TourSession specific
	TourID string `json:"tour_id,omitempty"`

	// Activity specific
	ActivityType string `json:"activity_type,omitempty"` // "concert" | "theater" | "open_air_cinema"
}

type ReserveRequest struct {
	SeatNumber *int `json:"seat_number,omitempty"` // required for activities, nil for tour_sessions
}

type EventResponse struct {
	ID              string            `json:"id"`
	EventType       string            `json:"event_type"`
	Name            string            `json:"name"`
	Description     string            `json:"description"`
	Location        string            `json:"location"`
	City            string            `json:"city"`
	Latitude        *float64          `json:"latitude,omitempty"`
	Longitude       *float64          `json:"longitude,omitempty"`
	ImageURL        string            `json:"image_url"`
	EventDate       time.Time         `json:"event_date"`
	MaxCapacity     int               `json:"max_capacity"`
	CurrentReserved int               `json:"current_reserved"`
	AvailableSpots  int               `json:"available_spots"`
	PricePerPerson  float64           `json:"price_per_person"`
	Status          string            `json:"status"`
	CreatedAt       time.Time         `json:"created_at"`
	TourID          string            `json:"tour_id,omitempty"`
	GuideID         string            `json:"guide_id,omitempty"`
	ActivityType    string            `json:"activity_type,omitempty"`
}

type ReservationResponse struct {
	ID           string     `json:"id"`
	EventID      string     `json:"event_id"`
	EventName    string     `json:"event_name"`
	TouristID    string     `json:"tourist_id"`
	SeatNumber   *int       `json:"seat_number,omitempty"`
	Status       string     `json:"status"`
	ReservedAt   time.Time  `json:"reserved_at"`
	EventDate    time.Time  `json:"event_date"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	PricePerPerson float64  `json:"price_per_person,omitempty"`
}

type SeatResponse struct {
	SeatNumber int    `json:"seat_number"`
	Status     string `json:"status"` // "available" | "reserved" | "confirmed"
}

package dto

import "time"

type CreateEventRequest struct {
	EventType      string  `json:"event_type"`      // "tour_session" | "activity"
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	Location       string  `json:"location"`
	EventDate      string  `json:"event_date"`       // RFC3339
	MaxCapacity    int     `json:"max_capacity"`
	PricePerPerson float64 `json:"price_per_person"`

	// TourSession specific
	TourID string `json:"tour_id,omitempty"`

	// Activity specific
	ActivityType string `json:"activity_type,omitempty"` // "workshop" | "adventure" | "cultural" | "transport"
	VenueInfo    string `json:"venue_info,omitempty"`
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
	VenueInfo       string            `json:"venue_info,omitempty"`
}

type ReservationResponse struct {
	ID         string    `json:"id"`
	EventID    string    `json:"event_id"`
	EventName  string    `json:"event_name"`
	TouristID  string    `json:"tourist_id"`
	SeatNumber *int      `json:"seat_number,omitempty"`
	Status     string    `json:"status"`
	ReservedAt time.Time `json:"reserved_at"`
	EventDate  time.Time `json:"event_date"`
}

type SeatResponse struct {
	SeatNumber int    `json:"seat_number"`
	Status     string `json:"status"` // "available" | "reserved" | "confirmed"
}

package reserve_seat

type ReservationCommandType int8

const (
	ProcessPayment ReservationCommandType = iota
	CancelReservation
)

type ReservationCommand struct {
	ReservationID string `json:"reservation_id"`
	EventID       string `json:"event_id"`
	UserID        string `json:"user_id"`
	Amount        float64 `json:"amount"`
	Type          ReservationCommandType `json:"type"`
}

type ReservationReplyType int8

const (
	PaymentProcessed ReservationReplyType = iota
	PaymentFailed
	ReservationCancelled
	ReservationCancelFailed
)

type ReservationReply struct {
	ReservationID string `json:"reservation_id"`
	Type          ReservationReplyType `json:"type"`
	Error         string `json:"error,omitempty"`
}

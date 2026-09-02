package handler

import (
	"log"

	"example.com/reservation-service/service"
	saga "saga"
	reserveseat "saga/reserve_seat"

	"github.com/google/uuid"
)

type ReserveSeatCommandHandler struct {
	service  *service.ReservationService
	publisher saga.Publisher
	subscriber saga.Subscriber
}

func NewReserveSeatCommandHandler(s *service.ReservationService, publisher saga.Publisher, subscriber saga.Subscriber) (*ReserveSeatCommandHandler, error) {
	h := &ReserveSeatCommandHandler{
		service:  s,
		publisher: publisher,
		subscriber: subscriber,
	}
	err := h.subscriber.Subscribe(h.HandleCommand)
	if err != nil {
		return nil, err
	}
	return h, nil
}

func (h *ReserveSeatCommandHandler) HandleCommand(message interface{}) {
	cmd, ok := message.(reserveseat.ReservationCommand)
	if !ok {
		log.Println("Invalid command received")
		return
	}

	switch cmd.Type {
	case reserveseat.ProcessPayment:
		resID, err := uuid.Parse(cmd.ReservationID)
		if err != nil {
			log.Printf("Invalid reservation ID %s: %v", cmd.ReservationID, err)
			return
		}
		err = h.service.ConfirmReservation(resID)
		if err != nil {
			log.Printf("Failed to confirm reservation %s: %v", cmd.ReservationID, err)
			h.publisher.Publish(reserveseat.ReservationReply{
				ReservationID: cmd.ReservationID,
				Type:          reserveseat.PaymentFailed,
				Error:         err.Error(),
			})
			return
		}
		log.Printf("Payment processed for reservation %s", cmd.ReservationID)
		h.publisher.Publish(reserveseat.ReservationReply{
			ReservationID: cmd.ReservationID,
			Type:          reserveseat.PaymentProcessed,
		})

	case reserveseat.CancelReservation:
		resID, err := uuid.Parse(cmd.ReservationID)
		if err != nil {
			log.Printf("Invalid reservation ID %s: %v", cmd.ReservationID, err)
			return
		}
		err = h.service.CancelReservation(resID, cmd.UserID)
		if err != nil {
			log.Printf("Failed to cancel reservation %s: %v", cmd.ReservationID, err)
			h.publisher.Publish(reserveseat.ReservationReply{
				ReservationID: cmd.ReservationID,
				Type:          reserveseat.ReservationCancelFailed,
				Error:         err.Error(),
			})
			return
		}
		log.Printf("Reservation %s cancelled", cmd.ReservationID)
		h.publisher.Publish(reserveseat.ReservationReply{
			ReservationID: cmd.ReservationID,
			Type:          reserveseat.ReservationCancelled,
		})
	}
}

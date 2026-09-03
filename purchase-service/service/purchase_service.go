package service

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"time"

	"example.com/purchase-service/dto"
	grpcclient "example.com/purchase-service/grpc"
	"example.com/purchase-service/model"
	"example.com/purchase-service/repo"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PurchaseService struct {
	CartRepo          *repo.CartRepository
	PurchaseRepo      *repo.PurchaseRepository
	TourClient        *grpcclient.TourClient
	ReservationClient *ReservationClient
}

func (s *PurchaseService) AddToCart(userID uuid.UUID, request dto.AddCartItemRequest, authHeader string) (*dto.CartItemResponse, error) {
	tourID, err := uuid.Parse(request.TourID)
	if err != nil {
		return nil, errors.New("invalid tour_id")
	}

	if request.TourName == "" {
		return nil, errors.New("tour_name is required")
	}
	if request.TourDescription == "" {
		return nil, errors.New("tour_description is required")
	}
	if request.Price < 0 {
		return nil, errors.New("price must be non-negative")
	}

	alreadyPurchased, err := s.PurchaseRepo.Exists(userID, tourID)
	if err != nil {
		return nil, err
	}
	if alreadyPurchased {
		return nil, errors.New("tour already purchased")
	}

	_, err = s.CartRepo.FindByUserAndTour(userID, tourID)
	if err == nil {
		return nil, errors.New("tour already in cart")
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	published, err := s.verifyTourPublished(tourID)
	if err != nil {
		return nil, err
	}
	if !published {
		return nil, errors.New("tour is not available for purchase")
	}

	cartItem := &model.CartItem{
		UserID:          userID,
		TourID:          &tourID,
		TourName:        request.TourName,
		TourDescription: request.TourDescription,
		Price:           request.Price,
		ItemType:        "tour",
	}

	if err := s.CartRepo.Create(cartItem); err != nil {
		return nil, err
	}

	return mapCartItem(cartItem), nil
}

func (s *PurchaseService) AddReservationToCart(userID uuid.UUID, reservationID, eventID uuid.UUID, eventName string, seatNumber *int, price float64) (*dto.CartItemResponse, error) {
	// Check if this reservation is already in cart
	items, err := s.CartRepo.FindByUser(userID)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		if item.ReservationID != nil && *item.ReservationID == reservationID {
			return nil, errors.New("reservation already in cart")
		}
	}

	cartItem := &model.CartItem{
		UserID:             userID,
		TourName:           eventName,
		TourDescription:    "Event reservation — seat " + fmt.Sprintf("%d", derefInt(seatNumber)),
		Price:              price,
		ItemType:           "reservation",
		ReservationID:      &reservationID,
		ReservationEventID: &eventID,
		SeatNumber:         seatNumber,
	}

	if err := s.CartRepo.Create(cartItem); err != nil {
		return nil, err
	}

	return mapCartItem(cartItem), nil
}

func derefInt(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}

func (s *PurchaseService) GetCart(userID uuid.UUID, authHeader string) (*dto.CartResponse, error) {
	items, err := s.CartRepo.FindByUser(userID)
	if err != nil {
		return nil, err
	}

	// Lazy cleanup: drop cart items whose reservation is no longer pending
	// (cancelled after expiry, confirmed elsewhere, or deleted).
	items = s.filterStaleReservationItems(userID, items, authHeader)

	cartItems := make([]dto.CartItemResponse, 0, len(items))
	total := 0.0
	for _, item := range items {
		if item.TourDescription == "" && item.TourID != nil {
			desc, err := s.getTourDescription(*item.TourID)
			if err == nil && desc != "" {
				item.TourDescription = desc
				_ = s.CartRepo.Update(&item)
			}
		}
		cartItems = append(cartItems, *mapCartItem(&item))
		total += item.Price
	}

	return &dto.CartResponse{Items: cartItems, Total: total}, nil
}

func (s *PurchaseService) CreatePurchaseFromCartItem(userID uuid.UUID, item model.CartItem) (*model.Purchase, error) {
	if item.TourID == nil {
		return nil, errors.New("cannot create purchase from reservation cart item")
	}
	return &model.Purchase{
		UserID:          userID,
		TourID:          *item.TourID,
		TourName:        item.TourName,
		TourDescription: item.TourDescription,
		Price:           item.Price,
	}, nil
}

func (s *PurchaseService) RemoveCartItem(userID, itemID uuid.UUID, authHeader string) error {
	// Fetch first so we can cancel the linked reservation afterwards.
	item, err := s.CartRepo.FindByID(userID, itemID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	if err := s.CartRepo.DeleteByID(userID, itemID); err != nil {
		return err
	}
	// Removing a reservation from the cart releases the seat,
	// same as pressing Cancel on the reservations tab.
	if item != nil && item.ItemType == "reservation" && item.ReservationID != nil && s.ReservationClient != nil {
		resID := item.ReservationID.String()
		if err := s.ReservationClient.CancelReservation(resID, authHeader); err != nil {
			log.Printf("[PURCHASE] failed to cancel reservation %s after cart removal: %v", resID, err)
		} else {
			log.Printf("[PURCHASE] cancelled reservation %s after cart removal", resID)
		}
	}
	return nil
}

func (s *PurchaseService) RemoveCartItemForEveryone(tourID uuid.UUID) error {
	return s.CartRepo.DeleteByTourID(tourID)
}

func (s *PurchaseService) ClearCart(userID uuid.UUID) error {
	return s.CartRepo.DeleteByUser(userID)
}

func (s *PurchaseService) Checkout(userID uuid.UUID, authHeader string) (*dto.CheckoutResponse, error) {
	items, err := s.CartRepo.FindByUser(userID)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, errors.New("cart is empty")
	}

	purchases := make([]dto.PurchaseItemResponse, 0, len(items))
	total := 0.0

	// Split items: reservations must be confirmed FIRST so a failure aborts
	// before any tour purchase is created.
	var reservationItems []model.CartItem
	var tourItems []model.CartItem
	for _, item := range items {
		if item.ItemType == "reservation" && item.ReservationID != nil {
			reservationItems = append(reservationItems, item)
		} else {
			tourItems = append(tourItems, item)
		}
	}

	// Step 1: confirm every reservation (pay). Any failure aborts checkout
	// and leaves the cart intact (minus stale items we clean up below).
	for _, item := range reservationItems {
		resID := item.ReservationID.String()
		if s.ReservationClient == nil {
			return nil, errors.New("reservation service is not configured")
		}
		// Pre-check status for a clear error message.
		if info, err := s.ReservationClient.GetReservation(resID, authHeader); err == nil {
			if info.Status != "pending" {
				_ = s.CartRepo.DeleteByID(userID, item.ID)
				return nil, fmt.Errorf("reservation %s is %s and was removed from cart", item.TourName, info.Status)
			}
			if info.ExpiresAt != nil && info.ExpiresAt.Before(time.Now()) {
				_ = s.CartRepo.DeleteByID(userID, item.ID)
				_ = s.ReservationClient.CancelReservation(resID, authHeader)
				return nil, fmt.Errorf("reservation %s expired and was removed from cart, please reserve again", item.TourName)
			}
		}
		if err := s.ReservationClient.ConfirmReservation(resID, authHeader); err != nil {
			// If it expired/cancelled meanwhile, drop it from the cart.
			msg := err.Error()
			if containsReservationGone(msg) {
				_ = s.CartRepo.DeleteByID(userID, item.ID)
			}
			return nil, fmt.Errorf("failed to confirm reservation %s: %s", item.TourName, msg)
		}
		purchases = append(purchases, dto.PurchaseItemResponse{
			ID:        item.ID.String(),
			TourName:  item.TourName,
			Price:     item.Price,
			CreatedAt: item.CreatedAt,
		})
		total += item.Price
	}

	// Step 2: handle tour items (existing logic)
	for _, item := range tourItems {
		if item.TourID == nil {
			continue
		}

		bought, err := s.PurchaseRepo.Exists(userID, *item.TourID)
		if err != nil {
			return nil, err
		}
		if bought {
			return nil, fmt.Errorf("tour %s has already been purchased", item.TourName)
		}

		token, err := generateToken()
		if err != nil {
			return nil, err
		}

		purchase := &model.Purchase{
			UserID:          userID,
			TourID:          *item.TourID,
			TourName:        item.TourName,
			TourDescription: item.TourDescription,
			Price:           item.Price,
			Token:           token,
		}

		published, err := s.verifyTourPublished(*item.TourID)
		if err != nil || !published {
			return nil, fmt.Errorf("tour %s is no longer available for purchase", item.TourName)
		}

		if err := s.PurchaseRepo.Create(purchase); err != nil {
			return nil, err
		}

		purchases = append(purchases, *mapPurchase(purchase))
		total += item.Price
	}

	if err := s.CartRepo.DeleteByUser(userID); err != nil {
		return nil, err
	}

	return &dto.CheckoutResponse{Purchases: purchases, Total: total}, nil
}

func containsReservationGone(msg string) bool {
	for _, sub := range []string{"expired", "cancelled", "not pending", "not found"} {
		if len(msg) >= len(sub) {
			for i := 0; i+len(sub) <= len(msg); i++ {
				// case-insensitive contains
				match := true
				for j := 0; j < len(sub); j++ {
					a := msg[i+j]
					b := sub[j]
					if a >= 'A' && a <= 'Z' {
						a += 'a' - 'A'
					}
					if a != b {
						match = false
						break
					}
				}
				if match {
					return true
				}
			}
		}
	}
	return false
}

// filterStaleReservationItems removes cart items whose reservation is no longer
// payable (cancelled/expired/confirmed/deleted). Fail-open: if the
// reservation-service is unreachable, items are kept.
func (s *PurchaseService) filterStaleReservationItems(userID uuid.UUID, items []model.CartItem, authHeader string) []model.CartItem {
	if s.ReservationClient == nil || authHeader == "" {
		return items
	}
	kept := items[:0]
	for _, item := range items {
		if item.ItemType != "reservation" || item.ReservationID == nil {
			kept = append(kept, item)
			continue
		}
		info, err := s.ReservationClient.GetReservation(item.ReservationID.String(), authHeader)
		if err != nil {
			if isNotFoundErr(err) {
				log.Printf("[PURCHASE] removing stale cart item %s: reservation gone", item.ID)
				_ = s.CartRepo.DeleteByID(userID, item.ID)
				continue
			}
			// Unknown error (network etc.) — keep the item.
			kept = append(kept, item)
			continue
		}
		if info.Status != "pending" {
			log.Printf("[PURCHASE] removing stale cart item %s: reservation %s", item.ID, info.Status)
			_ = s.CartRepo.DeleteByID(userID, item.ID)
			continue
		}
		if info.ExpiresAt != nil && info.ExpiresAt.Before(time.Now()) {
			log.Printf("[PURCHASE] removing expired cart item %s", item.ID)
			_ = s.CartRepo.DeleteByID(userID, item.ID)
			_ = s.ReservationClient.CancelReservation(item.ReservationID.String(), authHeader)
			continue
		}
		kept = append(kept, item)
	}
	return kept
}

func isNotFoundErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return len(msg) >= 9 && (containsFold(msg, "not found") || containsFold(msg, "404"))
}

func containsFold(s, sub string) bool {
	if len(sub) == 0 {
		return true
	}
	for i := 0; i+len(sub) <= len(s); i++ {
		ok := true
		for j := 0; j < len(sub); j++ {
			a := s[i+j]
			b := sub[j]
			if a >= 'A' && a <= 'Z' {
				a += 'a' - 'A'
			}
			if b >= 'A' && b <= 'Z' {
				b += 'a' - 'A'
			}
			if a != b {
				ok = false
				break
			}
		}
		if ok {
			return true
		}
	}
	return false
}

func (s *PurchaseService) GetPurchases(userID uuid.UUID) ([]dto.PurchaseItemResponse, error) {
	purchases, err := s.PurchaseRepo.FindByUser(userID)
	if err != nil {
		return nil, err
	}

	response := make([]dto.PurchaseItemResponse, 0, len(purchases))
	for _, purchase := range purchases {
		if purchase.TourDescription == "" {
			desc, err := s.getTourDescription(purchase.TourID)
			if err == nil && desc != "" {
				purchase.TourDescription = desc
				_ = s.PurchaseRepo.Update(&purchase)
			}
		}
		response = append(response, *mapPurchase(&purchase))
	}

	return response, nil
}

func (s *PurchaseService) HasPurchased(userID, tourID uuid.UUID) (bool, error) {
	return s.PurchaseRepo.Exists(userID, tourID)
}

func (s *PurchaseService) getTourDescription(tourID uuid.UUID) (string, error) {
	resp, err := s.TourClient.GetTourPublicInfo(tourID.String())
	if err != nil {
		return "", err
	}
	return resp.Description, nil
}

func (s *PurchaseService) verifyTourPublished(tourID uuid.UUID) (bool, error) {
	return s.TourClient.IsTourPublished(tourID.String())
}

func generateToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func mapCartItem(item *model.CartItem) *dto.CartItemResponse {
	resp := &dto.CartItemResponse{
		ID:              item.ID.String(),
		TourName:        item.TourName,
		TourDescription: item.TourDescription,
		Price:           item.Price,
		CreatedAt:       item.CreatedAt,
		ItemType:        item.ItemType,
		SeatNumber:      item.SeatNumber,
	}
	if item.TourID != nil {
		tourID := item.TourID.String()
		resp.TourID = tourID
	}
	if item.ReservationID != nil {
		resID := item.ReservationID.String()
		resp.ReservationID = resID
	}
	return resp
}

func mapPurchase(purchase *model.Purchase) *dto.PurchaseItemResponse {
	return &dto.PurchaseItemResponse{
		ID:              purchase.ID.String(),
		TourID:          purchase.TourID.String(),
		TourName:        purchase.TourName,
		TourDescription: purchase.TourDescription,
		Price:           purchase.Price,
		Token:           purchase.Token,
		CreatedAt:       purchase.CreatedAt,
	}
}

package service

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// ReservationClient talks to reservation-service over HTTP.
// It forwards the end-user's JWT so owner checks keep working.
type ReservationClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

func NewReservationClient(baseURL string) *ReservationClient {
	if baseURL == "" {
		baseURL = "http://reservation-app:8085"
	}
	baseURL = strings.TrimSuffix(baseURL, "/")
	return &ReservationClient{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type reservationInfo struct {
	ID        string     `json:"id"`
	Status    string     `json:"status"`
	ExpiresAt *time.Time `json:"expires_at"`
}

func (c *ReservationClient) do(method, path, authHeader string) (int, []byte, error) {
	if c == nil {
		return 0, nil, fmt.Errorf("reservation client not configured")
	}
	req, err := http.NewRequest(method, c.BaseURL+path, nil)
	if err != nil {
		return 0, nil, err
	}
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, body, nil
}

func (c *ReservationClient) GetReservation(reservationID, authHeader string) (*reservationInfo, error) {
	status, body, err := c.do(http.MethodGet, "/reservations/"+reservationID, authHeader)
	if err != nil {
		return nil, err
	}
	if status == http.StatusNotFound {
		return nil, fmt.Errorf("reservation not found")
	}
	if status < 200 || status >= 300 {
		return nil, fmt.Errorf("reservation lookup failed: %s", strings.TrimSpace(string(body)))
	}
	var info reservationInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

func (c *ReservationClient) ConfirmReservation(reservationID, authHeader string) error {
	status, body, err := c.do(http.MethodPut, "/reservations/"+reservationID+"/confirm", authHeader)
	if err != nil {
		return err
	}
	if status >= 200 && status < 300 {
		return nil
	}
	msg := strings.TrimSpace(string(body))
	if msg == "" {
		msg = fmt.Sprintf("confirm failed with status %d", status)
	}
	return fmt.Errorf("%s", msg)
}

func (c *ReservationClient) CancelReservation(reservationID, authHeader string) error {
	status, body, err := c.do(http.MethodDelete, "/reservations/"+reservationID, authHeader)
	if err != nil {
		return err
	}
	if status >= 200 && status < 300 {
		return nil
	}
	msg := strings.TrimSpace(string(body))
	if msg == "" {
		msg = fmt.Sprintf("cancel failed with status %d", status)
	}
	// Already cancelled/gone counts as success for cart-removal purposes.
	if status == http.StatusNotFound || strings.Contains(strings.ToLower(msg), "cannot cancel") {
		log.Printf("[PURCHASE] reservation %s already settled on cancel: %s", reservationID, msg)
		return nil
	}
	return fmt.Errorf("%s", msg)
}

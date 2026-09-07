package grpcclient

import (
	"context"
	"log"
	"time"

	pb "proto/purchase"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// PurchaseClient checks tour purchases via the purchase-service gRPC API
// (plaintext, like the tour-service's own client).
type PurchaseClient struct {
	client pb.PurchaseServiceClient
}

func NewPurchaseClient(address string) *PurchaseClient {
	if address == "" {
		address = "purchase-app:50051"
	}

	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Println("WARNING: Failed to connect to purchase-service gRPC:", err)
		return nil
	}

	return &PurchaseClient{client: pb.NewPurchaseServiceClient(conn)}
}

func (c *PurchaseClient) HasPurchased(userID, tourID string) (bool, error) {
	if c == nil {
		return true, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := c.client.HasPurchased(ctx, &pb.HasPurchasedRequest{UserId: userID, TourId: tourID})
	if err != nil {
		return false, err
	}
	return resp.Purchased, nil
}

package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"saga"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	nats "saga/nats"

	grpcclient "example.com/purchase-service/grpc"
	"example.com/purchase-service/handler"
	"example.com/purchase-service/middleware"
	"example.com/purchase-service/model"
	"example.com/purchase-service/repo"
	"example.com/purchase-service/service"
)

func initDatabase() *gorm.DB {
	godotenv.Load()

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbSSLMode := os.Getenv("DB_SSLMODE")

	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbPort == "" {
		dbPort = "5432"
	}
	if dbUser == "" {
		dbUser = "postgres"
	}
	if dbPassword == "" {
		dbPassword = "postgres"
	}
	if dbName == "" {
		dbName = "purchase"
	}
	if dbSSLMode == "" {
		dbSSLMode = "disable"
	}

	connectionURL := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost,
		dbPort,
		dbUser,
		dbPassword,
		dbName,
		dbSSLMode,
	)

	database, err := gorm.Open(postgres.Open(connectionURL), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
		return nil
	}

	database.AutoMigrate(&model.CartItem{}, &model.Purchase{})
	return database
}

func initPublisher(subject string) saga.Publisher {
	publisher, err := nats.NewNATSPublisher(os.Getenv("NATS_HOST"), os.Getenv("NATS_PORT"), os.Getenv("NATS_USER"), os.Getenv("NATS_PASSWORD"), subject)
	if err != nil {
		log.Fatal(err)
	}
	return publisher
}

func initSubscriber(subject, queueGroup string) saga.Subscriber {
	subscriber, err := nats.NewNATSSubscriber(os.Getenv("NATS_HOST"), os.Getenv("NATS_PORT"), os.Getenv("NATS_USER"), os.Getenv("NATS_PASSWORD"), subject, queueGroup)
	if err != nil {
		log.Fatal(err)
	}
	return subscriber
}

func initBlockUserHandler(purchaseService *service.PurchaseService, publisher saga.Publisher, subscriber saga.Subscriber) {
	_, err := handler.NewBlockUserCommandHandler(purchaseService, publisher, subscriber)
	if err != nil {
		log.Fatal(err)
	}
}

func initArchiveTourHandler(purchaseService *service.PurchaseService, publisher saga.Publisher, subscriber saga.Subscriber) {
	_, err := handler.NewArchiveTourCommandHandler(purchaseService, publisher, subscriber)
	if err != nil {
		log.Fatal(err)
	}
}

func main() {
	database := initDatabase()
	if database == nil {
		log.Fatal("Failed to connect to database")
	}

	cartRepo := &repo.CartRepository{DB: database}
	purchaseRepo := &repo.PurchaseRepository{DB: database}
	tourClient := grpcclient.NewTourClient(os.Getenv("TOUR_SERVICE_GRPC_ADDR"))
	reservationURL := os.Getenv("RESERVATION_SERVICE_URL")
	if reservationURL == "" {
		reservationURL = "http://reservation-app:8085"
	}
	purchaseService := &service.PurchaseService{
		CartRepo:          cartRepo,
		PurchaseRepo:      purchaseRepo,
		TourClient:        tourClient,
		ReservationClient: service.NewReservationClient(reservationURL),
	}
	purchaseHandler := &handler.PurchaseHandler{Service: purchaseService}

	commandSubscriber := initSubscriber("block_user.command", "purchases")
	replyPublisher := initPublisher("block_user.reply")
	initBlockUserHandler(purchaseService, replyPublisher, commandSubscriber)

	commandSubscriber = initSubscriber("archive_tour.command", "purchases")
	replyPublisher = initPublisher("archive_tour.reply")
	initArchiveTourHandler(purchaseService, replyPublisher, commandSubscriber)

	go grpcclient.StartGRPCServer(purchaseRepo)

	router := mux.NewRouter().StrictSlash(true)
	router.Use(middleware.AuthMiddleware)

	router.HandleFunc("/cart", purchaseHandler.GetCart).Methods("GET")
	router.HandleFunc("/cart", purchaseHandler.AddCartItem).Methods("POST")
	router.HandleFunc("/cart/reservation", purchaseHandler.AddReservationToCart).Methods("POST")
	router.HandleFunc("/cart/{id}", purchaseHandler.RemoveCartItem).Methods("DELETE")
	router.HandleFunc("/checkout", purchaseHandler.Checkout).Methods("POST")
	router.HandleFunc("/purchases", purchaseHandler.GetPurchases).Methods("GET")
	router.HandleFunc("/status/{tourId}", purchaseHandler.GetPurchaseStatus).Methods("GET")

	log.Println("Purchase service listening on :8083")
	log.Fatal(http.ListenAndServe(":8083", router))
}

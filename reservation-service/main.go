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

	"example.com/reservation-service/handler"
	"example.com/reservation-service/middleware"
	"example.com/reservation-service/model"
	"example.com/reservation-service/repo"
	"example.com/reservation-service/service"
	grpcclient "example.com/reservation-service/grpc"
)

func initDatabase() *gorm.DB {
	godotenv.Load()

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "reservation")
	dbSSLMode := getEnv("DB_SSLMODE", "disable")

	connectionURL := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode,
	)

	database, err := gorm.Open(postgres.Open(connectionURL), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
		return nil
	}

	database.AutoMigrate(&model.Event{}, &model.TourSession{}, &model.Activity{}, &model.Reservation{})

	// Drop old FULL unique constraints/indexes (they blocked re-booking after cancel,
	// because a cancelled row still violated the unique index).
	// Old deployments created them either as CONSTRAINTs or as INDEXes, so drop both forms.
	database.Exec("ALTER TABLE reservations DROP CONSTRAINT IF EXISTS idx_event_seat")
	database.Exec("ALTER TABLE reservations DROP CONSTRAINT IF EXISTS idx_event_tourist")
	database.Exec("ALTER TABLE reservations DROP CONSTRAINT IF EXISTS ux_reservation_event_tourist_active")
	database.Exec("ALTER TABLE reservations DROP CONSTRAINT IF EXISTS ux_reservation_event_seat_active")
	database.Exec("DROP INDEX IF EXISTS idx_event_seat")
	database.Exec("DROP INDEX IF EXISTS idx_event_tourist")
	// One active reservation per tourist is NO LONGER enforced at DB level:
	// activities allow multiple seats per tourist (one reservation per seat).
	// Seat uniqueness is the final race-condition guard.
	database.Exec("DROP INDEX IF EXISTS ux_reservation_event_tourist_active")
	// Recreate plain (non-unique) lookup indexes dropped above — AutoMigrate may
	// have skipped them if uniquely-indexed versions already existed.
	database.Exec("CREATE INDEX IF NOT EXISTS idx_event_seat ON reservations(event_id, seat_number)")
	database.Exec("CREATE INDEX IF NOT EXISTS idx_event_tourist ON reservations(event_id, tourist_id)")
	// Partial UNIQUE index: one active holder per seat. Concurrent transactions
	// for the same seat serialize on the event lock; this index catches any
	// leftover race with a 23505 mapped to "seat is already taken".
	database.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS ux_reservation_event_seat_active
		ON reservations(event_id, seat_number) WHERE status IN ('pending','confirmed') AND seat_number IS NOT NULL`)

	return database
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func initPublisher(subject string) saga.Publisher {
	publisher, err := nats.NewNATSPublisher(os.Getenv("NATS_HOST"), os.Getenv("NATS_PORT"), os.Getenv("NATS_USER"), os.Getenv("NATS_PASSWORD"), subject)
	if err != nil {
		log.Println("WARNING: Failed to create NATS publisher:", err)
		return nil
	}
	return publisher
}

func initSubscriber(subject, queueGroup string) saga.Subscriber {
	subscriber, err := nats.NewNATSSubscriber(os.Getenv("NATS_HOST"), os.Getenv("NATS_PORT"), os.Getenv("NATS_USER"), os.Getenv("NATS_PASSWORD"), subject, queueGroup)
	if err != nil {
		log.Println("WARNING: Failed to create NATS subscriber:", err)
		return nil
	}
	return subscriber
}

func main() {
	database := initDatabase()
	if database == nil {
		log.Fatal("Failed to connect to database")
	}

	eventRepo := &repo.EventRepository{DB: database}
	reservationRepo := &repo.ReservationRepository{DB: database}
	tourSessionRepo := &repo.TourSessionRepository{DB: database}
	activityRepo := &repo.ActivityRepository{DB: database}

	tourClient := grpcclient.NewTourClient(getEnv("TOUR_SERVICE_GRPC_ADDR", ""))

	reservationService := &service.ReservationService{
		EventRepo:       eventRepo,
		ReservationRepo: reservationRepo,
		TourSessionRepo: tourSessionRepo,
		ActivityRepo:    activityRepo,
		TourClient:      tourClient,
		DB:              database,
	}

	// Start background cleaner for expired reservations
	reservationService.StartExpiryCleaner()

	reservationHandler := &handler.ReservationHandler{Service: reservationService}

	// NATS saga — reservation command handler (receives payment confirmations)
	cmdSubscriber := initSubscriber("reservation.command", "reservations")
	replyPublisher := initPublisher("reservation.reply")
	if cmdSubscriber != nil && replyPublisher != nil {
		_, err := handler.NewReserveSeatCommandHandler(reservationService, replyPublisher, cmdSubscriber)
		if err != nil {
			log.Println("WARNING: Failed to init reservation saga handler:", err)
		}
	}

	router := mux.NewRouter().StrictSlash(true)
	router.Use(middleware.AuthMiddleware)

	router.HandleFunc("/events", reservationHandler.CreateEvent).Methods("POST")
	router.HandleFunc("/events", reservationHandler.GetEvents).Methods("GET")
	router.HandleFunc("/events/{id}", reservationHandler.GetEvent).Methods("GET")
	router.HandleFunc("/events/{id}/reserve", reservationHandler.ReserveSeat).Methods("POST")
	router.HandleFunc("/events/{id}/seats", reservationHandler.GetSeats).Methods("GET")
	router.HandleFunc("/reservations/my", reservationHandler.GetMyReservations).Methods("GET")
	router.HandleFunc("/reservations/{id}", reservationHandler.GetReservation).Methods("GET")
	router.HandleFunc("/reservations/{id}", reservationHandler.CancelReservation).Methods("DELETE")
	router.HandleFunc("/reservations/{id}/confirm", reservationHandler.ConfirmReservation).Methods("PUT")

	port := getEnv("PORT", "8085")
	log.Printf("Reservation service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

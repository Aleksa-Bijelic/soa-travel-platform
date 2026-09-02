package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"example.com/reservation-service/handler"
	"example.com/reservation-service/middleware"
	"example.com/reservation-service/model"
	"example.com/reservation-service/repo"
	"example.com/reservation-service/service"
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
	return database
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
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

	reservationService := &service.ReservationService{
		EventRepo:       eventRepo,
		ReservationRepo: reservationRepo,
		TourSessionRepo: tourSessionRepo,
		ActivityRepo:    activityRepo,
		DB:              database,
	}

	reservationHandler := &handler.ReservationHandler{Service: reservationService}

	router := mux.NewRouter().StrictSlash(true)
	router.Use(middleware.AuthMiddleware)

	router.HandleFunc("/events", reservationHandler.CreateEvent).Methods("POST")
	router.HandleFunc("/events", reservationHandler.GetEvents).Methods("GET")
	router.HandleFunc("/events/{id}", reservationHandler.GetEvent).Methods("GET")
	router.HandleFunc("/events/{id}/reserve", reservationHandler.ReserveSeat).Methods("POST")
	router.HandleFunc("/events/{id}/seats", reservationHandler.GetSeats).Methods("GET")
	router.HandleFunc("/reservations/my", reservationHandler.GetMyReservations).Methods("GET")
	router.HandleFunc("/reservations/{id}", reservationHandler.CancelReservation).Methods("DELETE")
	router.HandleFunc("/reservations/{id}/confirm", reservationHandler.ConfirmReservation).Methods("PUT")

	port := getEnv("PORT", "8085")
	log.Printf("Reservation service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

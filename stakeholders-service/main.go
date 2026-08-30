package main

import (
	"fmt"
	"os"

	"log"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/joho/godotenv"

	"net/http"

	"saga"

	nats "saga/nats"

	"github.com/gorilla/mux"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	grpcclient "stakeholders-service.xws.com/grpc"
	"stakeholders-service.xws.com/handler"
	"stakeholders-service.xws.com/middleware"
	"stakeholders-service.xws.com/model"
	"stakeholders-service.xws.com/orchestrator"
	"stakeholders-service.xws.com/repo"
	"stakeholders-service.xws.com/service"
)

func initDatabase() *gorm.DB {
	godotenv.Load()

	log.Printf("DB_HOST=%s, DB_USER=%s, DB_NAME=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_NAME"))

	connection_url := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSLMODE"),
	)

	database, err := gorm.Open(postgres.Open(connection_url), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
		return nil
	}

	database.AutoMigrate(&model.User{}, &model.Profile{}, &model.ProfileSnapshot{})
	return database
}

func initCloudinary() *cloudinary.Cloudinary {
	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	if cloudName == "" || cloudName == "your_cloud_name" {
		log.Println("WARNING: Cloudinary not configured, image upload will be unavailable")
		return nil
	}
	cld, err := cloudinary.NewFromParams(
		cloudName,
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if err != nil {
		log.Println("WARNING: Cloudinary init error:", err)
		return nil
	}
	return cld
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

func initOrchestrator(publisher saga.Publisher, subscriber saga.Subscriber) *orchestrator.BlockUserOrchestrator {
	o, err := orchestrator.NewBlockUserOrchestrator(publisher, subscriber)
	if err != nil {
		log.Fatal(err)
	}
	return o
}

func initBlockUserHandler(userService *service.UserService, profileService *service.ProfileService, publisher saga.Publisher, subscriber saga.Subscriber) {
	_, err := handler.NewBlockUserCommandHandler(userService, profileService, publisher, subscriber)
	if err != nil {
		log.Fatal(err)
	}
}

func startServer(userHandler *handler.UserHandler, profileHandler *handler.ProfileHandler) {
	router := mux.NewRouter().StrictSlash(true)

	router.HandleFunc("/register", userHandler.Register).Methods("POST")
	router.HandleFunc("/login", userHandler.Login).Methods("POST")

	router.Handle("/admin/users", middleware.AuthMiddleware(middleware.AdminOnly(http.HandlerFunc(userHandler.GetAllUsers)))).Methods("GET")
	router.Handle("/admin/users/{id}/block", middleware.AuthMiddleware(middleware.AdminOnly(http.HandlerFunc(userHandler.BlockUser)))).Methods("PUT")

	router.HandleFunc("/profile/{username}", profileHandler.GetProfile).Methods("GET")
	router.HandleFunc("/profiles", profileHandler.GetProfiles).Methods("GET")

	protected := router.PathPrefix("/profile").Subrouter()
	protected.Use(middleware.AuthMiddleware)
	protected.HandleFunc("", profileHandler.UpdateProfile).Methods("PUT")

	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./static")))
	println("Server starting...")
	log.Fatal(http.ListenAndServe(":8080", router))
}

func main() {
	database := initDatabase()
	if database == nil {
		log.Fatal("Failed to connect to database")
	}

	cld := initCloudinary()

	followClient := grpcclient.NewFollowClient(os.Getenv("FOLLOWERS_GRPC_ADDR"))

	userRepo := &repo.UserRepository{DB: database}
	profileRepo := &repo.ProfileRepository{DB: database}
	snapshotRepo := &repo.SagaSnapshotRepository{DB: database}

	commandPublisher := initPublisher("block_user.command")
	replySubscriber := initSubscriber("block_user.reply", "stakeholders")
	orch := initOrchestrator(commandPublisher, replySubscriber)

	userService := &service.UserService{Repo: userRepo, Orchestrator: orch}
	profileService := &service.ProfileService{Repo: profileRepo, FollowClient: followClient, SnapshotRepo: snapshotRepo}

	userHandler := &handler.UserHandler{Service: userService}
	profileHandler := &handler.ProfileHandler{Service: profileService, Cloudinary: cld}

	commandSubscriber := initSubscriber("block_user.command", "stakeholders")
	replyPublisher := initPublisher("block_user.reply")
	initBlockUserHandler(userService, profileService, replyPublisher, commandSubscriber)

	go grpcclient.StartGRPCServer(userRepo)

	startServer(userHandler, profileHandler)
}

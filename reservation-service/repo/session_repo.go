package repo

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"example.com/reservation-service/model"
)

type TourSessionRepository struct {
	DB *gorm.DB
}

func (r *TourSessionRepository) Create(session *model.TourSession) error {
	return r.DB.Create(session).Error
}

func (r *TourSessionRepository) FindByEventID(eventID uuid.UUID) (*model.TourSession, error) {
	var session model.TourSession
	err := r.DB.Where("event_id = ?", eventID).First(&session).Error
	return &session, err
}

func (r *TourSessionRepository) FindByTourID(tourID string) ([]model.TourSession, error) {
	var sessions []model.TourSession
	err := r.DB.Where("tour_id = ?", tourID).Find(&sessions).Error
	return sessions, err
}

type ActivityRepository struct {
	DB *gorm.DB
}

func (r *ActivityRepository) Create(activity *model.Activity) error {
	return r.DB.Create(activity).Error
}

func (r *ActivityRepository) FindByEventID(eventID uuid.UUID) (*model.Activity, error) {
	var activity model.Activity
	err := r.DB.Where("event_id = ?", eventID).First(&activity).Error
	return &activity, err
}

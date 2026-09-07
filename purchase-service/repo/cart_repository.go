package repo

import (
	"example.com/purchase-service/model"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CartRepository struct {
	DB *gorm.DB
}

func (repo *CartRepository) FindByUser(userID uuid.UUID) ([]model.CartItem, error) {
	var items []model.CartItem
	err := repo.DB.Where("user_id = ?", userID).Find(&items).Error
	return items, err
}

func (repo *CartRepository) FindByUserAndTour(userID, tourID uuid.UUID) (*model.CartItem, error) {
	var item model.CartItem
	err := repo.DB.Where("user_id = ? AND tour_id = ?", userID, tourID).First(&item).Error
	return &item, err
}

func (repo *CartRepository) Create(item *model.CartItem) error {
	return repo.DB.Create(item).Error
}

func (repo *CartRepository) Update(item *model.CartItem) error {
	return repo.DB.Model(item).Updates(map[string]interface{}{
		"tour_description": item.TourDescription,
	}).Error
}

func (repo *CartRepository) FindByID(userID, id uuid.UUID) (*model.CartItem, error) {
	var item model.CartItem
	err := repo.DB.Where("user_id = ? AND id = ?", userID, id).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (repo *CartRepository) DeleteByID(userID, id uuid.UUID) error {
	return repo.DB.Where("user_id = ? AND id = ?", userID, id).Delete(&model.CartItem{}).Error
}

func (repo *CartRepository) DeleteByTourID(id uuid.UUID) error {
	return repo.DB.Transaction(func(tx *gorm.DB) error {
        result := tx.Where("tour_id = ?", id).Delete(&model.CartItem{})
        return result.Error
	})
}

func (repo *CartRepository) DeleteByUser(userID uuid.UUID) error {
	return repo.DB.Where("user_id = ?", userID).Delete(&model.CartItem{}).Error
}

package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"stakeholders-service.xws.com/dto"
	"stakeholders-service.xws.com/middleware"
	"stakeholders-service.xws.com/service"
)

type ProfileHandler struct {
	Service   *service.ProfileService
	Cloudinary *cloudinary.Cloudinary
}

func (handler *ProfileHandler) GetProfile(writer http.ResponseWriter, request *http.Request) {
	vars := mux.Vars(request)
	username := vars["username"]

	profile, err := handler.Service.GetProfile(username, uuid.Nil)
	if err != nil {
		http.Error(writer, err.Error(), http.StatusNotFound)
		return
	}

	writer.Header().Set("Content-Type", "application/json")
	json.NewEncoder(writer).Encode(profile)
}

func (handler *ProfileHandler) GetProfiles(writer http.ResponseWriter, request *http.Request) {
	ids := request.URL.Query().Get("ids")
	if ids == "" {
		http.Error(writer, "Missing ids", http.StatusBadRequest)
		return
	}

	parts := strings.Split(ids, ",")

	var userIDs []uuid.UUID
	for _, p := range parts {
		id, err := uuid.Parse(p)
		if err != nil {
			http.Error(writer, "Invalid uuid in list", http.StatusBadRequest)
			return
		}
		userIDs = append(userIDs, id)
	}

	profiles, err := handler.Service.GetProfiles(userIDs)
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}

	writer.Header().Set("Content-Type", "application/json")
	json.NewEncoder(writer).Encode(profiles)
}

func (handler *ProfileHandler) UpdateProfile(writer http.ResponseWriter, request *http.Request) {
	userIDVal := request.Context().Value(middleware.UserIDKey)
	userIDStr, ok := userIDVal.(string)
	if !ok {
		http.Error(writer, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(writer, "Invalid user ID", http.StatusBadRequest)
		return
	}

	if err := request.ParseMultipartForm(10 << 20); err != nil {
		http.Error(writer, "Invalid form data", http.StatusBadRequest)
		return
	}

	currentLatitudeStr := request.FormValue("current_latitude")
	currentLongitudeStr := request.FormValue("current_longitude")

	var currentLatitude *float64
	var currentLongitude *float64

	if currentLatitudeStr != "" {
		if lat, err := strconv.ParseFloat(currentLatitudeStr, 64); err == nil {
			currentLatitude = &lat
		}
	}

	if currentLongitudeStr != "" {
		if lng, err := strconv.ParseFloat(currentLongitudeStr, 64); err == nil {
			currentLongitude = &lng
		}
	}

	req := dto.ProfileUpdate{
		Name:             request.FormValue("name"),
		LastName:         request.FormValue("last_name"),
		Motto:            request.FormValue("motto"),
		Biography:        request.FormValue("biography"),
		CurrentLatitude:  currentLatitude,
		CurrentLongitude: currentLongitude,
	}

	file, header, err := request.FormFile("avatar")
	if err == nil {
		defer file.Close()

		if handler.Cloudinary == nil {
			http.Error(writer, "Image upload service is not configured", http.StatusServiceUnavailable)
			return
		}

		buf := &bytes.Buffer{}
		if _, err := io.Copy(buf, file); err != nil {
			http.Error(writer, "Could not read avatar", http.StatusInternalServerError)
			return
		}

		_ = header

		result, err := handler.Cloudinary.Upload.Upload(
			context.Background(),
			buf,
			uploader.UploadParams{
				Folder:    "stakeholders",
				PublicID:  fmt.Sprintf("avatar-%s", userID.String()),
				Overwrite: boolPtr(true),
			},
		)
		if err != nil {
			http.Error(writer, "Could not upload avatar: "+err.Error(), http.StatusInternalServerError)
			return
		}

		req.Avatar = result.SecureURL
	}

	if err := handler.Service.UpdateProfile(userID, req); err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}

	updatedProfile, err := handler.Service.GetProfile("", userID)
	if err != nil {
		http.Error(writer, err.Error(), http.StatusInternalServerError)
		return
	}
	writer.Header().Set("Content-Type", "application/json")
	json.NewEncoder(writer).Encode(updatedProfile)
}

func boolPtr(b bool) *bool { return &b }

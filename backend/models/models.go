package models

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Video struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Filename    string    `json:"filename"`
	Size        int64     `json:"size"`
	SizeHuman   string    `json:"sizeHuman"`
	Duration    string    `json:"duration"`
	Extension   string    `json:"extension"`
	Thumbnail   string    `json:"thumbnail"`
	CreatedAt   time.Time `json:"createdAt"`
	StreamURL   string    `json:"streamUrl"`
	SeriesTitle string    `json:"seriesTitle"`
	Season      int       `json:"season"`
	Episode     int       `json:"episode"`
	GroupType   string    `json:"groupType"` // "movie" or "series" based on ContentType
	ContentType string    `json:"contentType"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type EditVideoRequest struct {
	Title       string `json:"title"`
	ContentType string `json:"contentType"`
	SeriesTitle string `json:"seriesTitle"`
	Season      int    `json:"season"`
	Episode     int    `json:"episode"`
}

type LoginResponse struct {
	Token    string `json:"token"`
	Username string `json:"username"`
	Message  string `json:"message"`
}

type ProgressRequest struct {
	Position  int64 `json:"position"`
	Duration  int64 `json:"duration"`
	Completed bool  `json:"completed"`
}

type ProgressResponse struct {
	Filename  string    `json:"filename"`
	Position  int64     `json:"position"`
	Duration  int64     `json:"duration"`
	Completed bool      `json:"completed"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

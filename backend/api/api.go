package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"streamflix/config"
	"streamflix/db"
	"streamflix/models"
	"streamflix/utils"
)

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func getUsernameFromRequest(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			return "", fmt.Errorf("missing token")
		}
		authHeader = "Bearer " + tokenStr
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	claims := &models.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(config.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	return claims.Username, nil
}

func requireAdmin(r *http.Request) error {
	username, err := getUsernameFromRequest(r)
	if err != nil {
		return err
	}
	if strings.ToLower(username) != "admin" {
		return fmt.Errorf("admin access required")
	}
	return nil
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			tokenStr := r.URL.Query().Get("token")
			if tokenStr == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			authHeader = "Bearer " + tokenStr
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &models.Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(config.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}

	expectedPass, ok := config.ValidCredentials[req.Username]
	if !ok || expectedPass != req.Password {
		jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	claims := &models.Claims{
		Username: req.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(config.JWTSecret))
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "could not generate token"})
		return
	}

	jsonResponse(w, http.StatusOK, models.LoginResponse{Token: tokenStr, Username: req.Username, Message: "login successful"})
}

func videosHandler(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(config.VideoDir)
	if err != nil {
		jsonResponse(w, http.StatusOK, []models.Video{})
		return
	}

	titleMap := db.LoadVideoTitles()
	var videos []models.Video

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if !utils.IsVideoFile(ext) {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		id := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		id = strings.Map(func(r rune) rune {
			if r == ' ' || r == '.' || r == '-' || r == '_' {
				return '_'
			}
			return r
		}, id)

		title := strings.TrimSpace(titleMap[entry.Name()])
		if title == "" {
			title = utils.SanitizeTitle(entry.Name())
		}

		seriesTitle, season, episode, groupType := utils.ParseSeriesInfo(entry.Name())

		videos = append(videos, models.Video{
			ID:          id,
			Title:       title,
			Filename:    entry.Name(),
			Size:        info.Size(),
			SizeHuman:   utils.HumanSize(info.Size()),
			Extension:   ext,
			Thumbnail:   fmt.Sprintf("/api/thumbnail/%s", url.PathEscape(entry.Name())),
			StreamURL:   fmt.Sprintf("/api/stream/%s", url.PathEscape(entry.Name())),
			CreatedAt:   info.ModTime(),
			SeriesTitle: seriesTitle,
			Season:      season,
			Episode:     episode,
			GroupType:   groupType,
		})
	}

	sort.Slice(videos, func(i, j int) bool {
		return videos[i].CreatedAt.After(videos[j].CreatedAt)
	})

	if videos == nil {
		videos = []models.Video{}
	}

	jsonResponse(w, http.StatusOK, videos)
}

func uploadVideoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if err := requireAdmin(r); err != nil {
		if strings.Contains(err.Error(), "admin") {
			jsonResponse(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		} else {
			jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		}
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 5<<30)
	if err := r.ParseMultipartForm(64 << 20); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "invalid upload payload"})
		return
	}

	file, header, err := r.FormFile("video")
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "video file is required"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !utils.IsVideoFile(ext) {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "unsupported video format"})
		return
	}

	inputTitle := strings.TrimSpace(r.FormValue("title"))
	baseName := utils.SanitizeStorageName(inputTitle)
	if inputTitle == "" {
		baseName = utils.SanitizeStorageName(strings.TrimSuffix(header.Filename, ext))
	}

	fileName := baseName + ext
	destination := filepath.Join(config.VideoDir, fileName)
	for i := 1; ; i++ {
		if _, statErr := os.Stat(destination); os.IsNotExist(statErr) {
			break
		}
		fileName = fmt.Sprintf("%s_%d%s", baseName, i, ext)
		destination = filepath.Join(config.VideoDir, fileName)
	}

	out, err := os.Create(destination)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "could not save video"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "could not write video"})
		return
	}

	title := inputTitle
	if title == "" {
		title = utils.SanitizeTitle(fileName)
	}
	_ = db.UpsertVideoTitle(fileName, title)

	go func(name string) {
		if err := utils.GenerateThumbnailForVideo(name); err != nil {
			log.Printf("Auto thumbnail generation skipped for %s: %v", name, err)
		}
	}(fileName)

	jsonResponse(w, http.StatusCreated, map[string]string{"message": "Video uploaded successfully", "filename": fileName})
}

func manageVideoHandler(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(r); err != nil {
		if strings.Contains(err.Error(), "admin") {
			jsonResponse(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		} else {
			jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		}
		return
	}

	filename := utils.ExtractVideoFilenameFromPath(r)
	if filename == "" || filename == "." {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "invalid filename"})
		return
	}

	if r.Method == http.MethodDelete {
		videoPath := filepath.Join(config.VideoDir, filename)
		if _, err := os.Stat(videoPath); os.IsNotExist(err) {
			jsonResponse(w, http.StatusNotFound, map[string]string{"error": "video not found"})
			return
		}
		if err := os.Remove(videoPath); err != nil {
			jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete video"})
			return
		}

		base := strings.TrimSuffix(filename, filepath.Ext(filename))
		_ = os.Remove(filepath.Join(config.VideoDir, "thumbnails", base+".jpg"))
		_ = os.Remove(filepath.Join(config.VideoDir, "thumbnails", base+".png"))
		_ = os.Remove(filepath.Join(config.VideoDir, "thumbnails", base+"_auto_v2.jpg"))
		_ = db.DeleteVideoMeta(filename)

		jsonResponse(w, http.StatusOK, map[string]string{"message": "Video and thumbnail deleted"})
		return
	}

	if r.Method == http.MethodPut {
		var req models.EditVideoRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
			return
		}
		if strings.TrimSpace(req.Title) == "" {
			jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "title is required"})
			return
		}

		oldPath := filepath.Join(config.VideoDir, filename)
		if _, err := os.Stat(oldPath); os.IsNotExist(err) {
			jsonResponse(w, http.StatusNotFound, map[string]string{"error": "video not found"})
			return
		}

		ext := strings.ToLower(filepath.Ext(filename))
		newBase := utils.SanitizeStorageName(req.Title)
		newFilename := newBase + ext
		newPath := filepath.Join(config.VideoDir, newFilename)

		if newFilename != filename {
			for i := 1; ; i++ {
				if _, err := os.Stat(newPath); os.IsNotExist(err) {
					break
				}
				newFilename = fmt.Sprintf("%s_%d%s", newBase, i, ext)
				newPath = filepath.Join(config.VideoDir, newFilename)
			}
			if err := os.Rename(oldPath, newPath); err != nil {
				jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "failed to rename video"})
				return
			}
		}

		oldBase := strings.TrimSuffix(filename, ext)
		newTitleBase := strings.TrimSuffix(newFilename, ext)
		if oldBase != newTitleBase {
			oldJpg := filepath.Join(config.VideoDir, "thumbnails", oldBase+".jpg")
			newJpg := filepath.Join(config.VideoDir, "thumbnails", newTitleBase+".jpg")
			if _, err := os.Stat(oldJpg); err == nil {
				_ = os.Rename(oldJpg, newJpg)
			}

			oldPng := filepath.Join(config.VideoDir, "thumbnails", oldBase+".png")
			newPng := filepath.Join(config.VideoDir, "thumbnails", newTitleBase+".png")
			if _, err := os.Stat(oldPng); err == nil {
				_ = os.Rename(oldPng, newPng)
			}
		}

		_ = db.DeleteVideoMeta(filename)
		_ = db.UpsertVideoTitle(newFilename, strings.TrimSpace(req.Title))
		jsonResponse(w, http.StatusOK, map[string]string{"message": "Video updated", "filename": newFilename})
		return
	}

	jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

func uploadThumbnailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonResponse(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	if err := requireAdmin(r); err != nil {
		if strings.Contains(err.Error(), "admin") {
			jsonResponse(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		} else {
			jsonResponse(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		}
		return
	}

	filename := utils.ExtractThumbnailTargetFilenameFromPath(r)
	if filename == "" || filename == "." {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "invalid filename"})
		return
	}

	videoPath := filepath.Join(config.VideoDir, filename)
	if _, err := os.Stat(videoPath); os.IsNotExist(err) {
		jsonResponse(w, http.StatusNotFound, map[string]string{"error": "video not found"})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 20<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "invalid upload payload"})
		return
	}

	file, header, err := r.FormFile("thumbnail")
	if err != nil {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "thumbnail file is required"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !utils.IsAllowedThumbnailExt(ext) {
		jsonResponse(w, http.StatusBadRequest, map[string]string{"error": "thumbnail must be jpg or png"})
		return
	}
	if ext == ".jpeg" {
		ext = ".jpg"
	}

	thumbDir := filepath.Join(config.VideoDir, "thumbnails")
	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "failed to prepare thumbnail directory"})
		return
	}

	base := strings.TrimSuffix(filename, filepath.Ext(filename))
	if ext == ".jpg" {
		_ = os.Remove(filepath.Join(thumbDir, base+".png"))
	} else {
		_ = os.Remove(filepath.Join(thumbDir, base+".jpg"))
	}

	target := filepath.Join(thumbDir, base+ext)
	out, err := os.Create(target)
	if err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "failed to save thumbnail"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		jsonResponse(w, http.StatusInternalServerError, map[string]string{"error": "failed to write thumbnail"})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]string{"message": "Thumbnail updated"})
}

func streamHandler(w http.ResponseWriter, r *http.Request) {
	filename := utils.ExtractStreamFilenameFromPath(r)
	videoPath := filepath.Join(config.VideoDir, filename)
	file, err := os.Open(videoPath)
	if err != nil {
		http.Error(w, "video not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		http.Error(w, "could not stat file", http.StatusInternalServerError)
		return
	}

	fileSize := stat.Size()
	ext := strings.ToLower(filepath.Ext(filename))
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "video/mp4"
	}
	if ext == ".mkv" {
		contentType = "video/x-matroska"
	}
	if ext == ".ts" {
		contentType = "video/mp2t"
	}

	rangeHeader := r.Header.Get("Range")
	if rangeHeader == "" {
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Length", strconv.FormatInt(fileSize, 10))
		w.Header().Set("Accept-Ranges", "bytes")
		w.WriteHeader(http.StatusOK)
		_, _ = io.Copy(w, file)
		return
	}

	rangeStr := strings.TrimPrefix(rangeHeader, "bytes=")
	parts := strings.Split(rangeStr, "-")
	if len(parts) != 2 {
		http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
		return
	}

	var start, end int64
	if parts[0] == "" {
		suffix, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
			return
		}
		start = fileSize - suffix
		end = fileSize - 1
	} else {
		start, err = strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
			return
		}
		if parts[1] == "" {
			end = fileSize - 1
		} else {
			end, err = strconv.ParseInt(parts[1], 10, 64)
			if err != nil {
				http.Error(w, "invalid range", http.StatusRequestedRangeNotSatisfiable)
				return
			}
		}
	}

	if start > end || end >= fileSize {
		w.Header().Set("Content-Range", fmt.Sprintf("bytes */%d", fileSize))
		http.Error(w, "range not satisfiable", http.StatusRequestedRangeNotSatisfiable)
		return
	}

	chunkSize := end - start + 1
	_, _ = file.Seek(start, io.SeekStart)

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.FormatInt(chunkSize, 10))
	w.Header().Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", start, end, fileSize))
	w.Header().Set("Accept-Ranges", "bytes")
	w.WriteHeader(http.StatusPartialContent)
	_, _ = io.CopyN(w, file, chunkSize)
}

func thumbnailHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	filename := utils.ExtractThumbFilenameFromPath(r)
	base := strings.TrimSuffix(filename, filepath.Ext(filename))
	mode := strings.ToLower(r.URL.Query().Get("mode"))

	manualJpg := filepath.Join(config.VideoDir, "thumbnails", base+".jpg")
	manualPng := filepath.Join(config.VideoDir, "thumbnails", base+".png")
	autoJpg := filepath.Join(config.VideoDir, "thumbnails", base+"_auto_v2.jpg")

	if mode == "manual" {
		if _, err := os.Stat(manualJpg); err == nil {
			http.ServeFile(w, r, manualJpg)
			return
		}
		if _, err := os.Stat(manualPng); err == nil {
			http.ServeFile(w, r, manualPng)
			return
		}
	} else if mode == "auto" {
		if _, err := os.Stat(autoJpg); err == nil {
			http.ServeFile(w, r, autoJpg)
			return
		}
		if err := utils.GenerateThumbnailForVideo(filename); err == nil {
			if _, err := os.Stat(autoJpg); err == nil {
				http.ServeFile(w, r, autoJpg)
				return
			}
		}
	} else {
		if _, err := os.Stat(manualJpg); err == nil {
			http.ServeFile(w, r, manualJpg)
			return
		}
		if _, err := os.Stat(manualPng); err == nil {
			http.ServeFile(w, r, manualPng)
			return
		}
		if _, err := os.Stat(autoJpg); err == nil {
			http.ServeFile(w, r, autoJpg)
			return
		}
		if err := utils.GenerateThumbnailForVideo(filename); err == nil {
			if _, err := os.Stat(autoJpg); err == nil {
				http.ServeFile(w, r, autoJpg)
				return
			}
		}
	}

	w.Header().Set("Content-Type", "image/svg+xml")
	title := utils.SanitizeTitle(filename)
	svg := fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <defs>
    <linearGradient id="grad" x1="0%%" y1="0%%" x2="100%%" y2="100%%">
      <stop offset="0%%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="320" height="180" fill="url(#grad)"/>
  <circle cx="160" cy="85" r="28" fill="none" stroke="#e50914" stroke-width="3"/>
  <polygon points="150,72 150,98 178,85" fill="#e50914"/>
  <text x="160" y="145" font-family="Arial" font-size="12" fill="#cccccc" text-anchor="middle">%s</text>
</svg>`, title)

	_, _ = w.Write([]byte(svg))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]string{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// SetupRoutes registers all API endpoints and returns the router wrapped with middlewares
func SetupRoutes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", healthHandler)
	mux.HandleFunc("/api/login", loginHandler)
	mux.HandleFunc("/api/videos", authMiddleware(videosHandler))
	mux.HandleFunc("/api/videos/upload", authMiddleware(uploadVideoHandler))
	mux.HandleFunc("/api/videos/", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/thumbnail") {
			uploadThumbnailHandler(w, r)
			return
		}
		manageVideoHandler(w, r)
	}))
	mux.HandleFunc("/api/stream/", authMiddleware(streamHandler))
	mux.HandleFunc("/api/thumbnail/", authMiddleware(thumbnailHandler))

	frontendDir := "./frontend/dist"
	if _, err := os.Stat("../frontend/dist"); err == nil {
		frontendDir = "../frontend/dist"
	}
	if _, err := os.Stat(frontendDir); err == nil {
		mux.Handle("/", http.FileServer(http.Dir(frontendDir)))
		log.Printf("Serving frontend from %s", frontendDir)
	}

	return corsMiddleware(mux)
}

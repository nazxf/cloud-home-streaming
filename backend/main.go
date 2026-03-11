package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"streamflix/api"
	"streamflix/config"
	"streamflix/db"
	"streamflix/utils"
)

func main() {
	if err := os.MkdirAll(config.VideoDir, 0755); err != nil {
		log.Fatalf("Failed to create videos directory: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(config.VideoDir, "thumbnails"), 0755); err != nil {
		log.Printf("Warning: could not create thumbnails directory: %v", err)
	}

	if err := db.InitDB(); err != nil {
		log.Fatalf("Failed to initialize SQLite database: %v", err)
	}
	defer db.DB.Close()

	handler := api.SetupRoutes()
	localIP := utils.GetLocalIP()

	log.Printf("StreamFlix server started")
	log.Printf("Local:   http://localhost%s", config.Port)
	log.Printf("Network: http://%s%s", localIP, config.Port)
	log.Printf("Videos:  %s", config.VideoDir)
	log.Printf("SQLite:  %s", config.DBPath)
	log.Printf("Credentials: admin/admin123 and user/password")

	server := &http.Server{
		Addr:         config.Port,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

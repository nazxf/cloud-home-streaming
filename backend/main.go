package main

import (
	"fmt"
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

func printBanner(localIP string) {
	const red = "\033[31m"
	const white = "\033[97m"
	const dim = "\033[90m"
	const cyan = "\033[36m"
	const reset = "\033[0m"
	const bold = "\033[1m"

	fmt.Println()
	fmt.Println(red + "  ███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗" + reset)
	fmt.Println(red + "  ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║" + reset)
	fmt.Println(red + "  ███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║" + reset)
	fmt.Println(red + "  ╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║" + reset)
	fmt.Println(red + "  ███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║" + reset)
	fmt.Println(red + "  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝" + reset)
	fmt.Println(white + bold + "              ███████╗██╗     ██╗██╗  ██╗" + reset)
	fmt.Println(white + bold + "              ██╔════╝██║     ██║╚██╗██╔╝" + reset)
	fmt.Println(white + bold + "              █████╗  ██║     ██║ ╚███╔╝" + reset)
	fmt.Println(white + bold + "              ██╔══╝  ██║     ██║ ██╔██╗" + reset)
	fmt.Println(white + bold + "              ██║     ███████╗██║██╔╝ ██╗" + reset)
	fmt.Println(white + bold + "              ╚═╝     ╚══════╝╚═╝╚═╝  ╚═╝" + reset)
	fmt.Println()
	fmt.Println(dim + "         Private Streaming · Local Cinema" + reset)
	fmt.Println()
	fmt.Println(dim + "  ─────────────────────────────────────────────────" + reset)
	fmt.Printf(cyan+"  ▸ Local:   "+reset+white+"http://localhost%s\n"+reset, config.Port)
	fmt.Printf(cyan+"  ▸ Network: "+reset+white+"http://%s%s\n"+reset, localIP, config.Port)
	fmt.Printf(cyan+"  ▸ Videos:  "+reset+dim+"%s\n"+reset, config.VideoDir)
	fmt.Printf(cyan+"  ▸ DB:      "+reset+dim+"%s\n"+reset, config.DBPath)
	fmt.Println(dim + "  ─────────────────────────────────────────────────" + reset)
	fmt.Println()
}

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

	printBanner(localIP)

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

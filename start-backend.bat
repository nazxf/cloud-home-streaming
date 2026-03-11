@echo off
echo ============================================
echo  StreamFlix - Backend Server
echo ============================================

cd /d "%~dp0backend"

echo [1/2] Downloading Go dependencies...
go mod tidy
if errorlevel 1 (
    echo ERROR: Failed to download dependencies
    echo Make sure Go is installed: https://go.dev/dl/
    pause
    exit /b 1
)

echo [2/2] Starting backend server...
echo.
go run main.go

pause

@echo off
setlocal

echo ============================================
echo  StreamFlix - One-Time Project Setup
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
)

where go >nul 2>&1
if errorlevel 1 (
    echo ERROR: Go is not installed or not in PATH.
    echo Install from: https://go.dev/dl/
    pause
    exit /b 1
)

echo [1/6] Installing frontend dependencies...
cd /d "%~dp0frontend"
npm install
if errorlevel 1 (
    echo ERROR: Frontend dependency install failed.
    pause
    exit /b 1
)

echo [2/6] Building frontend (production assets)...
npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)

echo [3/6] Downloading backend dependencies...
cd /d "%~dp0backend"
go mod tidy
if errorlevel 1 (
    echo ERROR: Backend dependency resolution failed.
    pause
    exit /b 1
)

echo [4/6] Building backend binary...
go build -o streamflix.exe main.go
if errorlevel 1 (
    echo ERROR: Backend build failed.
    pause
    exit /b 1
)

echo [5/6] Ensuring runtime folders exist...
if not exist "%~dp0backend\videos" mkdir "%~dp0backend\videos"
if not exist "%~dp0backend\videos\thumbnails" mkdir "%~dp0backend\videos\thumbnails"


where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo WARNING: FFmpeg not found in PATH.
    echo Auto-generated thumbnails from video frames will not work until FFmpeg is installed.
    echo Download: https://ffmpeg.org/download.html
) else (
    echo FFmpeg detected: auto thumbnail generation is enabled.
)
echo [6/6] Setup complete.
echo.
echo ============================================
echo  SUCCESS
echo ============================================
echo Next:
echo   1. Start backend:  %~dp0start-backend.bat
echo   2. Start frontend: %~dp0start-frontend.bat
echo.
pause


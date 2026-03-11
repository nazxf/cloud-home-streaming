@echo off
setlocal enabledelayedexpansion

echo ============================================
echo  StreamFlix - Build and Run (Backend + Frontend)
echo ============================================

set ROOT=%~dp0

rem --- Build Frontend ---
echo.
echo [1/3] Building frontend...
cd /d "%ROOT%frontend"

if not exist node_modules (
    echo node_modules not found. Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

rem --- Build Backend ---
echo.
echo [2/3] Building backend...
cd /d "%ROOT%backend"

go build -o streamflix.exe .
if errorlevel 1 (
    echo ERROR: Backend build failed
    pause
    exit /b 1
)

rem --- Run Servers ---
echo.
echo [3/3] Starting backend and frontend...

echo Starting backend in new window...
start "StreamFlix Backend" cmd /k "cd /d %ROOT%backend && streamflix.exe"

echo Starting frontend dev server in new window...
start "StreamFlix Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"

echo.
echo Done. Two windows opened for backend and frontend.

endlocal

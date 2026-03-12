@echo off
title StreamFlix Runner
color 0b
cls

echo.
echo   ======================================================
echo   #                                                    #
echo   #              S T R E A M F L I X                   #
echo   #          Private Streaming . Local Cinema          #
echo   #                                                    #
echo   ======================================================
echo.
echo   [1]  Development Mode   (Frontend + Backend)
echo   [2]  Production Build   (Compile + Run)
echo   [3]  Frontend Only      (Vite Dev Server)
echo   [4]  Backend Only       (Go Server)
echo.
set /p choice="   Select option (1-4): "

if "%choice%"=="1" goto dev
if "%choice%"=="2" goto prod
if "%choice%"=="3" goto frontend
if "%choice%"=="4" goto backend

echo.
echo   Invalid choice. Exiting...
timeout /t 2 >nul
exit

:dev
echo.
echo   -- Starting Development Mode --
echo.
echo   Starting Backend API Server (Go)...
start "StreamFlix Backend" cmd /k "cd /d c:\app-\streaming-app\backend && go run main.go"

echo   Starting Frontend Dev Server (Vite)...
start "StreamFlix Frontend" cmd /k "cd /d c:\app-\streaming-app\frontend && npm install && npm run dev"

echo.
echo   Both servers are starting in separate windows.
echo   Backend:  http://localhost:8080
echo   Frontend: http://localhost:5173
echo.
pause
exit

:prod
echo.
echo   -- Production Build --
echo.
echo   [1/3] Installing frontend dependencies...
cd /d c:\app-\streaming-app\frontend
call npm install

echo.
echo   [2/3] Building frontend (Vite)...
call npm run build

echo.
echo   [3/3] Building backend (Go)...
cd /d c:\app-\streaming-app\backend
go build -o streamflix.exe main.go

echo.
echo   Starting production server...
start "StreamFlix Prod" cmd /k "cd /d c:\app-\streaming-app\backend && streamflix.exe"

echo.
echo   Production server running at http://localhost:8080
echo.
pause
exit

:frontend
echo.
echo   -- Frontend Only --
echo.
start "StreamFlix Frontend" cmd /k "cd /d c:\app-\streaming-app\frontend && npm install && npm run dev"
echo   Frontend dev server starting at http://localhost:5173
echo.
pause
exit

:backend
echo.
echo   -- Backend Only --
echo.
start "StreamFlix Backend" cmd /k "cd /d c:\app-\streaming-app\backend && go run main.go"
echo   Backend server starting at http://localhost:8080
echo.
pause
exit

@echo off
setlocal
title Tira Automation Launcher

echo ===================================
echo   Tira Order Automation Launcher
echo ===================================
echo.

set "BACKEND_DIR=c:\Users\Webrebate\work\new\tira-order-auto\backend"
set "FRONTEND_DIR=c:\Users\Webrebate\work\new\tira-order-auto\frontend"

:: Check for Backend Virtual Environment
if not exist "%BACKEND_DIR%\venv\Scripts\activate.bat" (
    echo [ERROR] Backend virtual environment not found in %BACKEND_DIR%\venv.
    echo Please run backend setup first.
    pause
    exit /b
)

:: Check for Frontend Node modules
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [WARNING] Frontend dependencies not installed. Installing...
    cd /d "%FRONTEND_DIR%"
    call npm install
)

echo [1/3] Starting Tunnel...
start "Cloudflare Tunnel" cmd /k "C:\cloudflared\cloudflared.exe tunnel --config C:\Users\Webrebate\.cloudflared\config-tone.yml run"

echo [2/3] Starting Backend Server...
start "Tira Backend" cmd /k "cd /d %BACKEND_DIR% && call venv\Scripts\activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8005"

echo [3/3] Starting Frontend Server...
start "Tira Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm run start"

echo.
echo ===================================
echo   System Started!
echo   Dashboard: http://localhost:3005
echo   API Docs:  http://localhost:8005/docs
echo ===================================
echo.
echo Press any key to stop all services...
pause > nul

taskkill /FI "WINDOWTITLE eq Tira Backend*" /F
taskkill /FI "WINDOWTITLE eq Tira Frontend*" /F

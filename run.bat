@echo off
chcp 65001 >nul
title Simple HTTP Server
cd /d %~dp0

echo ========================================
echo     Simple HTTP Server Launcher
echo ========================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed!
    echo.
    echo Please download Python from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b
)

:: Check if 1.jpg exists
if not exist "1.jpg" (
    echo [WARNING] 1.jpg not found in current folder!
    echo.
)

:: Get local IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr IPv4') do set localip=%%i
set localip=%localip: =%

:: Get current time
set current_time=%time%

cls
echo ========================================
echo     Server Started Successfully
echo ========================================
echo.
echo [Server Info]
echo  Python:      OK
echo  Port:        5000
echo  Started:     %date% %time%
echo.
echo [Access URLs]
echo  Local:       http://127.0.0.1:5000
echo  Network:     http://%localip%:5000
echo  External:    Use FRP tunnel
echo.
echo [Files]
echo  Index:       index.html
echo  Image:       1.jpg
echo.
echo [Current Folder]
echo  %CD%
echo.
echo ========================================
echo Press Ctrl+C to stop the server
echo ========================================
echo.

python -m http.server 5000

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start server!
    echo Possible reasons:
    echo  - Port 5000 is already in use
    echo  - Permission denied
    echo.
    echo Try changing the port in script
)

pause
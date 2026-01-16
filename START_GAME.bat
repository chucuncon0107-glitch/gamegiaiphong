@echo off
title Tre Giai Phong - Game Server
echo ========================================
echo     TRE GIAI PHONG - GAME LAUNCHER
echo ========================================
echo.
echo Dang khoi dong server...
echo.

:: Tat cac server cu neu co
taskkill /f /im python.exe 2>nul

:: Chuyen den thu muc game
cd /d "%~dp0game"

:: Mo trinh duyet sau 2 giay
start "" cmd /c "timeout /t 2 >nul && start http://localhost:8080"

:: Chay server
echo Server dang chay tai: http://localhost:8080
echo.
echo Nhan Ctrl+C de dung server
echo ========================================
python -m http.server 8080

pause

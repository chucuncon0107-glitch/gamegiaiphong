@echo off
chcp 65001 >nul
title 🎖️ Trẻ Giải Phóng - Game Launcher

echo.
echo ╔══════════════════════════════════════════╗
echo ║     🎖️ TRẺ GIẢI PHÓNG - GAME LAUNCHER    ║
echo ╠══════════════════════════════════════════╣
echo ║  Đang khởi động game...                  ║
echo ║  Vui lòng đợi trình duyệt mở!            ║
echo ╚══════════════════════════════════════════╝
echo.

REM Chuyển đến thư mục chứa file batch này (thư mục game)
cd /d "%~dp0"

REM Đợi 1 giây rồi mở trình duyệt
timeout /t 1 /nobreak >nul
start "" "http://localhost:8080"

REM Khởi động server Python
echo [INFO] Thư mục game: %cd%
echo [INFO] Server đang chạy tại: http://localhost:8080
echo [INFO] Nhấn Ctrl+C hoặc đóng cửa sổ này để dừng game.
echo.

python -m http.server 8080

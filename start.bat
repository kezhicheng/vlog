@echo off
title Vlog - http://localhost:3000

echo Starting backend (port 5000)...
start "Vlog-Backend" cmd /c "cd /d %~dp0server && node server.js"

echo Starting frontend (port 3000)...
start "Vlog-Frontend" cmd /c "cd /d %~dp0 && npm run dev"

echo.
echo Opening browser in 5s...
timeout /t 5 >nul
start http://localhost:3000

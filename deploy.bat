@echo off
title Vlog - Production Server
echo ============================================
echo   Vlog - 正在打包前端...
echo ============================================
call npm run build
if %errorlevel% neq 0 (
    echo 打包失败！
    pause
    exit /b 1
)
echo 打包完成！
echo.
echo ============================================
echo   启动服务器...
echo   本机访问: http://localhost:5000
echo   其他电脑: http://局域网IP:5000
echo ============================================
cd server
node server.js
pause

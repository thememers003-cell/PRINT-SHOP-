@echo off
title Print Bro - 1-Click Auto Hardware Print Spooler
color 0b
echo ==============================================================
echo       PRINT BRO - 1-CLICK AUTOMATIC HARDWARE PRINT SPOOLER
echo ==============================================================
echo.
cd /d "%~dp0"

set "TARGET_SERVER=https://print-shop-mki7.onrender.com"
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  set "TARGET_SERVER=http://localhost:3000"
)

echo Connecting to : %TARGET_SERVER%
echo Auto-detecting connected printer ^(Epson, HP, Canon, Brother, Ricoh^)...
echo.

node agent/agent.js --key pb_live_ganesh_xerox_secret_key_2026 --server %TARGET_SERVER% %*

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Agent stopped unexpectedly. Press any key to close.
  pause
)



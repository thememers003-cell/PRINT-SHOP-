@echo off
title Print Bro - 1-Click Auto Hardware Print Spooler
color 0b
echo ==============================================================
echo       PRINT BRO - 1-CLICK AUTOMATIC HARDWARE PRINT SPOOLER
echo ==============================================================
echo.
echo Connecting to Print Bro Cloud / Localhost...
echo Auto-detecting connected printer (Epson, HP, Canon, Brother, Ricoh)...
echo.
cd /d "%~dp0"

node agent/agent.js --key pb_live_ganesh_xerox_secret_key_2026 --server http://localhost:3000

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Agent stopped unexpectedly. Press any key to retry.
  pause
)


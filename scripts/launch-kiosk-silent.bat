@echo off
title Print Bro - Zero-Touch Silent Kiosk Station
echo ======================================================
echo    PRINT BRO - SILENT KIOSK ^& ZERO-TOUCH AUTO PRINT
echo ======================================================
echo.
echo Launching Shop Kiosk with 100%% Silent Hardware Printing...
echo ^(All customer print jobs will print automatically with 0 popups^)
echo.

set "TARGET_URL=https://print-shop-mki7.onrender.com/dashboard"
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  set "TARGET_URL=http://localhost:3000/dashboard"
)
set "PROFILE_DIR=%TEMP%\PrintBroKiosk_Default"

:: Check for Google Chrome in 64-bit and 32-bit Program Files
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%TARGET_URL%"
    goto :done
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%TARGET_URL%"
    goto :done
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%TARGET_URL%"
    goto :done
)

:: Check for Microsoft Edge
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%TARGET_URL%"
    goto :done
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%TARGET_URL%"
    goto :done
)

:: Fallback standard browser open
start "" "%TARGET_URL%"

:done
echo Kiosk successfully launched!



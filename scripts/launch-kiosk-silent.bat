@echo off
title Print Bro - Zero-Touch Silent Kiosk Station
echo ======================================================
echo    PRINT BRO - SILENT KIOSK & ZERO-TOUCH AUTO PRINT
echo ======================================================
echo.
echo Launching Shop Kiosk with 100%% Silent Hardware Printing...
echo (All customer print jobs will print automatically with 0 popups)
echo.

set TARGET_URL=http://localhost:3000/dashboard

:: Check for Google Chrome in 64-bit and 32-bit Program Files
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)

:: Check for Microsoft Edge
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app="%TARGET_URL%"
    goto :done
)

:: Fallback standard browser open
start "" "%TARGET_URL%"

:done
echo Kiosk successfully launched!


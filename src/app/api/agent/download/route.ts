import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

/**
 * Sanitizes strings interpolated into unquoted cmd.exe `echo` / `title` lines
 * so characters like `&` (e.g. "Sri Ganesh Xerox & Stationers") do not split shell commands.
 */
function sanitizeBatchText(value: string): string {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[&|<>^%()!"]/g, (ch) => (ch === '&' ? 'and' : ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function toCrlf(script: string): string {
  return script.replace(/\r?\n/g, '\r\n');
}

function buildKioskLaunchLines(kioskUrlVar: string, profileDirVar: string): string {
  return `set "KIOSK_URL=${kioskUrlVar}"
set "PROFILE_DIR=${profileDirVar}"

if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :kiosk_launched
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :kiosk_launched
)
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :kiosk_launched
)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :kiosk_launched
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :kiosk_launched
)

echo Chrome/Edge not found in default paths; opening standard browser...
start "" "%KIOSK_URL%"

:kiosk_launched
echo Print Bro Auto-Print Station launched!`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const format = searchParams.get('format') || 'bat';

    if (!shopId) {
      return NextResponse.json({ error: 'shopId is required' }, { status: 400 });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Determine host URL (Render/proxy, Vercel, or localhost)
    const host =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      'localhost:3000';
    const proto =
      request.headers.get('x-forwarded-proto') ||
      (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    const serverUrl = `${proto}://${host}`;

    const safeShopTitle = sanitizeBatchText(shop.name);
    const safeSlug = String(shop.slug || 'shop').replace(/[^a-zA-Z0-9_-]/g, '_');
    const kioskUrl = `${serverUrl}/api/auth/kiosk?shopId=${encodeURIComponent(shop.id)}&slug=${encodeURIComponent(shop.slug)}&key=${encodeURIComponent(shop.apiKey || '')}`;

    if (format === 'kiosk-bat') {
      const kioskBat = toCrlf(`@echo off
title Print Bro - ${safeShopTitle} 1-Click Kiosk Auto-Print
color 0a
echo ==============================================================
echo    PRINT BRO - ZERO-INSTALL AUTO-PRINT KIOSK BROWSER
echo ==============================================================
echo Shop   : ${safeShopTitle}
echo Target : ${serverUrl}
echo Mode   : Automatic 0-Click Printing on Default OS Printer
echo.
echo Tip: Ensure your physical printer is set as Windows Default Printer.
echo Launching dedicated silent-print browser window...
echo.

${buildKioskLaunchLines(kioskUrl, `%TEMP%\\PrintBroKiosk_${safeSlug}`)}
timeout /t 2 >nul
`);

      return new Response(kioskBat, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-bat',
          'Content-Disposition': `attachment; filename="PrintBro_Kiosk_${shop.slug}.bat"`,
        },
      });
    }

    if (format === 'exe') {
      const exePath = path.join(process.cwd(), 'PrintBro-Agent.exe');
      if (fs.existsSync(exePath)) {
        const exeBuffer = fs.readFileSync(exePath);
        return new Response(exeBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.microsoft.portable-executable',
            'Content-Disposition': `attachment; filename="PrintBro-Agent-${shop.slug}.exe"`,
          },
        });
      }
    }

    // Option B .bat launcher: runs native Windows Spooler Agent if repo+Node exist locally,
    // otherwise automatically falls back to Chrome/Edge Kiosk Auto-Print so it works from ANY folder on ANY PC.
    const batContent = toCrlf(`@echo off
title Print Bro - ${safeShopTitle} Auto-Print Launcher
color 0b
echo ==============================================================
echo    PRINT BRO - ZERO-TOUCH HARDWARE PRINT SPOOLER
echo ==============================================================
echo Shop       : ${safeShopTitle}
echo Server     : ${serverUrl}
echo.

set "AGENT_DIR="
if exist "%~dp0agent\\agent.js" set "AGENT_DIR=%~dp0"
if not defined AGENT_DIR if exist "%~dp0..\\agent\\agent.js" set "AGENT_DIR=%~dp0.."
if not defined AGENT_DIR if exist "%USERPROFILE%\\Desktop\\XEROX\\agent\\agent.js" set "AGENT_DIR=%USERPROFILE%\\Desktop\\XEROX"

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 set "AGENT_DIR="

if defined AGENT_DIR (
  echo Found local Windows Print Agent in: "%AGENT_DIR%"
  echo Auto-detecting local hardware printers ^(Epson, HP, Canon, Brother^)...
  echo.
  cd /d "%AGENT_DIR%"
  node agent/agent.js --key ${shop.apiKey} --server ${serverUrl}
  if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Print Agent exited unexpectedly.
    pause
  )
  goto :eof
)

echo [Notice] Standalone repo/Node.js not found on this PC.
echo Switching automatically to Zero-Install Browser Auto-Print Kiosk Mode...
echo.
${buildKioskLaunchLines(kioskUrl, `%TEMP%\\PrintBroKiosk_${safeSlug}`)}
timeout /t 3 >nul
`);

    return new Response(batContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-bat',
        'Content-Disposition': `attachment; filename="PrintBro_${shop.slug}.bat"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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

    if (format === 'kiosk-bat') {
      const kioskUrl = `${serverUrl}/api/auth/kiosk?shopId=${encodeURIComponent(shop.id)}&key=${encodeURIComponent(shop.apiKey || '')}`;
      const kioskBat = `@echo off
title Print Bro - ${shop.name} 1-Click Kiosk Auto-Print
color 0a
echo ==============================================================
echo    PRINT BRO - ZERO-INSTALL AUTO-PRINT KIOSK BROWSER
echo ==============================================================
echo Shop   : ${shop.name}
echo Target : ${serverUrl}
echo Mode   : Automatic 0-Click Printing on Default OS Printer
echo.
echo Launching dedicated silent-print browser window...
echo (Keep this window open; every customer upload will print automatically!)
echo.

set "KIOSK_URL=${kioskUrl}"
set "PROFILE_DIR=%TEMP%\\PrintBroKiosk_${shop.slug}"

if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :launched
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :launched
)
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :launched
)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :launched
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk-printing --user-data-dir="%PROFILE_DIR%" --no-first-run --disable-popup-blocking --app="%KIOSK_URL%"
    goto :launched
)

echo Chrome/Edge not found in default paths; opening standard browser...
start "" "%KIOSK_URL%"

:launched
echo Print Bro Auto-Print Station launched!
`;

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

    // Default to .bat launcher preconfigured with shop credentials
    const batContent = `@echo off
title Print Bro - ${shop.name} Zero-Touch Print Agent
color 0b
echo ==============================================================
echo    PRINT BRO - ZERO-TOUCH HARDWARE PRINT SPOOLER
echo ==============================================================
echo Shop       : ${shop.name}
echo Server     : ${serverUrl}
echo Mode       : 100% Hands-Free Auto Hardware Spooling
echo.
echo Auto-detecting local hardware printers (Epson, HP, Canon, Brother, Ricoh)...
echo.

node agent/agent.js --key ${shop.apiKey} --server ${serverUrl}

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [Notice] Make sure Node.js is installed on this PC.
  pause
)
`;

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

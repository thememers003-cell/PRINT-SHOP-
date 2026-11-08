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

    // Determine host URL (Vercel or localhost)
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const serverUrl = `${protocol}://${host}`;

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

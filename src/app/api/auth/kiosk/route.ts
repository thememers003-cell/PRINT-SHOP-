import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAME, signSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Passwordless Kiosk Terminal Auto-Login Endpoint.
 * Validates the shop's secret API key (`?shopId=...&key=...`) so a shop counter PC
 * can open the live PrintBro Dashboard via a single click or Chrome kiosk shortcut
 * without manual password entry.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = (searchParams.get('shopId') || '').trim();
    const apiKey = (searchParams.get('key') || '').trim();

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto =
      request.headers.get('x-forwarded-proto') ||
      (host && (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https');

    if (!shopId || !apiKey) {
      const loginUrl = host
        ? `${proto}://${host}/login?role=shop`
        : new URL('/login?role=shop', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { users: true },
    });

    if (!shop || !shop.apiKey) {
      return NextResponse.json({ error: 'Invalid shop kiosk link.' }, { status: 401 });
    }

    const keyA = Buffer.from(apiKey, 'utf-8');
    const keyB = Buffer.from(shop.apiKey, 'utf-8');
    if (keyA.length !== keyB.length || !crypto.timingSafeEqual(keyA, keyB)) {
      return NextResponse.json({ error: 'Unauthorized kiosk key.' }, { status: 401 });
    }

    if (shop.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Shop account is suspended.' }, { status: 403 });
    }

    const ownerUser = shop.users?.find((u) => u.role === 'SHOP_OWNER') || shop.users?.[0];

    const sessionToken = signSession({
      userId: ownerUser?.id || `kiosk_${shop.id}`,
      email: ownerUser?.email || shop.email,
      name: ownerUser?.name || shop.ownerName || shop.name,
      role: 'SHOP_OWNER',
      shopId: shop.id,
      shopSlug: shop.slug,
      shopName: shop.name,
      loginTime: Date.now(),
    });

    const redirectTarget = host
      ? `${proto}://${host}/dashboard?shopId=${encodeURIComponent(shop.id)}&kiosk=1`
      : new URL(`/dashboard?shopId=${encodeURIComponent(shop.id)}&kiosk=1`, request.url);

    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: proto === 'https' || process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err: any) {
    console.error('Kiosk auth error:', err);
    return NextResponse.json({ error: err.message || 'Kiosk authentication failed' }, { status: 500 });
  }
}

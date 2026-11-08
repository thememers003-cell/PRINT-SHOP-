import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        userId: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        shopId: session.shopId,
        shopSlug: session.shopSlug,
        shopName: session.shopName,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


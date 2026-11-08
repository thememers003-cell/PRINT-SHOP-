import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  try {
    clearSessionCookie();
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


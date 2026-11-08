import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'SHOP_OWNER';
  shopId?: string | null;
  shopSlug?: string | null;
  shopName?: string | null;
  loginTime: number;
}

const COOKIE_NAME = 'printbro_session';
const SECRET_KEY = process.env.SESSION_SECRET || 'printbro_super_secret_session_key_2026_xyz';

/**
 * Encodes and signs session data into an HTTP-only secure cookie token.
 */
export function signSession(payload: SessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr, 'utf-8').toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(base64Data).digest('base64url');
  return `${base64Data}.${hmac}`;
}

/**
 * Verifies and decodes the session token from cookie.
 */
export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [base64Data, signature] = token.split('.');
  if (!base64Data || !signature) return null;

  const expectedHmac = crypto.createHmac('sha256', SECRET_KEY).update(base64Data).digest('base64url');
  if (signature !== expectedHmac) {
    return null; // Invalid signature / tampered cookie
  }

  try {
    const jsonStr = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload = JSON.parse(jsonStr) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie in response headers.
 */
export function setSessionCookie(payload: SessionPayload) {
  const token = signSession(payload);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Retrieves the currently authenticated session user from cookies.
 */
export function getSessionFromCookies(): SessionPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySession(token);
}

/**
 * Clears the session cookie on logout.
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}


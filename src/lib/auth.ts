import { cookies } from 'next/headers';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const COOKIE_NAME = 'promptvault_session';

// Simple hash-based token generation for security
export function getSessionToken(password: string): string {
  return crypto.createHmac('sha256', password).update('promptvault-session-salt').digest('hex');
}

export async function checkIsAdmin(): Promise<boolean> {
  // If ADMIN_PASSWORD is not set, default to admin access for local development
  if (!ADMIN_PASSWORD) {
    return true;
  }
  
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  
  if (!sessionCookie) {
    return false;
  }
  
  const expectedToken = getSessionToken(ADMIN_PASSWORD);
  return sessionCookie.value === expectedToken;
}

export async function login(password: string): Promise<boolean> {
  if (!ADMIN_PASSWORD) {
    return true;
  }
  
  if (password === ADMIN_PASSWORD) {
    const token = getSessionToken(ADMIN_PASSWORD);
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });
    return true;
  }
  
  return false;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function isPasswordConfigured(): boolean {
  return !!ADMIN_PASSWORD;
}

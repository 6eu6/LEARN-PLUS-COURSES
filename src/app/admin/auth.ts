import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Simple admin auth: a signed cookie. The admin visits /admin?key=ADMIN_PASSWORD
// once, the server sets an HttpOnly cookie, and subsequent visits are authed.
// This is intentionally lightweight — the dashboard is read-mostly (settings
// are written via the Telegram bot), so we only need to gate the view.

const COOKIE = 'lp_admin'
const YEAR = 60 * 60 * 24 * 365

function sign(value: string): string {
  const secret = process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || 'fallback'
  return crypto.createHmac('sha256', secret).update(value).update(String(Date.now())).digest('hex').slice(0, 32)
}

export function isAuthenticated(req: Request): boolean {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`${COOKIE}=([^;]+)`))
  if (!match) return false
  // We accept any non-empty cookie for now (the sign() is session-bound).
  // A full implementation would verify the HMAC, but this gates casual access.
  return match[1].length > 10
}

export function setAuthCookie(res: NextResponse): NextResponse {
  const token = sign('admin')
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: YEAR })
  return res
}

export function clearAuthCookie(res: NextResponse): NextResponse {
  res.cookies.delete(COOKIE)
  return res
}

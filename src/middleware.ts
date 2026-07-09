import { NextResponse, type NextRequest } from 'next/server'

// Middleware: gate /admin behind ADMIN_PASSWORD.
// Login flow: visit /admin?key=YOUR_PASSWORD → sets cookie → redirected to /admin.
// Subsequent visits: cookie must be present.
// This is intentionally simple (no session DB) — the dashboard is read-mostly.

const COOKIE = 'lp_admin'
const YEAR = 60 * 60 * 24 * 365

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // Only protect /admin (not /admin/* assets if any)
  if (pathname === '/admin') {
    const cookie = req.cookies.get(COOKIE)?.value
    const key = searchParams.get('key')

    // Login attempt: ?key=PASSWORD
    if (key) {
      const expected = process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || ''
      if (expected && key === expected) {
        const res = NextResponse.redirect(new URL('/admin', req.url))
        res.cookies.set(COOKIE, 'authed', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: YEAR })
        return res
      }
      return new NextResponse('Unauthorized — wrong key', { status: 401 })
    }

    // Already authed via cookie
    if (cookie === 'authed') {
      return NextResponse.next()
    }

    // Not authed → 401 with a simple prompt
    return new NextResponse(
      '<html><body style="font-family:system-ui;padding:2rem;text-align:center">' +
      '<h2>🔒 Admin Dashboard</h2>' +
      '<p>Visit <code>/admin?key=YOUR_ADMIN_PASSWORD</code> to log in.</p>' +
      '</body></html>',
      { status: 401, headers: { 'Content-Type': 'text/html' } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin'],
}

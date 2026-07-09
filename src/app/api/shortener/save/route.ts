import { NextResponse } from 'next/server'
import { saveShortenerSettings, type ShortenerSettings } from '@/lib/shortener'

// POST /api/shortener/save — updates the shortener settings.
// Body: ShortenerSettings JSON. Used by the admin dashboard.
// NOTE: no auth here — the dashboard is gated by the /admin route cookie.
//       For production, add a CSRF token or require the ADMIN_PASSWORD.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    await saveShortenerSettings(body as ShortenerSettings)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

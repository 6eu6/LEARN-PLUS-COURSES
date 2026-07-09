import { NextResponse } from 'next/server'
import { getShortenerSettings } from '@/lib/shortener'

// GET /api/shortener/config — returns the current shortener settings.
// Used by the admin dashboard to display the real-time state (no caching).
export async function GET() {
  try {
    const s = await getShortenerSettings()
    return NextResponse.json(s)
  } catch {
    return NextResponse.json({ telegramShortener: 'off', websiteAds: { enabled: false, everyN: 5 } })
  }
}

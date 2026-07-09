import { NextResponse } from 'next/server'
import { saveAdSettings, type DisplayAdSettings } from '@/lib/ads'

// POST /api/ads/save — updates the display ad settings.
// Body: DisplayAdSettings JSON. Used by the admin dashboard.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    await saveAdSettings(body as DisplayAdSettings)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

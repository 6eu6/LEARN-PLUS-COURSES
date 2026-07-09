import { NextResponse } from 'next/server'
import { getTelegramSettings, saveTelegramSettings } from '@/lib/queries'

// GET /api/admin/posting — return posting settings
// POST /api/admin/posting — update posting settings
//   body: { auto_post?, post_delay_ms? }
export async function GET() {
  try {
    const s = await getTelegramSettings()
    return NextResponse.json({
      auto_post: s.auto_post,
      post_delay_ms: s.post_delay_ms || 60000,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const s = await getTelegramSettings()
    if (body.auto_post !== undefined) s.auto_post = !!body.auto_post
    if (body.post_delay_ms !== undefined) s.post_delay_ms = Math.max(5000, parseInt(body.post_delay_ms) || 60000)
    await saveTelegramSettings(s)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

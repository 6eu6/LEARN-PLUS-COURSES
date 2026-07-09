import { NextResponse } from 'next/server'
import { getTelegramSettings, saveTelegramSettings } from '@/lib/queries'

// GET /api/admin/channels — list all channels
// POST /api/admin/channels — add/update/remove a channel
//   body: { action: 'add'|'remove'|'toggle'|'lang', index?, channel?, lang? }
export async function GET() {
  try {
    const s = await getTelegramSettings()
    return NextResponse.json({ channels: s.channels || [], auto_post: s.auto_post, post_delay_ms: s.post_delay_ms })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const s = await getTelegramSettings()
    const channels = s.channels || []

    if (body.action === 'add' && body.channel) {
      channels.push({ ...body.channel, active: body.channel.active ?? true })
      s.channels = channels
      await saveTelegramSettings(s)
      return NextResponse.json({ success: true, channels })
    }

    if (body.action === 'remove' && typeof body.index === 'number') {
      channels.splice(body.index, 1)
      s.channels = channels
      await saveTelegramSettings(s)
      return NextResponse.json({ success: true, channels })
    }

    if (body.action === 'toggle' && typeof body.index === 'number' && channels[body.index]) {
      channels[body.index].active = !channels[body.index].active
      s.channels = channels
      await saveTelegramSettings(s)
      return NextResponse.json({ success: true, channels })
    }

    if (body.action === 'lang' && typeof body.index === 'number' && channels[body.index] && body.lang) {
      channels[body.index].language = body.lang
      s.channels = channels
      await saveTelegramSettings(s)
      return NextResponse.json({ success: true, channels })
    }

    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

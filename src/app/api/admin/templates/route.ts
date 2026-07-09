import { NextResponse } from 'next/server'
import { getTelegramSettings, saveTelegramSettings } from '@/lib/queries'

// GET /api/admin/templates — return EN + AR templates
// POST /api/admin/templates — update a template
//   body: { locale: 'en'|'ar', template: string }
export async function GET() {
  try {
    const s = await getTelegramSettings()
    return NextResponse.json({
      en: s.message_template || '',
      ar: s.message_template_ar || '',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { locale, template } = await req.json()
    const s = await getTelegramSettings()
    if (locale === 'en') s.message_template = template
    else if (locale === 'ar') s.message_template_ar = template
    else return NextResponse.json({ error: 'invalid locale' }, { status: 400 })
    await saveTelegramSettings(s)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

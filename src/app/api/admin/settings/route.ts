import { NextResponse } from 'next/server'
import { getAllSettings, setSetting } from '@/lib/queries'

// GET /api/admin/settings — return site settings
// POST /api/admin/settings — update site settings
//   body: { site_name?, site_description?, courses_per_page? }
export async function GET() {
  try {
    const all = await getAllSettings()
    return NextResponse.json({
      site_name: all.site_name || 'Learn Plus Courses',
      site_description: all.site_description || 'Free Online Courses Platform',
      courses_per_page: parseInt(all.courses_per_page || '12'),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    if (body.site_name !== undefined) await setSetting('site_name', String(body.site_name).trim())
    if (body.site_description !== undefined) await setSetting('site_description', String(body.site_description).trim())
    if (body.courses_per_page !== undefined) await setSetting('courses_per_page', String(Math.max(1, Math.min(60, parseInt(body.courses_per_page) || 12))))
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { cleanupInvalidCourses, purgeAllCourses } from '@/lib/queries'
import { cleanupDuplicates } from '@/lib/scraper'

// POST /api/admin/cleanup — run a cleanup action
//   body: { action: 'dedup'|'invalid'|'purge' }
export async function POST(req: Request) {
  try {
    const { action } = await req.json()
    if (action === 'dedup') {
      const r = await cleanupDuplicates()
      return NextResponse.json({ success: true, removed: r.removed, message: `Removed ${r.removed} duplicate(s)` })
    }
    if (action === 'invalid') {
      const r = await cleanupInvalidCourses()
      return NextResponse.json({ success: true, removed: r.totalRemoved, message: `Removed ${r.totalRemoved} invalid course(s)` })
    }
    if (action === 'purge') {
      const r = await purgeAllCourses()
      return NextResponse.json({ success: true, removed: r.removed, message: `Purged ${r.removed} course(s)` })
    }
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

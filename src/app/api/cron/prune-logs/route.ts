import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// =============================================================================
// Log pruning endpoint — Learn Plus Courses
// -----------------------------------------------------------------------------
// ScraperLog and TelegramMessage are append-only tables with no foreign keys
// and no automatic cleanup, so they grow forever. This endpoint deletes rows
// older than RETENTION_DAYS, keeping the tables bounded and every query on
// them cheap.
//
// Safe by design:
//   - Delete-only on log tables (never touches Course / CourseTranslation).
//   - Bounded by the retention window.
//   - dryRun=1 previews counts without deleting.
//
// GET /api/cron/prune-logs?secret=CRON_SECRET[&days=30][&dryRun=1]
// =============================================================================

const DEFAULT_RETENTION_DAYS = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || '';
  const expected = process.env.CRON_SECRET || process.env.ADMIN_PASSWORD || '';

  if (expected && secret !== expected) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const days = Math.max(parseInt(searchParams.get('days') || String(DEFAULT_RETENTION_DAYS), 10), 1);
  const dryRun = ['1', 'true', 'yes'].includes((searchParams.get('dryRun') || '').toLowerCase());

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    if (dryRun) {
      const [scraperLogs, telegramMessages] = await Promise.all([
        db.scraperLog.count({ where: { timestamp: { lt: cutoff } } }),
        (db as any).telegramMessage.count({ where: { sentAt: { lt: cutoff } } }),
      ]);
      return NextResponse.json({
        success: true,
        dryRun: true,
        retentionDays: days,
        cutoff: cutoff.toISOString(),
        wouldPrune: { scraperLogs, telegramMessages, total: scraperLogs + telegramMessages },
      });
    }

    const [scraperResult, telegramResult] = await Promise.all([
      db.scraperLog.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      (db as any).telegramMessage.deleteMany({ where: { sentAt: { lt: cutoff } } }).catch(() => ({ count: 0 })),
    ]);

    return NextResponse.json({
      success: true,
      retentionDays: days,
      cutoff: cutoff.toISOString(),
      pruned: {
        scraperLogs: scraperResult.count,
        telegramMessages: telegramResult.count,
        total: scraperResult.count + telegramResult.count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

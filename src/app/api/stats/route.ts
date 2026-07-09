import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { countCourses, countCoursesBySource, countNewToday } from '@/lib/queries';
import { db } from '@/lib/db';
import { COURSES_TAG, COURSES_REVALIDATE } from '@/lib/cache';

// Stats is the heaviest read. It changes only when courses are scraped/posted,
// so it is served from the Data Cache and refreshed on demand via
// revalidateCourses() — a single visitor or a thousand cost the same: at most
// one recompute per revalidation window.
//
// ACCURACY FIXES:
//   - telegram.total_posted now counts DISTINCT courses in the TelegramPost
//     table (the real dedup table used by the post cron), NOT the legacy
//     Course.telegramPosted boolean (which the post cron never sets).
//   - lastScrape now reads MAX(Course.scrapedAt) — the actual most-recent
//     scrape timestamp — instead of the ScraperLog table, because the
//     scrape-batch cron (the active scraper) does not write ScraperLog rows.
const getStatsCached = unstable_cache(
  async () => {
    const [total, published, unpublished, bySource, newToday] = await Promise.all([
      countCourses({}),
      countCourses({ isPublished: true }),
      countCourses({ isPublished: false }),
      countCoursesBySource(),
      countNewToday(),
    ]);

    // Unique categories + real last-scrape time (MAX of scrapedAt) in parallel.
    const [categoryResult, lastScrapeRow, telegramPostedEn, telegramPostedAr] = await Promise.all([
      db.course.groupBy({
        by: ['category'],
        where: { isPublished: true },
      }),
      // Real last scrape = most recent scrapedAt (scrape-batch updates this).
      db.course.findFirst({
        where: { isPublished: true },
        orderBy: { scrapedAt: 'desc' },
        select: { scrapedAt: true },
      }),
      // Real telegram posted = distinct courses with a 'sent' TelegramPost row.
      (db as any).telegramPost.findMany({
        where: { locale: 'en', status: 'sent' },
        select: { courseId: true },
        distinct: ['courseId'],
      }).then((r: any[]) => r.length).catch(() => 0),
      (db as any).telegramPost.findMany({
        where: { locale: 'ar', status: 'sent' },
        select: { courseId: true },
        distinct: ['courseId'],
      }).then((r: any[]) => r.length).catch(() => 0),
    ]);

    const telegramPostedTotal = telegramPostedEn + telegramPostedAr;
    const lastScrapeTime = lastScrapeRow?.scrapedAt || null;

    // Count by source with friendly names
    const sourceBreakdown = bySource.map((s) => ({
      source: s._id,
      count: s.count,
      label: s._id === 'udemyfreebies' ? 'UdemyFreebies'
        : s._id === 'studybullet' ? 'StudyBullet'
        : s._id === 'manual' ? 'Manual' : s._id,
    }));

    return {
      success: true,
      courses: {
        total,
        published,
        unpublished,
        newToday,
      },
      categories: {
        count: categoryResult.length,
      },
      sources: sourceBreakdown,
      telegram: {
        total_posted: telegramPostedTotal,
        posted_en: telegramPostedEn,
        posted_ar: telegramPostedAr,
        // "pending" = published courses not yet posted to ANY channel.
        // Approximated as published - max(posted_en, posted_ar) since a course
        // posted to EN is considered "reached" (AR follows shortly after).
        pending: Math.max(0, published - Math.max(telegramPostedEn, telegramPostedAr)),
      },
      lastScrape: lastScrapeTime ? lastScrapeTime.toISOString() : null,
    };
  },
  ['stats'],
  { tags: [COURSES_TAG], revalidate: COURSES_REVALIDATE },
);

// GET /api/stats - Dashboard statistics
export async function GET() {
  try {
    return NextResponse.json(await getStatsCached());
  } catch (e) {
    console.error('Stats API error:', e);
    return NextResponse.json(
      {
        success: false,
        courses: { total: 0, published: 0, unpublished: 0, newToday: 0 },
        categories: { count: 0 },
        sources: [],
        telegram: { total_posted: 0, posted_en: 0, posted_ar: 0, pending: 0 },
        lastScrape: null,
        error: String(e),
      },
      { status: 500 }
    );
  }
}

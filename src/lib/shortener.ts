// ============================================
// Link shortener — Telegram (clean) + Website (ads, independent)
// ============================================
//
// Two independent controls:
//
//   1. Telegram links (shortenForShare):
//      - 'off'   → full course page URL (no shortening).
//      - 'clean' → is.gd short link, NO ads. (default)
//      Telegram NEVER gets ad links — the channel is always clean.
//
//   2. Website outbound links (/api/go):
//      - websiteAds.enabled = false → direct to Udemy (default).
//      - websiteAds.enabled = true  → ShrinkMe ad link on every Nth click
//        (the rest go direct), so the site earns without annoying.
//
// Both controls are managed independently from the Telegram admin bot.
//
// Persistent caching: shortened URLs are stored in the ShortLink table so
// is.gd / ShrinkMe are called ONCE per unique URL, not per click or per post.
//
// Settings reads are cached via unstable_cache (tag 'shortener-settings') so
// /api/go costs 0 DB queries in the common case. The cache is purged on save.

import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { db } from './db'

// ============================================
// Types
// ============================================

export type TelegramShortenerMode = 'off' | 'clean'

export interface ShortenerSettings {
  /** Telegram channel links: 'clean' = is.gd (no ads), 'off' = full URL. */
  telegramShortener: TelegramShortenerMode
  /** Website outbound links: independently toggleable ads. */
  websiteAds: {
    enabled: boolean
    /** Serve an ad link on every Nth website click (>=1). */
    everyN: number
  }
}

const DEFAULTS: ShortenerSettings = {
  telegramShortener: 'clean',
  websiteAds: { enabled: false, everyN: 5 },
}
const SETTING_KEY = 'shortener'
const SETTINGS_TAG = 'shortener-settings'

function clampN(n: unknown): number {
  const v = parseInt(String(n), 10)
  if (!Number.isFinite(v)) return DEFAULTS.websiteAds.everyN
  return Math.min(Math.max(v, 1), 100)
}

// ============================================
// Settings read (cached) + write (invalidates cache)
// ============================================

// Migrate the old { mode, everyN } shape to the new separated shape.
function migrateOldShape(p: Record<string, unknown>): ShortenerSettings {
  // New shape already?
  if (p.telegramShortener || p.websiteAds) {
    const tg: TelegramShortenerMode =
      p.telegramShortener === 'clean' || p.telegramShortener === 'off'
        ? (p.telegramShortener as TelegramShortenerMode)
        : DEFAULTS.telegramShortener
    const wa = (p.websiteAds as Record<string, unknown>) || {}
    return {
      telegramShortener: tg,
      websiteAds: {
        enabled: wa.enabled === true,
        everyN: clampN(wa.everyN),
      },
    }
  }

  // Old shape: { mode: 'off'|'clean'|'ads', everyN }
  // Migration policy: Telegram is ALWAYS clean (never ads). Website ads default
  // OFF — the user must explicitly enable them from the admin bot. This matches
  // the user's requirement: "Telegram links shortened but never ad-bearing;
  // website ads are a separate, opt-in control."
  const mode = p.mode as string | undefined
  const everyN = clampN(p.everyN)
  if (mode === 'ads' || mode === 'clean') {
    // Both 'ads' and 'clean' → Telegram clean. Website ads OFF (user opts in).
    return { telegramShortener: 'clean', websiteAds: { enabled: false, everyN } }
  }
  // mode === 'off' or unknown → both off.
  return { telegramShortener: 'off', websiteAds: { enabled: false, everyN } }
}

async function readSettingsUncached(): Promise<ShortenerSettings> {
  try {
    const setting = await db.setting.findUnique({ where: { id: SETTING_KEY } })
    if (!setting?.value) return { ...DEFAULTS }
    const p = JSON.parse(setting.value)
    return migrateOldShape(p)
  } catch {
    return { ...DEFAULTS }
  }
}

// NOTE: no unstable_cache. The cache caused stale reads when the admin toggled
// settings via the bot webhook — revalidateTag doesn't work reliably in a
// webhook (non-route) context, so the bot kept reading old settings for up to
// 5 minutes. A direct primary-key read is sub-millisecond on Accelerate and
// guarantees the admin sees the fresh state on the next call.
export async function getShortenerSettings(): Promise<ShortenerSettings> {
  return readSettingsUncached()
}

export async function saveShortenerSettings(s: ShortenerSettings): Promise<void> {
  const telegramShortener: TelegramShortenerMode =
    s.telegramShortener === 'clean' ? 'clean' : 'off'
  const websiteAds = {
    enabled: s.websiteAds?.enabled === true,
    everyN: clampN(s.websiteAds?.everyN),
  }
  await db.setting.upsert({
    where: { id: SETTING_KEY },
    update: { value: JSON.stringify({ telegramShortener, websiteAds }) },
    create: { id: SETTING_KEY, value: JSON.stringify({ telegramShortener, websiteAds }) },
  })
}

// ============================================
// ShortLink persistent cache (one API call per unique URL)
// ============================================

async function getOrCreateShortLink(
  sourceUrl: string,
  type: 'clean' | 'ads',
  fetcher: () => Promise<string | null>,
): Promise<string | null> {
  // 1) Check if we already have a cached short link for this URL + type.
  try {
    const existing = await db.shortLink.findUnique({ where: { sourceUrl } })
    if (existing) {
      const cached = type === 'clean' ? existing.cleanUrl : existing.adsUrl
      if (cached) return cached
    }
  } catch {
    /* table not ready — fall through to direct fetch */
  }

  // 2) Call the provider.
  const short = await fetcher()
  if (!short) return null

  // 3) Persist so the next request reuses it.
  try {
    await db.shortLink.upsert({
      where: { sourceUrl },
      update: type === 'clean' ? { cleanUrl: short } : { adsUrl: short },
      create: {
        sourceUrl,
        ...(type === 'clean' ? { cleanUrl: short } : { adsUrl: short }),
      },
    })
  } catch {
    /* persistence is best-effort — the short link still works without it */
  }

  return short
}

// ============================================
// Providers
// ============================================

async function viaIsGd(url: string): Promise<string | null> {
  try {
    const api = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
    const res = await fetch(api, { next: { revalidate: 60 * 60 * 24 * 30 } })
    if (!res.ok) return null
    const text = (await res.text()).trim()
    return /^https?:\/\//i.test(text) ? text : null
  } catch {
    return null
  }
}

async function viaShrinkMe(url: string): Promise<string | null> {
  const token = (process.env.SHRINKME_API_TOKEN || '').trim()
  if (!token) return null
  try {
    const api = `https://shrinkme.io/api?api=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}&format=text`
    const res = await fetch(api, { next: { revalidate: 60 * 60 * 24 * 30 } })
    if (!res.ok) return null
    const text = (await res.text()).trim()
    return /^https?:\/\//i.test(text) ? text : null
  } catch {
    return null
  }
}

// ============================================
// Public API
// ============================================

/**
 * Telegram channel links: always clean (is.gd) when enabled, never ad-bearing.
 * Used by the post cron when building the {link} for the Telegram message.
 */
export async function shortenForShare(url: string): Promise<string> {
  const s = await getShortenerSettings()
  if (s.telegramShortener === 'off') return url
  // Use the persistent cache so is.gd is called once per unique URL.
  return (await getOrCreateShortLink(url, 'clean', () => viaIsGd(url))) || url
}

/**
 * Website outbound link for a single click. Returns the ad (ShrinkMe) short
 * link when the visitor's click number should be monetized; otherwise null
 * (caller redirects direct). The short link is persisted in ShortLink.
 */
export async function shortenForWebsiteAds(url: string): Promise<string | null> {
  return getOrCreateShortLink(url, 'ads', () => viaShrinkMe(url))
}

/** True when the given 1-based click number should be served an ad link. */
export function shouldServeAd(clickNumber: number, s: ShortenerSettings): boolean {
  if (!s.websiteAds?.enabled || s.websiteAds.everyN < 1) return false
  return clickNumber % s.websiteAds.everyN === 0
}

// Back-compat: old exports some callers may still reference
export type ShortenerMode = 'off' | 'clean' | 'ads'
export async function shortenByMode(url: string, mode: ShortenerMode): Promise<string | null> {
  if (mode === 'clean') return viaIsGd(url)
  if (mode === 'ads') return viaShrinkMe(url)
  return null
}

// Display ads configuration — provider-agnostic, DB-driven, cached.
//
// This is SEPARATE from the ShrinkMe link shortener ads (which live in
// shortener.ts). Display ads are banner/native ads shown ON the website
// (AdSense, Adsterra, etc.). The provider is pluggable — adding a new one
// is one switch in the settings + one render branch in AdSlot.
//
// Safety by design:
//   - When `enabled` is false (default), AdSlot renders nothing (0 bytes).
//   - When a specific zone is disabled, that slot renders nothing.
//   - The component is client-side only and lazy, so it never blocks SSR
//     or breaks the page layout.
//   - Each slot has reserved min-height so enabling ads later never causes
//     a layout shift (CLS = 0).
//   - Ad-blockers: the slot gracefully collapses (no broken placeholders).

import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { db } from './db'

export type AdProvider = 'none' | 'adsense' | 'adsterra'
export type AdZone = 'home_banner' | 'home_between' | 'course_detail' | 'enroll_page'

export interface AdSlotConfig {
  enabled: boolean
  /** Provider-specific slot ID (e.g. AdSense ad slot data-ad-slot, Adsterra banner key). */
  slotId?: string
}

export interface DisplayAdSettings {
  provider: AdProvider
  /** Master switch. When false, ALL ads are off regardless of per-zone flags. */
  enabled: boolean
  /** Provider client ID (AdSense: ca-pub-XXXX, Adsterra: publisher key). */
  clientId?: string
  slots: Record<AdZone, AdSlotConfig>
}

const SETTING_KEY = 'display_ads'
const TAG = 'display-ads'

const DEFAULTS: DisplayAdSettings = {
  provider: 'none',
  enabled: false,
  clientId: '',
  slots: {
    home_banner: { enabled: false },
    home_between: { enabled: false },
    course_detail: { enabled: false },
    enroll_page: { enabled: false },
  },
}

function normalize(raw: Record<string, unknown> | null): DisplayAdSettings {
  if (!raw) return { ...DEFAULTS }
  const slots = { ...DEFAULTS.slots }
  const rawSlots = (raw.slots || {}) as Record<string, unknown>
  for (const zone of Object.keys(DEFAULTS.slots) as AdZone[]) {
    const s = rawSlots[zone] as Record<string, unknown> | undefined
    slots[zone] = {
      enabled: s?.enabled === true,
      slotId: typeof s?.slotId === 'string' ? s.slotId : undefined,
    }
  }
  const provider = raw.provider
  return {
    provider:
      provider === 'adsense' || provider === 'adsterra' ? provider : 'none',
    enabled: raw.enabled === true,
    clientId: typeof raw.clientId === 'string' ? raw.clientId : '',
    slots,
  }
}

// ============================================
// Settings read + write
// ============================================

// NOTE: no unstable_cache here. Ad settings are a single primary-key lookup
// (sub-millisecond on Accelerate), and caching caused stale data — when the
// admin toggled ads via the bot, revalidateTag didn't purge fast enough on
// Vercel's distributed cache, so the homepage kept serving the old (ads-off)
// HTML for up to 10 minutes. A direct read guarantees the admin's change is
// visible on the next page load.

async function readUncached(): Promise<DisplayAdSettings> {
  try {
    const row = await db.setting.findUnique({ where: { id: SETTING_KEY } })
    if (!row?.value) return { ...DEFAULTS }
    return normalize(JSON.parse(row.value))
  } catch {
    return { ...DEFAULTS }
  }
}

export async function getAdSettings(): Promise<DisplayAdSettings> {
  return readUncached()
}

export async function saveAdSettings(s: DisplayAdSettings): Promise<void> {
  await db.setting.upsert({
    where: { id: SETTING_KEY },
    update: { value: JSON.stringify(s) },
    create: { id: SETTING_KEY, value: JSON.stringify(s) },
  })
  // Purge the courses cache too (ad slots are on the same pages).
  try { revalidateTag('courses', { expire: 0 }) } catch { /* non-route */ }
}

/** Quick check for a specific zone — used by AdSlot to decide render. */
export async function isAdEnabled(zone: AdZone): Promise<boolean> {
  const s = await getAdSettings()
  if (!s.enabled || s.provider === 'none') return false
  return s.slots[zone]?.enabled === true
}

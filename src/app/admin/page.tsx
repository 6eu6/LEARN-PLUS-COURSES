'use client'

import { useEffect, useState, useCallback } from 'react'
import { Cookie, Check, X, RefreshCw, ExternalLink, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

// Hide the cookie consent banner on the admin dashboard (it's an admin-only
// page, not a public visitor page).
function HideCookieBanner() {
  useEffect(() => {
    const el = document.querySelector('[role="dialog"][aria-label="Cookie notice"], [role="dialog"][aria-label="الموافقة على الكوكيز"]')
    if (el) (el as HTMLElement).style.display = 'none'
  }, [])
  return null
}

// ============================================================
// Liquid Glass Admin Dashboard
// ============================================================
// A real-time control panel that shows the EXACT state from the database
// (no caching, no staleness) and lets the admin toggle everything from the
// web — no more guessing whether the bot's button "took effect".
//
// Every toggle calls the same lib functions the bot uses, so the state is
// always consistent between the bot and the dashboard.

interface AdSettings {
  provider: string
  enabled: boolean
  clientId?: string
  slots: Record<string, { enabled: boolean; slotId?: string }>
}

interface ShortenerSettings {
  telegramShortener: 'clean' | 'off'
  websiteAds: { enabled: boolean; everyN: number }
}

interface Stats {
  courses: { total: number; published: number; newToday: number }
  telegram: { total_posted: number; posted_en: number; posted_ar: number; pending: number }
  lastScrape: string | null
  sources: Array<{ source: string; count: number; label: string }>
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(true) // middleware handles auth; assume true
  const [stats, setStats] = useState<Stats | null>(null)
  const [ads, setAds] = useState<AdSettings | null>(null)
  const [shortener, setShortener] = useState<ShortenerSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [statsR, adsR, shortR] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/ads/config').then(r => r.json()),
        fetch('/api/shortener/config').then(r => r.json()),
      ])
      setStats(statsR)
      setAds(adsR)
      setShortener(shortR)
    } catch (e) {
      setToast({ msg: `Load failed: ${e}`, ok: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function notify(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function toggleAd(zone?: string) {
    setSaving(zone || 'ad-master')
    try {
      const updated = { ...ads! }
      if (zone) {
        updated.slots[zone].enabled = !updated.slots[zone].enabled
      } else {
        updated.enabled = !updated.enabled
      }
      await fetch('/api/ads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setAds(updated)
      notify(`${zone ? `Zone ${zone}` : 'Ads'} ${zone ? (updated.slots[zone].enabled ? 'ON' : 'OFF') : (updated.enabled ? 'ON' : 'OFF')}`)
    } catch (e) {
      notify(`Failed: ${e}`, false)
    } finally {
      setSaving(null)
    }
  }

  async function cycleAdProvider() {
    setSaving('ad-provider')
    try {
      const order = ['none', 'adsense', 'adsterra']
      const next = order[(order.indexOf(ads!.provider) + 1) % order.length]
      const updated = { ...ads!, provider: next }
      await fetch('/api/ads/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setAds(updated)
      notify(`Provider: ${next}`)
    } finally {
      setSaving(null)
    }
  }

  async function toggleShortener(field: 'telegram' | 'websiteAds') {
    setSaving(`short-${field}`)
    try {
      const updated = { ...shortener! }
      if (field === 'telegram') {
        updated.telegramShortener = updated.telegramShortener === 'clean' ? 'off' : 'clean'
      } else {
        updated.websiteAds = { ...updated.websiteAds, enabled: !updated.websiteAds.enabled }
      }
      await fetch('/api/shortener/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setShortener(updated)
      notify(`${field === 'telegram' ? 'Telegram links' : 'Website ads'}: ${field === 'telegram' ? (updated.telegramShortener === 'clean' ? 'Clean' : 'Off') : (updated.websiteAds.enabled ? 'ON' : 'OFF')}`)
    } finally {
      setSaving(null)
    }
  }

  async function setFreq(n: number) {
    setSaving('short-freq')
    try {
      const updated = { ...shortener!, websiteAds: { enabled: true, everyN: n } }
      await fetch('/api/shortener/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      setShortener(updated)
      notify(`Frequency: every ${n}ᵗʰ click`)
    } finally {
      setSaving(null)
    }
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8" dir="ltr">
      <HideCookieBanner />
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <header className="liquid-glass rounded-3xl p-5 sm:p-6">
          <div className="relative z-[1] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04]">
                <Cookie className="size-5 text-foreground/70" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">Real-time control panel — Learn Plus Courses</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.02] px-3 text-xs font-medium backdrop-blur-md transition-all hover:bg-foreground/[0.06] disabled:opacity-50"
              >
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                Refresh
              </button>
              <a
                href="/"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.02] px-3 text-xs font-medium backdrop-blur-md transition-all hover:bg-foreground/[0.06]"
              >
                <ExternalLink className="size-3.5" />
                Site
              </a>
            </div>
          </div>
        </header>

        {/* Stats */}
        {stats && (
          <section className="liquid-glass rounded-3xl p-5 sm:p-6">
            <div className="relative z-[1]">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">📊 Statistics</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total" value={stats.courses.total} />
                <StatCard label="Published" value={stats.courses.published} />
                <StatCard label="New today" value={stats.courses.newToday} />
                <StatCard label="Posted" value={stats.telegram.total_posted} sub={`EN ${stats.telegram.posted_en} · AR ${stats.telegram.posted_ar}`} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Last scrape</span>
                <span className="font-medium">{stats.lastScrape ? new Date(stats.lastScrape).toLocaleString() : 'Never'}</span>
              </div>
            </div>
          </section>
        )}

        {/* Display Ads */}
        {ads && (
          <section className="liquid-glass rounded-3xl p-5 sm:p-6">
            <div className="relative z-[1]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">📺 Display Ads</h2>
                <button
                  onClick={() => toggleAd()}
                  disabled={saving === 'ad-master'}
                  className={cn(
                    'inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold transition-all',
                    ads.enabled
                      ? 'bg-foreground text-background'
                      : 'border border-foreground/15 bg-foreground/[0.02] text-foreground/70'
                  )}
                >
                  {ads.enabled ? '🟢 ON' : '🔴 OFF'}
                </button>
              </div>
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Provider</span>
                <button
                  onClick={cycleAdProvider}
                  disabled={saving === 'ad-provider'}
                  className="text-xs font-medium underline-offset-4 hover:underline"
                >
                  {ads.provider} →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(ads.slots).map(([zone, cfg]) => (
                  <button
                    key={zone}
                    onClick={() => toggleAd(zone)}
                    disabled={saving === zone}
                    className={cn(
                      'rounded-2xl border px-3 py-2.5 text-xs font-medium transition-all',
                      cfg.enabled
                        ? 'border-foreground/20 bg-foreground/[0.06]'
                        : 'border-foreground/10 bg-foreground/[0.02]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{zone.replace(/_/g, ' ')}</span>
                      {cfg.enabled ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-40" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Link Shortener */}
        {shortener && (
          <section className="liquid-glass rounded-3xl p-5 sm:p-6">
            <div className="relative z-[1]">
              <h2 className="mb-4 text-sm font-semibold text-muted-foreground">🔗 Link Shortener</h2>
              <div className="space-y-3">
                <ToggleRow
                  label="📨 Telegram links"
                  desc={shortener.telegramShortener === 'clean' ? 'Clean (is.gd, no ads)' : 'Off (full URL)'}
                  on={shortener.telegramShortener === 'clean'}
                  onClick={() => toggleShortener('telegram')}
                  disabled={saving === 'short-telegram'}
                />
                <ToggleRow
                  label="🌐 Website ads"
                  desc={shortener.websiteAds.enabled ? `On — ShrinkMe every ${shortener.websiteAds.everyN}ᵗʰ click` : 'Off (direct to Udemy)'}
                  on={shortener.websiteAds.enabled}
                  onClick={() => toggleShortener('websiteAds')}
                  disabled={saving === 'short-websiteAds'}
                />
                {shortener.websiteAds.enabled && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[8, 5, 3, 1].map(n => (
                      <button
                        key={n}
                        onClick={() => setFreq(n)}
                        disabled={saving === 'short-freq'}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                          shortener.websiteAds.everyN === n
                            ? 'bg-foreground text-background'
                            : 'border border-foreground/15 bg-foreground/[0.02]'
                        )}
                      >
                        {n === 1 ? 'Every link' : `Every ${n}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Toast */}
        {toast && (
          <div className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] rounded-full px-5 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md',
            toast.ok ? 'bg-foreground/90 text-background' : 'bg-destructive/90 text-white'
          )}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function ToggleRow({ label, desc, on, onClick, disabled }: {
  label: string; desc: string; on: boolean; onClick: () => void; disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          on ? 'bg-foreground' : 'bg-foreground/15'
        )}
      >
        <span className={cn(
          'inline-block size-4 transform rounded-full bg-background transition-transform',
          on ? 'translate-x-6' : 'translate-x-1'
        )} />
      </button>
    </div>
  )
}

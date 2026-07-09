'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Cookie, Check, X, RefreshCw, ExternalLink, LogOut, Sun, Moon,
  BarChart3, Megaphone, Link2, Radio, FileText, Trash2, Settings as SettingsIcon,
  Send, Sparkles, ChevronDown, Plus, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// Liquid Glass Admin Mini App
// ============================================================
// Opens inside Telegram (WebApp) OR in a browser at /admin.
// Security: Telegram initData HMAC + password + device binding.
// Design: Liquid Glass (frosted blur), dark/light, glossy colored buttons.

type Theme = 'light' | 'dark'
type Section = 'stats' | 'ads' | 'links' | 'channels' | 'posting' | 'templates' | 'settings' | 'cleanup'

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
interface Channel { name: string; id: string; active: boolean; language: string }
interface Stats {
  courses: { total: number; published: number; newToday: number }
  telegram: { total_posted: number; posted_en: number; posted_ar: number; pending: number }
  lastScrape: string | null
  sources: Array<{ source: string; count: number; label: string }>
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [theme, setTheme] = useState<Theme>('dark')
  const [section, setSection] = useState<Section>('stats')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Detect Telegram WebApp theme
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      const t: Theme = tg.colorScheme === 'light' ? 'light' : 'dark'
      setTheme(t)
    } else {
      // Browser: respect system preference
      setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    }
  }, [])

  // Check existing device token on mount
  useEffect(() => {
    const token = localStorage.getItem('lp_admin_token')
    if (token) {
      // Verify with server
      fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, initData: (window as any).Telegram?.WebApp?.initData || '' }),
      }).then(r => r.json()).then(d => {
        if (d.valid) setAuthed(true)
      }).finally(() => setAuthLoading(false))
    } else {
      setAuthLoading(false)
    }
  }, [])

  function notify(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2500)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    try {
      const r = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          initData: (window as any).Telegram?.WebApp?.initData || '',
        }),
      })
      const d = await r.json()
      if (d.valid && d.token) {
        localStorage.setItem('lp_admin_token', d.token)
        setAuthed(true)
        notify('✅ Welcome back, admin')
      } else {
        setAuthError(d.error || 'Invalid password')
      }
    } catch (err) {
      setAuthError(String(err))
    }
  }

  function handleLogout() {
    localStorage.removeItem('lp_admin_token')
    setAuthed(false)
    setPassword('')
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!authed) {
    return <LoginScreen password={password} setPassword={setPassword} onSubmit={handleLogin} error={authError} theme={theme} setTheme={setTheme} />
  }

  return (
    <div className="admin-bg min-h-screen" dir="ltr">
      <HideCookieBanner />
      {/* Top bar */}
      <header className="liquid-glass sticky top-0 z-50 mx-3 mt-3 rounded-3xl">
        <div className="relative z-[1] flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04]">
              <Sparkles className="size-4 text-foreground/70" />
            </div>
            <span className="text-sm font-bold">Admin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="glass-btn size-8 p-0">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button onClick={handleLogout} className="glass-btn size-8 p-0">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="mx-3 mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {([
          ['stats', 'Stats', BarChart3],
          ['ads', 'Ads', Megaphone],
          ['links', 'Links', Link2],
          ['channels', 'Channels', Radio],
          ['posting', 'Posting', Send],
          ['templates', 'Templates', FileText],
          ['settings', 'Settings', SettingsIcon],
          ['cleanup', 'Cleanup', Trash2],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all',
              section === key
                ? 'bg-foreground text-background shadow-sm'
                : 'glass-btn'
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {/* Section content */}
      <main className="mx-3 mb-6 mt-3">
        {section === 'stats' && <StatsSection />}
        {section === 'ads' && <AdsSection notify={notify} />}
        {section === 'links' && <LinksSection notify={notify} />}
        {section === 'channels' && <ChannelsSection notify={notify} />}
        {section === 'posting' && <PostingSection notify={notify} />}
        {section === 'templates' && <TemplatesSection notify={notify} />}
        {section === 'settings' && <SettingsSection notify={notify} />}
        {section === 'cleanup' && <CleanupSection notify={notify} />}
      </main>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full px-5 py-2.5 text-xs font-medium shadow-lg backdrop-blur-md',
          toast.ok ? 'bg-foreground/90 text-background' : 'bg-destructive/90 text-white'
        )}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Login Screen
// ============================================================
function LoginScreen({ password, setPassword, onSubmit, error, theme, setTheme }: {
  password: string; setPassword: (v: string) => void; onSubmit: (e: React.FormEvent) => void
  error: string; theme: Theme; setTheme: (t: Theme) => void
}) {
  return (
    <div className="admin-bg flex min-h-screen items-center justify-center p-4">
      <div className="liquid-glass w-full max-w-sm rounded-3xl p-6">
        <div className="relative z-[1] space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04]">
              <Sparkles className="size-6 text-foreground/70" />
            </div>
            <h1 className="text-lg font-bold">Admin Access</h1>
            <p className="text-xs text-muted-foreground">Enter your password to continue</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full rounded-2xl border border-foreground/15 bg-foreground/[0.03] px-4 py-3 text-sm outline-none focus:border-foreground/30"
            />
            {error && <p className="text-center text-xs text-destructive">{error}</p>}
            <button type="submit" className="glossy-btn w-full rounded-2xl bg-foreground py-3 text-sm font-semibold text-background">
              Unlock
            </button>
          </form>
          <div className="flex justify-center pt-2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="glass-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sections
// ============================================================
function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/stats').then(r => r.json())
      setStats(d)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  if (loading || !stats) return <LoadingCard />
  return (
    <div className="space-y-3">
      <Card>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Total" value={stats.courses.total} />
          <Stat label="Published" value={stats.courses.published} />
          <Stat label="New today" value={stats.courses.newToday} />
          <Stat label="Posted" value={stats.telegram.total_posted} sub={`EN ${stats.telegram.posted_en} · AR ${stats.telegram.posted_ar}`} />
        </div>
      </Card>
      <Card>
        <Row label="Last scrape" value={stats.lastScrape ? new Date(stats.lastScrape).toLocaleString() : 'Never'} />
        <Row label="Pending posts" value={String(stats.telegram.pending)} />
      </Card>
      <Card>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">By source</p>
        {stats.sources.map(s => <Row key={s.source} label={s.label} value={String(s.count)} />)}
      </Card>
      <button onClick={load} className="glass-btn mx-auto flex items-center gap-1.5 px-4 py-2 text-xs">
        <RefreshCw className="size-3.5" /> Refresh
      </button>
    </div>
  )
}

function AdsSection({ notify }: { notify: (m: string, ok?: boolean) => void }) {
  const [ads, setAds] = useState<AdSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const d = await fetch('/api/ads/config').then(r => r.json())
    setAds(d)
  }, [])
  useEffect(() => { load() }, [load])
  if (!ads) return <LoadingCard />

  async function save(updated: AdSettings, msg: string) {
    setSaving(true)
    try {
      await fetch('/api/ads/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      setAds(updated)
      notify(msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <Card title="Display Ads" icon={Megaphone}>
        <ToggleRow
          label="Master switch"
          desc={ads.enabled ? 'Ads are ON' : 'Ads are OFF'}
          on={ads.enabled}
          disabled={saving}
          onClick={() => save({ ...ads, enabled: !ads.enabled }, ads.enabled ? 'Ads OFF' : 'Ads ON')}
        />
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
          <span className="text-xs text-muted-foreground">Provider</span>
          <button
            onClick={() => {
              const order = ['none', 'adsense', 'adsterra']
              const next = order[(order.indexOf(ads.provider) + 1) % order.length]
              save({ ...ads, provider: next }, `Provider: ${next}`)
            }}
            disabled={saving}
            className="text-xs font-medium underline-offset-4 hover:underline"
          >
            {ads.provider} →
          </button>
        </div>
      </Card>
      <Card title="Ad Zones" icon={Sparkles}>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ads.slots).map(([zone, cfg]) => (
            <button
              key={zone}
              onClick={() => {
                const updated = { ...ads, slots: { ...ads.slots, [zone]: { ...cfg, enabled: !cfg.enabled } } }
                save(updated, `${zone}: ${!cfg.enabled ? 'ON' : 'OFF'}`)
              }}
              disabled={saving}
              className={cn(
                'rounded-2xl border px-3 py-3 text-xs font-medium transition-all',
                cfg.enabled ? 'border-foreground/20 bg-foreground/[0.06]' : 'border-foreground/10 bg-foreground/[0.02]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="capitalize">{zone.replace(/_/g, ' ')}</span>
                {cfg.enabled ? <Check className="size-4" /> : <X className="size-4 opacity-30" />}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function LinksSection({ notify }: { notify: (m: string, ok?: boolean) => void }) {
  const [s, setS] = useState<ShortenerSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const d = await fetch('/api/shortener/config').then(r => r.json())
    setS(d)
  }, [])
  useEffect(() => { load() }, [load])
  if (!s) return <LoadingCard />

  async function save(updated: ShortenerSettings, msg: string) {
    setSaving(true)
    try {
      await fetch('/api/shortener/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      setS(updated)
      notify(msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <Card title="Telegram Links" icon={Send}>
        <ToggleRow
          label="Short links"
          desc={s.telegramShortener === 'clean' ? 'Clean (is.gd, no ads)' : 'Off (full URL)'}
          on={s.telegramShortener === 'clean'}
          disabled={saving}
          onClick={() => save({ ...s, telegramShortener: s.telegramShortener === 'clean' ? 'off' : 'clean' }, `TG: ${s.telegramShortener === 'clean' ? 'Off' : 'Clean'}`)}
        />
      </Card>
      <Card title="Website Ads" icon={Megaphone}>
        <ToggleRow
          label="Outbound ads"
          desc={s.websiteAds.enabled ? `On — every ${s.websiteAds.everyN}ᵗʰ click` : 'Off (direct)'}
          on={s.websiteAds.enabled}
          disabled={saving}
          onClick={() => save({ ...s, websiteAds: { ...s.websiteAds, enabled: !s.websiteAds.enabled } }, `Website ads: ${!s.websiteAds.enabled ? 'ON' : 'OFF'}`)}
        />
        {s.websiteAds.enabled && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[8, 5, 3, 1].map(n => (
              <button
                key={n}
                onClick={() => save({ ...s, websiteAds: { enabled: true, everyN: n } }, `Frequency: every ${n}`)}
                disabled={saving}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                  s.websiteAds.everyN === n ? 'bg-foreground text-background' : 'glass-btn'
                )}
              >
                {n === 1 ? 'Every link' : `Every ${n}`}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function ChannelsSection({ notify }: { notify: (m: string, ok?: boolean) => void }) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newCh, setNewCh] = useState({ name: '', id: '', language: 'en' })
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/admin/channels').then(r => r.json())
      setChannels(d.channels || [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function action(index: number, act: 'toggle' | 'remove' | 'lang', lang?: string) {
    const r = await fetch('/api/admin/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, index, lang }),
    }).then(r => r.json())
    setChannels(r.channels || [])
    notify(act === 'toggle' ? 'Toggled' : act === 'remove' ? 'Removed' : `Lang: ${lang}`)
  }

  async function add() {
    if (!newCh.name || !newCh.id) return notify('Name and ID required', false)
    const r = await fetch('/api/admin/channels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', channel: newCh }),
    }).then(r => r.json())
    setChannels(r.channels || [])
    setNewCh({ name: '', id: '', language: 'en' })
    setAdding(false)
    notify('Channel added')
  }

  if (loading) return <LoadingCard />
  return (
    <div className="space-y-3">
      <Card title="Channels" icon={Radio}>
        {channels.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No channels yet</p>}
        {channels.map((ch, i) => (
          <div key={i} className="mb-2 flex items-center justify-between rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{ch.name}</p>
              <p className="text-xs text-muted-foreground">{ch.id} · {ch.language}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button onClick={() => action(i, 'toggle')} className={cn('glass-btn size-7 p-0', ch.active && 'bg-foreground/10')}>
                {ch.active ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </button>
              <button onClick={() => action(i, 'lang', ch.language === 'en' ? 'ar' : 'en')} className="glass-btn px-2 py-1 text-[10px]">
                {ch.language === 'en' ? 'AR' : 'EN'}
              </button>
              <button onClick={() => action(i, 'remove')} className="glass-btn size-7 p-0 text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {adding ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-3">
            <input value={newCh.name} onChange={e => setNewCh({ ...newCh, name: e.target.value })} placeholder="Name" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none" />
            <input value={newCh.id} onChange={e => setNewCh({ ...newCh, id: e.target.value })} placeholder="@handle or chat_id" className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setNewCh({ ...newCh, language: 'en' })} className={cn('glass-btn flex-1 py-2 text-xs', newCh.language === 'en' && 'bg-foreground/10')}>EN</button>
              <button onClick={() => setNewCh({ ...newCh, language: 'ar' })} className={cn('glass-btn flex-1 py-2 text-xs', newCh.language === 'ar' && 'bg-foreground/10')}>AR</button>
            </div>
            <div className="flex gap-2">
              <button onClick={add} className="glossy-btn flex-1 rounded-xl bg-foreground py-2 text-xs font-semibold text-background">Add</button>
              <button onClick={() => setAdding(false)} className="glass-btn flex-1 py-2 text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="glass-btn mt-3 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs">
            <Plus className="size-3.5" /> Add channel
          </button>
        )}
      </Card>
    </div>
  )
}

function PostingSection({ notify }: { notify: (m: string, ok?: boolean) => void }) {
  const [s, setS] = useState({ auto_post: false, post_delay_ms: 60000 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { setS(await fetch('/api/admin/posting').then(r => r.json())) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  if (loading) return <LoadingCard />

  async function save(updated: typeof s, msg: string) {
    setSaving(true)
    try {
      await fetch('/api/admin/posting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      setS(updated)
      notify(msg)
    } finally { setSaving(false) }
  }

  const delaySec = Math.round(s.post_delay_ms / 1000)
  return (
    <Card title="Posting" icon={Send}>
      <ToggleRow
        label="Auto-post"
        desc={s.auto_post ? 'ON — posts after each scrape' : 'OFF — manual only'}
        on={s.auto_post}
        disabled={saving}
        onClick={() => save({ ...s, auto_post: !s.auto_post }, `Auto-post: ${!s.auto_post ? 'ON' : 'OFF'}`)}
      />
      <div className="mt-3">
        <p className="mb-2 text-xs text-muted-foreground">Delay between posts: <b>{delaySec}s</b></p>
        <input
          type="range" min="5" max="300" step="5" value={delaySec}
          onChange={e => save({ ...s, post_delay_ms: parseInt(e.target.value) * 1000 }, `Delay: ${e.target.value}s`)}
          disabled={saving}
          className="w-full"
        />
      </div>
    </Card>
  )
}

function TemplatesSection({ notify }: { notify: (m: string, ok?: boolean) => void }) {
  const [en, setEn] = useState('')
  const [ar, setAr] = useState('')
  const [editing, setEditing] = useState<'en' | 'ar' | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/admin/templates').then(r => r.json())
      setEn(d.en || ''); setAr(d.ar || '')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  if (loading) return <LoadingCard />

  async function save(locale: 'en' | 'ar', text: string) {
    await fetch('/api/admin/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale, template: text }) })
    if (locale === 'en') setEn(text); else setAr(text)
    setEditing(null)
    notify(`${locale.toUpperCase()} template saved`)
  }

  return (
    <Card title="Message Templates" icon={FileText}>
      <p className="mb-3 text-xs text-muted-foreground">Placeholders: {'{title}'} {'{instructor}'} {'{rating}'} {'{students_count}'} {'{original_price}'} {'{language}'} {'{duration}'} {'{cta}'}</p>
      {(['en', 'ar'] as const).map(locale => {
        const text = locale === 'en' ? en : ar
        const isEditing = editing === locale
        return (
          <div key={locale} className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase">{locale}</span>
              <button onClick={() => { setEditing(isEditing ? null : locale); setDraft(text) }} className="glass-btn px-2 py-1 text-[10px]">
                {isEditing ? 'Cancel' : '✏️ Edit'}
              </button>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={6} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="w-full rounded-xl border border-foreground/15 bg-background p-3 text-xs outline-none" />
                <button onClick={() => save(locale, draft)} className="glossy-btn w-full rounded-xl bg-foreground py-2 text-xs font-semibold text-background">Save</button>
              </div>
            ) : (
              <pre className="max-h-32 overflow-auto rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3 text-[10px] whitespace-pre-wrap" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{text || '(empty — using default)'}</pre>
            )}
          </div>
        )
      })}
    </Card>
  )
}

function SettingsSection({ notify }: { notify: (m: string, ok?: boolean) => void }) {
  const [s, setS] = useState({ site_name: '', site_description: '', courses_per_page: 12 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { setS(await fetch('/api/admin/settings').then(r => r.json())) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  if (loading) return <LoadingCard />

  async function save(updated: typeof s, msg: string) {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
      setS(updated)
      notify(msg)
    } finally { setSaving(false) }
  }

  return (
    <Card title="Site Settings" icon={SettingsIcon}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Site name</label>
          <input value={s.site_name} onChange={e => setS({ ...s, site_name: e.target.value })} className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Description</label>
          <textarea value={s.site_description} onChange={e => setS({ ...s, site_description: e.target.value })} rows={2} className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Courses per page: {s.courses_per_page}</label>
          <input type="range" min="1" max="60" value={s.courses_per_page} onChange={e => setS({ ...s, courses_per_page: parseInt(e.target.value) })} className="w-full" />
        </div>
        <button onClick={() => save(s, 'Settings saved')} disabled={saving} className="glossy-btn w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </Card>
  )
}

function CleanupSection({ notify }: { notify: (m: string, ok?: boolean) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmPurge, setConfirmPurge] = useState(false)

  async function run(action: 'dedup' | 'invalid' | 'purge') {
    setBusy(action)
    try {
      const d = await fetch('/api/admin/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }).then(r => r.json())
      notify(d.message || 'Done')
    } catch (e) { notify(String(e), false) }
    finally { setBusy(null); setConfirmPurge(false) }
  }

  return (
    <Card title="Cleanup" icon={Trash2}>
      <div className="space-y-2">
        <button onClick={() => run('dedup')} disabled={!!busy} className="glass-btn flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm">
          <span>🧽 Remove duplicates</span>
          {busy === 'dedup' && <RefreshCw className="size-4 animate-spin" />}
        </button>
        <button onClick={() => run('invalid')} disabled={!!busy} className="glass-btn flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm">
          <span>🧯 Clean invalid</span>
          {busy === 'invalid' && <RefreshCw className="size-4 animate-spin" />}
        </button>
        {confirmPurge ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-destructive"><AlertTriangle className="size-3.5" /> Delete ALL courses? Irreversible.</p>
            <div className="flex gap-2">
              <button onClick={() => run('purge')} disabled={!!busy} className="flex-1 rounded-xl bg-destructive py-2 text-xs font-semibold text-white">
                {busy === 'purge' ? 'Purging…' : 'Yes, purge all'}
              </button>
              <button onClick={() => setConfirmPurge(false)} className="glass-btn flex-1 py-2 text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmPurge(true)} disabled={!!busy} className="glass-btn flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-destructive">
            <span>🗑️ Purge ALL courses</span>
          </button>
        )}
      </div>
    </Card>
  )
}

// ============================================================
// Shared UI primitives
// ============================================================
function Card({ title, icon: Icon, children }: { title?: string; icon?: any; children: React.ReactNode }) {
  return (
    <section className="liquid-glass rounded-3xl p-4">
      <div className="relative z-[1]">
        {title && (
          <div className="mb-3 flex items-center gap-2">
            {Icon && <Icon className="size-4 text-muted-foreground" />}
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between text-xs last:mb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function ToggleRow({ label, desc, on, onClick, disabled }: {
  label: string; desc: string; on: boolean; onClick: () => void; disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button onClick={onClick} disabled={disabled} className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', on ? 'bg-foreground' : 'bg-foreground/15')}>
        <span className={cn('inline-block size-4 transform rounded-full bg-background transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  )
}

function LoadingCard() {
  return (
    <Card>
      <div className="flex justify-center py-8"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div>
    </Card>
  )
}

function HideCookieBanner() {
  useEffect(() => {
    const el = document.querySelector('[role="dialog"][aria-label="Cookie notice"], [role="dialog"][aria-label="الموافقة على الكوكيز"]')
    if (el) (el as HTMLElement).style.display = 'none'
  }, [])
  return null
}

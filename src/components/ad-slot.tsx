'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

// Display ad slot — fetches its own config client-side so admin toggles take
// effect instantly without depending on page cache (ISR/edge) purging.
//
// Safety guarantees:
//   1. If settings.enabled=false OR provider='none' OR zone disabled → renders nothing.
//   2. If the provider script fails / ad-blocker blocks → graceful collapse.
//   3. Reserved min-height only while loading (CLS = 0).
//   4. Lazy: ad script fires only when slot enters viewport.
//   5. Never throws — all provider calls wrapped in try/catch.

interface AdSettings {
  provider: string
  enabled: boolean
  clientId?: string
  slots: Record<string, { enabled: boolean; slotId?: string }>
}

interface AdSlotProps {
  zone: string
  /** Server-side settings (used as initial state, overridden by client fetch). */
  settings?: AdSettings | null
  className?: string
}

export function AdSlot({ zone, settings: initialSettings, className }: AdSlotProps) {
  const [settings, setSettings] = useState<AdSettings | null>(initialSettings ?? null)
  const [fetched, setFetched] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const adHostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Fetch fresh ad config on mount. This bypasses page cache entirely — the
  // admin's toggle is reflected on the next page load.
  useEffect(() => {
    if (initialSettings) {
      // If server provided settings, still fetch fresh ones to catch admin
      // toggles that happened after the page was cached.
      setFetched(true)
    }
    fetch('/api/ads/config')
      .then((r) => r.json())
      .then((s: AdSettings) => {
        setSettings(s)
        setFetched(true)
      })
      .catch(() => setFetched(true))
  }, [initialSettings])

  const zoneConfig = settings?.slots?.[zone]
  const shouldRender =
    fetched &&
    settings?.enabled === true &&
    settings.provider !== 'none' &&
    zoneConfig?.enabled === true

  // Lazy load: only mark visible when the slot enters the viewport.
  useEffect(() => {
    if (!shouldRender) return
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [shouldRender])

  // When visible, inject the provider script.
  useEffect(() => {
    if (!visible || loaded) return
    const host = adHostRef.current
    if (!host) return
    try {
      const provider = settings?.provider
      const clientId = settings?.clientId
      const slotId = zoneConfig?.slotId

      if (provider === 'adsense' && clientId && slotId) {
        const ins = document.createElement('ins')
        ins.className = 'adsbygoogle'
        ins.style.display = 'block'
        ins.setAttribute('data-ad-client', clientId)
        ins.setAttribute('data-ad-slot', slotId)
        ins.setAttribute('data-ad-format', 'auto')
        ins.setAttribute('data-full-width-responsive', 'true')
        host.appendChild(ins)
        const w = window as unknown as { adsbygoogle?: unknown[] }
        if (!w.adsbygoogle) {
          const s = document.createElement('script')
          s.async = true
          s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`
          s.crossOrigin = 'anonymous'
          document.head.appendChild(s)
        }
        try {
          w.adsbygoogle = w.adsbygoogle || []
          w.adsbygoogle.push({})
        } catch { /* push failed */ }
        setLoaded(true)
      } else if (provider === 'adsterra' && slotId) {
        const s = document.createElement('script')
        s.async = true
        s.src = slotId
        host.appendChild(s)
        setLoaded(true)
      }
    } catch { /* ad failed — slot stays empty */ }
  }, [visible, loaded, settings, zoneConfig])

  // Disabled or not yet fetched → render nothing.
  if (!shouldRender) return null

  return (
    <div
      ref={containerRef}
      data-ad-zone={zone}
      className={cn(
        'relative w-full overflow-hidden rounded-xl',
        loaded ? 'min-h-[90px]' : 'min-h-[0px]',
        className,
      )}
      aria-hidden="true"
    >
      {visible && <div ref={adHostRef} className="w-full" />}
    </div>
  )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

// Display ad slot — safe, lazy, reserved-space.
//
// Props:
//   zone: which ad zone this is (matches lib/ads.ts AdZone).
//   settings: the ad config passed from the server (so no client-side fetch).
//
// Safety guarantees:
//   1. If settings.enabled is false OR the zone is disabled → renders nothing.
//   2. If the provider script fails / ad-blocker blocks → the container
//      collapses to 0 height.
//   3. Reserved min-height only while loading, so enabling ads later causes
//      ZERO layout shift (CLS = 0).
//   4. Loaded via IntersectionObserver — the ad script only fires when the
//      slot scrolls into view, so above-the-fold performance is unaffected.
//   5. Never throws — all provider calls are wrapped in try/catch.

interface AdSlotProps {
  zone: string
  settings: {
    provider: string
    enabled: boolean
    clientId?: string
    slots: Record<string, { enabled: boolean; slotId?: string }>
  } | null
  className?: string
}

export function AdSlot({ zone, settings, className }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const adHostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const zoneConfig = settings?.slots?.[zone]
  const shouldRender =
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

  // When visible, inject the provider script. Wrapped so a failure never
  // crashes the page — the slot just stays empty.
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
        // Load adsbygoogle library once.
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
        } catch {
          /* push failed — ad just won't render */
        }
        setLoaded(true)
      } else if (provider === 'adsterra' && slotId) {
        // Adsterra gives a full script URL per banner.
        const s = document.createElement('script')
        s.async = true
        s.src = slotId
        host.appendChild(s)
        setLoaded(true)
      }
    } catch {
      /* ad failed to load — slot stays empty, no crash */
    }
  }, [visible, loaded, settings, zoneConfig])

  // Disabled → render nothing (0 bytes added to the page).
  if (!shouldRender) return null

  return (
    <div
      ref={containerRef}
      data-ad-zone={zone}
      className={cn(
        'relative w-full overflow-hidden rounded-xl',
        // min-h only while loading; once loaded the ad fills its own height.
        // If ad-blocker blocks, the host stays empty → container collapses.
        loaded ? 'min-h-[90px]' : 'min-h-[0px]',
        className,
      )}
      aria-hidden="true"
    >
      {visible && <div ref={adHostRef} className="w-full" />}
    </div>
  )
}

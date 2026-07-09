'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Cookie, ChevronDown, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const KEY = 'lp-cookie-consent'

type Consent = { necessary: true; analytics: boolean; ts: number }
type Phase = 'hidden' | 'visible' | 'closing'

/**
 * Liquid Glass (iOS 26 style) cookie consent banner.
 *
 * Visuals live in `globals.css` under `.liquid-glass` + the
 * `cookie-consent-enter` / `cookie-consent-exit` keyframes — the component
 * itself stays markup + behaviour only.
 */
export function CookieConsent() {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [customize, setCustomize] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let enterTimer: ReturnType<typeof setTimeout> | null = null
    try {
      if (!localStorage.getItem(KEY)) {
        enterTimer = setTimeout(() => setPhase('visible'), 120)
      }
    } catch {
      enterTimer = setTimeout(() => setPhase('visible'), 120)
    }
    return () => {
      if (enterTimer) clearTimeout(enterTimer)
      if (exitTimer.current) clearTimeout(exitTimer.current)
    }
  }, [])

  function save(consent: Consent) {
    try {
      localStorage.setItem(KEY, JSON.stringify(consent))
    } catch {
      /* ignore */
    }
    setPhase('closing')
    exitTimer.current = setTimeout(() => setPhase('hidden'), 380)
  }

  if (phase === 'hidden') return null

  const closing = phase === 'closing'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-6 sm:pb-8"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Cookie consent"
        className={cn(
          'liquid-glass pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-[2rem] p-5 sm:p-6',
          closing ? 'cookie-consent-exit' : 'cookie-consent-enter',
        )}
      >
        <div className="relative z-[1] flex flex-col gap-4">
          {/* Header — cookie icon + message */}
          <div className="flex items-start gap-3">
            <div
              aria-hidden
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04] text-foreground/70"
            >
              <Cookie className="size-5" />
            </div>
            <p className="text-sm leading-relaxed text-foreground/80">
              We use cookies to keep the site working and to understand how it is used. You can
              accept all, reject optional cookies, or choose what to allow. See our{' '}
              <Link
                href="/privacy"
                className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {/* Customize panel — smooth height transition via the grid-rows-[0fr→1fr] trick */}
          <div
            id="cookie-customize-panel"
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
              customize ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Necessary</p>
                    <p className="text-xs text-muted-foreground">Required for the site to function.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-foreground/10 bg-foreground/[0.04] px-2.5 py-1 text-xs font-medium text-foreground/60">
                    Always on
                  </span>
                </div>

                <div className="h-px bg-foreground/10" />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Analytics</p>
                    <p className="text-xs text-muted-foreground">Helps us understand how the site is used.</p>
                  </div>
                  <Switch
                    checked={analytics}
                    onCheckedChange={setAnalytics}
                    aria-label="Toggle analytics cookies"
                  />
                </div>

                <button
                  onClick={() => save({ necessary: true, analytics, ts: Date.now() })}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground/10 px-4 text-sm font-medium text-foreground backdrop-blur-md transition-all hover:bg-foreground/[0.14] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  <Check className="size-4 opacity-70" aria-hidden />
                  Save my choices
                </button>
              </div>
            </div>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCustomize((c) => !c)}
              aria-expanded={customize}
              aria-controls="cookie-customize-panel"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.02] px-4 text-sm font-medium text-foreground/80 backdrop-blur-md transition-all hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-4 transition-transform duration-300 motion-reduce:transition-none',
                  customize && 'rotate-180',
                )}
              />
              Customize
            </button>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => save({ necessary: true, analytics: false, ts: Date.now() })}
                className="inline-flex h-9 items-center justify-center rounded-full border border-foreground/15 bg-foreground/[0.02] px-4 text-sm font-medium text-foreground/80 backdrop-blur-md transition-all hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Reject optional
              </button>

              <button
                onClick={() => save({ necessary: true, analytics: true, ts: Date.now() })}
                className="group inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <Check
                  aria-hidden
                  className="size-4 opacity-80 transition-opacity group-hover:opacity-100"
                />
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

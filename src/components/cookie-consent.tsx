'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cookie, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

const KEY = 'lp-cookie-consent'

type Consent = { necessary: true; analytics: boolean; ts: number }
type Phase = 'hidden' | 'visible' | 'closing'

// Bilingual strings. Vercel Analytics is cookie-free (privacy-friendly), so
// the banner is a simple accept/dismiss — no Analytics toggle needed. The
// "analytics" flag in storage is kept true (Vercel runs regardless) for
// forward compatibility if GA4 is added later.
const T = {
  en: {
    dir: 'ltr' as const,
    message: 'We use essential cookies to keep the site working. Our analytics is privacy-friendly and cookie-free. See our',
    privacy: 'Privacy Policy',
    accept: 'Got it',
    dismiss: 'Dismiss',
  },
  ar: {
    dir: 'rtl' as const,
    message: 'نستخدم ملفات تعريف الارتباط الأساسية لتشغيل الموقع. تحليلاتنا تحترم الخصوصية ولا تستخدم كوكيز. اطّلع على',
    privacy: 'سياسة الخصوصية',
    accept: 'حسناً',
    dismiss: 'إغلاق',
  },
}

function detectLocale(pathname: string | null): Locale {
  if (!pathname) return 'en'
  return pathname.startsWith('/ar') ? 'ar' : 'en'
}

/**
 * Liquid Glass (iOS 26 style) cookie consent banner — bilingual (EN/AR).
 * Simplified: Vercel Analytics is cookie-free, so no Analytics toggle.
 * Two actions only: accept (saves consent) / dismiss (also saves, same effect).
 */
export function CookieConsent() {
  const pathname = usePathname()
  const locale = detectLocale(pathname)
  const t = T[locale]
  const dir = t.dir

  const [phase, setPhase] = useState<Phase>('hidden')
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
  const privacyHref = locale === 'ar' ? '/ar/privacy' : '/en/privacy'

  return (
    <div
      dir={dir}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-4 pb-6 sm:pb-8"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-label={locale === 'ar' ? 'إشعار الكوكيز' : 'Cookie notice'}
        className={cn(
          'liquid-glass pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-[2rem] p-5 sm:p-6',
          closing ? 'cookie-consent-exit' : 'cookie-consent-enter',
        )}
      >
        <div className="relative z-[1] flex flex-col gap-4">
          {/* Header — cookie icon + message + dismiss */}
          <div className="flex items-start gap-3">
            <div
              aria-hidden
              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.04] text-foreground/70"
            >
              <Cookie className="size-5" />
            </div>
            <p className="flex-1 text-sm leading-relaxed text-foreground/80">
              {t.message}{' '}
              <Link
                href={privacyHref}
                className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t.privacy}
              </Link>
              .
            </p>
            <button
              onClick={() => save({ necessary: true, analytics: true, ts: Date.now() })}
              aria-label={t.dismiss}
              className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/[0.02] text-foreground/60 transition-all hover:bg-foreground/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Action row — single primary button */}
          <button
            onClick={() => save({ necessary: true, analytics: true, ts: Date.now() })}
            className="group inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Check
              aria-hidden
              className="size-4 opacity-80 transition-opacity group-hover:opacity-100"
            />
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  )
}

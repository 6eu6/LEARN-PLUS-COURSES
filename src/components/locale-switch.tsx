'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Check } from 'lucide-react'
import type { Locale } from '@/lib/i18n'

// Header language switcher: a globe icon that opens a dropdown listing the
// available locales (EN / AR). Tapping one navigates to the same page in the
// other language. Closes on outside click or Escape.
export function LocaleSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const other: Locale = locale === 'ar' ? 'en' : 'ar'
  const swapped = (pathname || `/${locale}`).replace(/^\/(en|ar)(?=\/|$)/, `/${other}`)
  const otherHref = swapped.startsWith(`/${other}`) ? swapped : `/${other}`

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const locales: Array<{ code: Locale; label: string; native: string }> = [
    { code: 'en', label: 'English', native: 'EN' },
    { code: 'ar', label: 'العربية', native: 'AR' },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Switch language"
        aria-expanded={open}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Globe className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-50 w-32 overflow-hidden rounded-md border bg-popover shadow-md"
          role="menu"
        >
          {locales.map(l => {
            const isCurrent = l.code === locale
            const target = (pathname || `/${locale}`).replace(/^\/(en|ar)(?=\/|$)/, `/${l.code}`)
            const href = target.startsWith(`/${l.code}`) ? target : `/${l.code}`
            return (
              <Link
                key={l.code}
                href={href}
                hrefLang={l.code}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted"
                role="menuitem"
              >
                <span>{l.label}</span>
                <span className="text-[10px] text-muted-foreground">{l.native}</span>
                {isCurrent && <Check className="h-3 w-3 text-foreground" />}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

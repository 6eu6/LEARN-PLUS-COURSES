'use client'

import { useEffect, useState } from 'react'

export function TimedReveal({
  seconds,
  loadingText,
  countdownText = 'Please wait {n}s…',
  buttonText,
  href,
  external = false,
}: {
  seconds: number
  loadingText: string
  countdownText?: string
  buttonText: string
  href: string
  external?: boolean
}) {
  const [remaining, setRemaining] = useState(Math.max(0, seconds))

  useEffect(() => {
    if (seconds <= 0) {
      setRemaining(0)
      return
    }

    setRemaining(seconds)
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return value - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [seconds])

  if (remaining > 0) {
    const progress = Math.round(((seconds - remaining) / seconds) * 100)
    return (
      <div className="w-full space-y-3 rounded-lg border bg-card p-4 text-center" aria-live="polite">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
          <span>{loadingText}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {countdownText.replace('{n}', String(remaining))}
        </p>
      </div>
    )
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex w-full items-center justify-center rounded-lg bg-green-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-700"
    >
      {buttonText}
    </a>
  )
}

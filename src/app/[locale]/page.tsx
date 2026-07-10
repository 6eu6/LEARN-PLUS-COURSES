import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomeClient } from '@/components/home-client'
import { isSupportedLocale } from '@/lib/i18n'
import { makeT } from '@/lib/locale-text'
import { getAdSettings } from '@/lib/ads'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.learn-plus.uk'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isSupportedLocale(locale)) return {}
  const t = makeT(locale)
  const title = `${t('siteName')} — ${t('siteTagline')}`
  return {
    title,
    description: t('footerDesc'),
    alternates: {
      canonical: `${SITE}/${locale}`,
      languages: {
        en: `${SITE}/en`,
        ar: `${SITE}/ar`,
        'x-default': `${SITE}/en`,
      },
    },
    openGraph: {
      title,
      description: t('footerDesc'),
      url: `${SITE}/${locale}`,
      siteName: 'Learn Plus Courses',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: t('footerDesc'),
    },
  }
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isSupportedLocale(locale)) notFound()
  // Load ad config on the server (cached) and pass to the client. When ads
  // are disabled, AdSlot renders nothing — zero impact on the page.
  const adSettings = await getAdSettings()
  return <HomeClient locale={locale} basePath={`/${locale}`} adSettings={adSettings} />
}

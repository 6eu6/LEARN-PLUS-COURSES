import { ArrowDown, CircleCheck, ExternalLink, TicketPercent } from 'lucide-react'
import type { Locale } from '@/lib/i18n'

const COPY: Record<Locale, {
  eyebrow: string
  title: string
  description: string
  steps: Array<{ title: string; description: string }>
  note: string
}> = {
  en: {
    eyebrow: 'Coupon access guide',
    title: 'Your Udemy coupon is just below',
    description: 'Review the course details, then scroll down to open the coupon on Udemy.',
    steps: [
      { title: 'Scroll down', description: 'Read the course information and requirements.' },
      { title: 'Open the Udemy coupon', description: 'Use the button at the bottom of this page.' },
      { title: 'Confirm the final price', description: 'Make sure Udemy shows 0 before you enrol.' },
    ],
    note: 'Coupons are time-limited and may expire at any moment.',
  },
  ar: {
    eyebrow: 'دليل الوصول إلى الكوبون',
    title: 'كوبون يودمي موجود أسفل الصفحة',
    description: 'راجع معلومات الدورة، ثم مرّر للأسفل لفتح الكوبون على يودمي.',
    steps: [
      { title: 'مرّر للأسفل', description: 'اطّلع على معلومات الدورة ومتطلباتها.' },
      { title: 'افتح كوبون يودمي', description: 'استخدم الزر الموجود في أسفل هذه الصفحة.' },
      { title: 'تأكد من السعر النهائي', description: 'تأكد أن السعر الظاهر على يودمي هو 0 قبل التسجيل.' },
    ],
    note: 'الكوبونات محدودة بوقت وقد تنتهي في أي لحظة.',
  },
}

const ICONS = [ArrowDown, ExternalLink, CircleCheck]

export function EnrollGuide({ locale }: { locale: Locale }) {
  const copy = COPY[locale]

  return (
    <section
      aria-labelledby="coupon-guide-title"
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)]">
        <div className="relative isolate flex min-h-[18rem] flex-col justify-between overflow-hidden bg-foreground p-6 text-background sm:min-h-[21rem] sm:p-8 lg:min-h-[27rem] lg:p-10">
          <div
            aria-hidden
            className="absolute -right-20 -top-24 -z-10 size-72 rounded-full border border-background/10 bg-background/5"
          />
          <div
            aria-hidden
            className="absolute -bottom-36 -left-20 -z-10 size-80 rounded-full border border-background/10 bg-background/5"
          />

          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-3 py-1.5 text-xs font-semibold">
              <TicketPercent className="size-4" aria-hidden />
              {copy.eyebrow}
            </div>
            <h2 id="coupon-guide-title" className="max-w-xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {copy.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-background/75 sm:text-base">
              {copy.description}
            </p>
          </div>

          <div className="mt-8 flex items-center gap-3 text-sm font-bold">
            <span className="flex size-11 items-center justify-center rounded-full bg-background text-foreground shadow-lg">
              <ArrowDown className="size-5" aria-hidden />
            </span>
            <span>{copy.steps[0].title}</span>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 p-5 sm:p-7 lg:p-8">
          {copy.steps.map((step, index) => {
            const Icon = ICONS[index]
            return (
              <div key={step.title} className="flex items-start gap-4 rounded-xl border bg-background p-4 sm:p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                  <Icon className="size-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-bold">{index + 1}. {step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            )
          })}

          <p className="mt-1 rounded-xl bg-muted px-4 py-3 text-xs font-medium leading-5 text-muted-foreground">
            {copy.note}
          </p>
        </div>
      </div>
    </section>
  )
}

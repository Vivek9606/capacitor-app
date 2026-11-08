import { Activity, CalendarDays, MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '../../components/Logo'

/** Phone: single column. Desktop: brand panel on the left, form on the right. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col">
        <Logo light tag="for Physios" />
        <div className="my-auto max-w-[460px]">
          <h2 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em]">Care that continues after the session.</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-white/75">
            Build exercise plans, send prescriptions and confirm bookings on WhatsApp — all under your name. Patients never have to install anything.
          </p>
          <ActivityCards className="mt-10" />
        </div>
        <p className="text-[13px] text-white/50">Works in your browser, on Android and on iPhone.</p>
      </aside>
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-5 pb-6 pt-5 safe-top lg:justify-center lg:py-12">{children}</div>
    </div>
  )
}

export function ActivityCards({ className }: { className?: string }) {
  const rows = [
    { icon: <MessageCircle size={18} />, title: 'Plan sent to Riya', sub: 'Opened on WhatsApp · 2 min ago' },
    { icon: <CalendarDays size={18} />, title: 'Thu, 10:30 AM · Arjun M.', sub: 'Booking confirmed automatically' },
    { icon: <Activity size={18} />, title: '4 of 5 sessions done', sub: 'Adherence this week · on track' },
  ]
  return (
    <div className={className}>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.title} className="flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-ink">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-lime text-lime-ink">{r.icon}</div>
            <div>
              <div className="text-[14px] font-semibold">{r.title}</div>
              <div className="text-[12px] text-muted">{r.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

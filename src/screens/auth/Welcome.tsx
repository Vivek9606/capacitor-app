import { ChevronRight, HeartPulse, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button, Footer } from '../../components/ui'
import { ActivityCards, AuthLayout } from './AuthLayout'

/** The two ways in. Existing accounts just log in; the choice decides the sign-up flow for new numbers. */
export function RoleCards({ onPick }: { onPick: (role: 'physio' | 'patient') => void }) {
  const rows = [
    { role: 'patient' as const, icon: <HeartPulse size={22} />, title: 'I’m a patient', sub: 'Get assessed, matched with a physio, follow your plan' },
    { role: 'physio' as const, icon: <Stethoscope size={22} />, title: 'I’m a physiotherapist', sub: 'Plans, bookings and invoices for your practice' },
  ]
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <button
          key={r.role}
          onClick={() => onPick(r.role)}
          className="pressable group flex items-center gap-3.5 rounded-[20px] border border-line bg-surface p-4 text-left shadow-card cursor-pointer hover:border-brand-line"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">{r.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">{r.title}</span>
            <span className="block text-[13px] leading-snug text-muted">{r.sub}</span>
          </span>
          <ChevronRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}
    </div>
  )
}

// O1 · Welcome
export default function Welcome() {
  const nav = useNavigate()
  return (
    <AuthLayout>
      <Logo className="lg:hidden" />
      <div className="mt-5 bg-hero rounded-[24px] shadow-brand p-4 pt-16 lg:hidden">
        <ActivityCards />
      </div>
      <h1 className="mt-7 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.02em] lg:mt-0">
        <span className="lg:hidden">Care that continues after the session.</span>
        <span className="hidden lg:inline">Welcome to Betterhood</span>
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-muted">Who are you joining as?</p>
      <div className="mt-4">
        <RoleCards onPick={(role) => nav('/login', { state: { intent: role } })} />
      </div>
      <div className="flex-1 lg:hidden" />
      <Footer className="flex flex-col gap-2">
        <Button block variant="ghost" onClick={() => nav('/login', { state: { intent: 'login' } })}>
          I already have an account
        </Button>
        <p className="text-center text-[12px] leading-snug text-faint">Got a link from your physio on WhatsApp? Just open it.</p>
      </Footer>
    </AuthLayout>
  )
}

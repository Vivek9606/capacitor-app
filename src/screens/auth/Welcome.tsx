import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button, Footer } from '../../components/ui'
import { ActivityCards, AuthLayout } from './AuthLayout'

// O1 · Welcome
export default function Welcome() {
  const nav = useNavigate()
  return (
    <AuthLayout>
      <Logo tag="for Physios" className="lg:hidden" />
      <div className="mt-5 rounded-[28px] bg-brand p-4 pt-16 lg:hidden">
        <ActivityCards />
      </div>
      <h1 className="mt-7 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] lg:mt-0">
        <span className="lg:hidden">Care that continues after the session.</span>
        <span className="hidden lg:inline">Welcome to Betterhood</span>
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        <span className="lg:hidden">Build exercise plans, send treatment plans and confirm bookings on WhatsApp — all under your name.</span>
        <span className="hidden lg:inline">Sign up in under a minute with your mobile number. No passwords, no long forms.</span>
      </p>
      <div className="flex-1 lg:hidden" />
      <Footer className="flex flex-col gap-3">
        <Button block onClick={() => nav('/login', { state: { intent: 'signup' } })}>
          Get started — it’s free
        </Button>
        <Button block variant="ghost" onClick={() => nav('/login', { state: { intent: 'login' } })}>
          I already have an account
        </Button>
        <p className="mt-1 text-center text-[13px] leading-snug text-muted">
          Patient? Open the link your physio sent on WhatsApp, or log in with your mobile number.
        </p>
      </Footer>
    </AuthLayout>
  )
}

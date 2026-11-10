import { Info, Lock } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Checkbox, Footer, Input, PageHeader } from '../../components/ui'
import { apiMode } from '../../lib/api'
import { DEMO } from '../../lib/seed'
import { useStore } from '../../lib/store'
import { AuthLayout } from './AuthLayout'

// O2 · Mobile number
export default function Phone() {
  const nav = useNavigate()
  const loc = useLocation()
  const intent = (loc.state as { intent?: string } | null)?.intent ?? 'login'
  const [phone, setPhone] = useState('')
  const store = useStore()
  const [updates, setUpdates] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const digits = phone.replace(/\D/g, '')
  const valid = /^[6-9]\d{9}$/.test(digits)

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError('')
    try {
      await store.requestOtp(digits) // sends the auth_otp WhatsApp template
      nav('/login/verify', { state: { phone: digits, intent, updates, next: (loc.state as { next?: string } | null)?.next } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send the code')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <PageHeader title="Log in or sign up" onBack={() => nav('/welcome')} />
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">What’s your mobile number?</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">We’ll send a one-time code on WhatsApp. No passwords, no long forms.</p>
        <div className="mt-6">
          <Input
            label="Mobile number"
            prefix="+91"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            placeholder="98765 43210"
            maxLength={11}
            value={phone}
            onChange={(e) => {
              setError('')
              setPhone(e.target.value.replace(/[^\d ]/g, ''))
            }}
          />
        </div>
        <div className="mt-4">
          <Checkbox checked={updates} onChange={setUpdates} label="Send me appointment and patient updates on WhatsApp" />
        </div>

        {error && <p className="mt-3 text-[14px] text-danger">{error}</p>}

        {!apiMode && (<div className="mt-6 flex gap-2.5 rounded-xl border border-dashed border-brand-line bg-brand-soft/50 p-3 text-[13px] leading-relaxed text-brand">
          <Info size={16} className="mt-0.5 shrink-0" />
          <div>
            <b>Demo</b> — physio{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => setPhone(DEMO.physioPhone)}>
              {DEMO.physioPhone}
            </button>
            , patient{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => setPhone(DEMO.patientPhone)}>
              {DEMO.patientPhone}
            </button>
            , patient awaiting a physio{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => setPhone(DEMO.soloPatientPhone)}>
              {DEMO.soloPatientPhone}
            </button>
            , or any new number to sign up. OTP is {DEMO.otp}.
          </div>
        </div>)}

        <div className="flex-1 lg:hidden" />
        <Footer>
          <p className="mb-3 flex items-start gap-2 text-[12px] text-muted">
            <Lock size={14} className="mt-0.5 shrink-0" />
            By continuing you agree to Betterhood’s Terms and Privacy Policy.
          </p>
          <Button block type="submit" disabled={!valid || busy}>
            {busy ? 'Sending…' : 'Send OTP'}
          </Button>
        </Footer>
      </form>
    </AuthLayout>
  )
}

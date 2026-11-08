import { MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, cx, Footer, PageHeader } from '../../components/ui'
import { fmtPhone } from '../../lib/logic'
import { apiMode } from '../../lib/api'
import { haptic, isNative, platform } from '../../lib/platform'
import { DEMO } from '../../lib/seed'
import { useStore } from '../../lib/store'
import { AuthLayout } from './AuthLayout'

// O3 · Verify OTP
export default function Otp() {
  const nav = useNavigate()
  const loc = useLocation()
  const state = loc.state as { phone?: string; intent?: string; next?: string } | null
  const store = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [left, setLeft] = useState(30)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const [busy, setBusy] = useState(false)

  // Android app: WhatsApp one-tap / SMS Retriever fills the code. Simulated in demo mode.
  const autoRead = !apiMode && isNative && platform === 'android'
  useEffect(() => {
    if (!autoRead) return
    const t = setTimeout(() => setCode(DEMO.otp), 1800)
    return () => clearTimeout(t)
  }, [autoRead])

  useEffect(() => {
    if (code.length === 6) verify(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (!state?.phone) return <Navigate to="/login" replace />
  const phone = state.phone

  async function verify(c: string) {
    if (busy) return
    setBusy(true)
    try {
      const r = await store.verifyOtp(phone, c)
      haptic('success')
      if ('signup' in r) nav('/setup', { replace: true, state: { phone, signupToken: r.signupToken } })
      else nav(state?.next ?? (r.role === 'physio' ? '/app' : '/me'), { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code didn’t match. Check WhatsApp and try again.')
      setCode('')
      haptic('medium')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError('')
    try {
      await store.requestOtp(phone)
      setLeft(30)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t resend the code')
    }
  }

  return (
    <AuthLayout>
      <PageHeader title="Verify number" />
      <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em]">Enter the 6-digit code</h1>
      <div className="mt-3 flex items-center justify-between text-[15px] text-muted">
        <span>Sent on WhatsApp to {fmtPhone(phone)}</span>
        <button className="font-semibold text-brand cursor-pointer" onClick={() => nav('/login', { state: { intent: state.intent } })}>
          Edit
        </button>
      </div>

      <div className="relative mt-6" onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => {
            setError('')
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-label="One-time code"
          className="absolute inset-0 h-full w-full opacity-0"
        />
        <div className="grid grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cx(
                'grid h-14 place-items-center rounded-xl border bg-surface text-[22px] font-semibold',
                error ? 'border-danger' : i === code.length ? 'border-2 border-brand' : 'border-line',
              )}
            >
              {code[i] ?? ''}
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-[14px] text-danger">{error}</p>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-[14px] text-wa">
          <MessageCircle size={15} />
          {autoRead ? 'Auto-reading code from WhatsApp…' : 'Copy the code from WhatsApp and paste it here'}
        </p>
      )}
      <p className="mt-4 text-[14px] text-muted">
        {left > 0 ? (
          `Resend code in 0:${String(left).padStart(2, '0')}`
        ) : (
          <button className="font-semibold text-brand cursor-pointer" onClick={resend}>
            Resend code
          </button>
        )}
      </p>
      {!apiMode && <p className="mt-6 text-[13px] text-faint">Demo code: {DEMO.otp}</p>}

      <div className="flex-1 lg:hidden" />
      <Footer>
        <Button block disabled={code.length !== 6 || busy} onClick={() => verify(code)}>
          {busy ? 'Verifying…' : 'Verify & continue'}
        </Button>
      </Footer>
    </AuthLayout>
  )
}

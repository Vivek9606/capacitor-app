import { FileText, Lock, PlayCircle, ShieldCheck, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Avatar, Button, Card, Checkbox, cx, Footer } from '../../components/ui'
import { firstName } from '../../lib/logic'
import { haptic } from '../../lib/platform'
import { api, apiMode } from '../../lib/api'
import { useMe, useStore } from '../../lib/store'

/**
 * Patient entry from the WhatsApp "Open my plan" button: /plan/:token
 * Step 1: confirm last 4 digits of the mobile the plan was sent to.
 * Step 2: one-time consent. Then straight into Today — no install, no OTP.
 */
/** What the link page may show before the patient proves who they are — no health details. */
interface LinkPreview {
  patientFirstName: string
  consentGiven: boolean
  physio: { name: string; qualification?: string; area?: string; photo?: string }
  plan?: { weeks: number; daysPerWeek: number; items: number; hasRx: boolean }
}

function useLinkPreview(token: string | undefined): LinkPreview | null | undefined {
  const { db } = useStore()
  const [remote, setRemote] = useState<LinkPreview | null>()
  useEffect(() => {
    if (!apiMode || !token) return
    api<LinkPreview>(`/public/plan-link/${encodeURIComponent(token)}`)
      .then(setRemote)
      .catch(() => setRemote(null))
  }, [token])
  if (apiMode) return remote
  const patient = db.patients.find((p) => p.linkToken === token)
  const physio = patient && db.physios.find((p) => p.id === patient.physioId)
  if (!patient || !physio) return null
  const plan = db.plans.find((p) => p.patientId === patient.id && p.status === 'active')
  return {
    patientFirstName: firstName(patient.name),
    consentGiven: !!patient.consentAt,
    physio: { name: physio.name, qualification: physio.qualification, area: physio.clinic?.area, photo: physio.photo },
    plan: plan && { weeks: plan.weeks, daysPerWeek: plan.daysPerWeek, items: plan.items.length, hasRx: !!plan.rx },
  }
}

export default function PlanLink() {
  const { token } = useParams()
  const nav = useNavigate()
  const store = useStore()
  const { patient: me } = useMe()
  const preview = useLinkPreview(token)
  const [step, setStep] = useState<'verify' | 'consent'>('verify')
  const [digits, setDigits] = useState('')
  const [tries, setTries] = useState(0)
  const [error, setError] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)

  if (preview === undefined)
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )
  if (!preview) return <LinkExpired />
  if (step === 'verify' && me && me.linkToken === token && me.consentAt) return <Navigate to="/me" replace />
  const physio = preview.physio
  const plan = preview.plan

  const check = async () => {
    if (busy || !token) return
    setBusy(true)
    try {
      const r = await store.verifyPlanLink(token, digits)
      haptic('success')
      if (r.consentGiven) nav('/me', { replace: true })
      else setStep('consent')
    } catch (e) {
      haptic('medium')
      setTries((t) => t + 1)
      setError(e instanceof Error ? e.message : 'Those digits don’t match the number this plan was sent to.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col px-5 pb-6 pt-6 safe-top lg:justify-center">
        <Logo />
        <Card className="mt-6 overflow-hidden">
          <div className="bg-brand px-5 py-5 text-white">
            <div className="text-[13px] text-white/70">From {physio.name}, PT</div>
            <div className="mt-1 text-[22px] font-semibold tracking-[-0.01em]">
              {plan ? `Your ${plan.weeks}-week care plan` : 'Your care from ' + firstName(physio.name)}
            </div>
            {plan && (
              <div className="mt-1 text-[13px] text-white/75">
                {plan.items} exercises · {plan.daysPerWeek} days a week{plan.hasRx ? ' · treatment plan included' : ''}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 px-5 py-4">
            <Avatar name={physio.name} photo={physio.photo} size={40} />
            <div className="text-[14px] leading-snug">
              <div className="font-semibold">{physio.name}</div>
              <div className="text-muted">{[physio.qualification, physio.area].filter(Boolean).join(' · ') || 'Physiotherapist'}</div>
            </div>
          </div>
        </Card>

        {step === 'verify' ? (
          <>
            <h1 className="mt-7 text-[24px] font-semibold tracking-[-0.01em]">Hi {preview.patientFirstName}, is this you?</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              To keep your health details private, enter the last 4 digits of the mobile number this plan was sent to.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="text-[18px] font-medium tracking-[0.15em] text-muted">+91 ••••• •</div>
              <input
                value={digits}
                onChange={(e) => {
                  setError('')
                  setDigits(e.target.value.replace(/\D/g, '').slice(0, 4))
                }}
                onKeyDown={(e) => e.key === 'Enter' && digits.length === 4 && check()}
                inputMode="numeric"
                autoFocus
                placeholder="0000"
                aria-label="Last 4 digits"
                className={cx(
                  'h-14 w-[120px] rounded-xl border bg-surface text-center text-[22px] font-semibold tracking-[0.3em] outline-none',
                  error ? 'border-danger' : 'border-line focus:border-brand',
                )}
              />
            </div>
            {error && <p className="mt-3 text-[14px] text-danger">{error}</p>}
            {tries >= 3 && (
              <button className="mt-3 text-[14px] font-semibold text-brand cursor-pointer" onClick={() => nav('/login', { state: { intent: 'login' } })}>
                Log in with a WhatsApp code instead
              </button>
            )}
            {!apiMode && <p className="mt-6 text-[12px] text-faint">Demo: Riya’s number ends in 1223.</p>}
            <div className="flex-1 lg:hidden" />
            <Footer>
              <Button block disabled={digits.length !== 4 || tries >= 5 || busy} onClick={check}>
                {busy ? 'Checking…' : 'Open my plan'}
              </Button>
            </Footer>
          </>
        ) : (
          <>
            <h1 className="mt-7 text-[24px] font-semibold tracking-[-0.01em]">Before you start</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">Here’s what happens with your plan in Betterhood.</p>
            <div className="mt-5 flex flex-col gap-3">
              {[
                { icon: <PlayCircle size={18} />, t: 'Follow your exercises', s: 'Videos and reps for each day’s session' },
                { icon: <TrendingDown size={18} />, t: 'Log how you feel', s: `Your sessions and pain scores are shared with ${firstName(physio.name)}` },
                { icon: <FileText size={18} />, t: 'Keep your treatment plan', s: 'Download it as a PDF any time' },
              ].map((r) => (
                <div key={r.t} className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">{r.icon}</div>
                  <div>
                    <div className="text-[15px] font-semibold">{r.t}</div>
                    <div className="text-[13px] text-muted">{r.s}</div>
                  </div>
                </div>
              ))}
            </div>
            <Card className="mt-6 p-4">
              <Checkbox
                checked={agree}
                onChange={setAgree}
                label={
                  <span className="text-[14px]">
                    I agree to share my exercise progress and pain scores with {physio.name}, and to Betterhood’s{' '}
                    <span className="font-semibold text-brand">Terms</span> and <span className="font-semibold text-brand">Privacy Policy</span>.
                  </span>
                }
              />
            </Card>
            <p className="mt-3 flex items-center gap-2 text-[12px] text-muted">
              <ShieldCheck size={14} /> Only you and your physio can see your health details.
            </p>
            <div className="flex-1 lg:hidden" />
            <Footer>
              <Button
                block
                disabled={!agree}
                onClick={() => {
                  if (me) store.giveConsent(me.id)
                  nav('/me', { replace: true })
                }}
              >
                Agree & start
              </Button>
            </Footer>
          </>
        )}
      </div>
    </div>
  )
}

function LinkExpired() {
  const nav = useNavigate()
  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Lock size={24} />
      </div>
      <h1 className="mt-4 text-[22px] font-semibold">This link has expired</h1>
      <p className="mt-2 text-[15px] text-muted">Ask your physio to resend your plan, or log in with your mobile number.</p>
      <Button className="mt-6" onClick={() => nav('/login', { state: { intent: 'login' } })}>
        Log in with mobile
      </Button>
    </div>
  )
}

import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PracticeModePicker } from '../../components/PracticeModePicker'
import { Button, Chip, Footer, Input, PageHeader, Progress } from '../../components/ui'
import { modeLabels } from '../../lib/practice'
import type { PracticeMode } from '../../lib/types'
import { useStore } from '../../lib/store'
import { AuthLayout } from './AuthLayout'

export const FOCUS_AREAS = ['Orthopaedic', 'Sports', 'Neuro', 'Women’s health', 'Geriatric', 'Paediatric', 'Cardio-pulmonary']

function readRef(): string | undefined {
  try {
    return sessionStorage.getItem('bh-ref') ?? undefined
  } catch {
    return undefined
  }
}

// O4 · Quick setup
export default function Setup() {
  const nav = useNavigate()
  const loc = useLocation()
  const st = loc.state as { phone?: string; signupToken?: string } | null
  const phone = st?.phone
  const { signupPhysio } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [focus, setFocus] = useState<string[]>([])
  const [modes, setModes] = useState<PracticeMode[]>([])

  if (!phone) return <Navigate to="/login" replace />

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const progress = 40 + (name.trim() ? 20 : 0) + (focus.length ? 20 : 0) + (modes.length ? 20 : 0)
  const ready = name.trim().length > 1 && focus.length > 0 && modes.length > 0

  return (
    <AuthLayout>
      <PageHeader title="Quick setup" subtitle="30 seconds · finish the rest later" />
      <Progress value={progress} className="mb-5" />
      <div className="flex flex-col gap-4">
        <Input label="Full name" placeholder="Dr. Ananya Rao" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email (optional)" placeholder="you@clinic.in" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <h3 className="mb-3 mt-6 text-[16px] font-semibold">Your focus areas</h3>
      <div className="flex flex-wrap gap-2">
        {FOCUS_AREAS.map((f) => (
          <Chip key={f} selected={focus.includes(f)} onClick={() => toggle(focus, setFocus, f)}>
            {f}
          </Chip>
        ))}
      </div>
      <h3 className="mt-6 text-[16px] font-semibold">How do you practise?</h3>
      <p className="mb-3 text-[13px] text-muted">Pick all that apply — your booking page and schedule adapt to it.</p>
      <PracticeModePicker value={modes} onChange={setModes} />
      {error && <p className="mt-4 text-[14px] text-danger">{error}</p>}
      <div className="flex-1 lg:hidden" />
      <Footer>
        <Button
          block
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await signupPhysio({ phone, name: name.trim(), email: email.trim(), focusAreas: focus, practiceSettings: modeLabels(modes), practice: { modes }, referredBy: readRef(), signupToken: st?.signupToken })
              nav('/app', { replace: true })
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Couldn’t create your account')
              setBusy(false)
            }
          }}
        >
          {busy ? 'Setting up…' : 'Enter Betterhood'}
        </Button>
      </Footer>
    </AuthLayout>
  )
}

import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Checkbox, Chip, Footer, Input, Label, PageHeader } from '../../components/ui'
import { haptic } from '../../lib/platform'
import { useStore } from '../../lib/store'
import type { Patient } from '../../lib/types'
import { AuthLayout } from './AuthLayout'

const SEX: { v: NonNullable<Patient['sex']>; label: string }[] = [
  { v: 'F', label: 'Female' },
  { v: 'M', label: 'Male' },
  { v: 'O', label: 'Other' },
]

// Patient sign-up (no physio yet) → pain assessment → physio match
export default function PatientSignup() {
  const nav = useNavigate()
  const state = useLocation().state as { phone?: string; signupToken?: string } | null
  const store = useStore()
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Patient['sex']>()
  const [city, setCity] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!state?.phone) return <Navigate to="/welcome" replace />
  const ageN = age ? Number(age) : undefined
  const ready = name.trim().length > 1 && agree && (!ageN || (ageN > 0 && ageN < 121))

  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    setError('')
    try {
      await store.signupPatient({ phone: state.phone!, signupToken: state.signupToken, name: name.trim(), age: ageN, sex, city: city.trim() })
      haptic('success')
      nav('/me/assess', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t create your account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <PageHeader title="About you" onBack={() => nav('/welcome')} />
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">Let’s get you better</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">A few details, then a 5-minute pain assessment. We use it to match you with the right physio near you.</p>
        <div className="mt-6 flex flex-col gap-4">
          <Input label="Your name" autoComplete="name" autoFocus placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
            <Input label="Age" inputMode="numeric" placeholder="32" maxLength={3} value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} />
            <Input label="City" autoComplete="address-level2" placeholder="e.g. Bengaluru" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <Label>Sex</Label>
            <div className="mt-2 flex gap-2">
              {SEX.map((s) => (
                <Chip key={s.v} selected={sex === s.v} onClick={() => setSex(sex === s.v ? undefined : s.v)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <Checkbox
            checked={agree}
            onChange={setAgree}
            label={<span className="text-[14px]">I agree to Betterhood’s Terms and Privacy Policy, and to share my answers with the physio I’m matched with.</span>}
          />
        </div>
        {error && <p className="mt-3 text-[14px] text-danger">{error}</p>}
        <div className="flex-1 lg:hidden" />
        <Footer>
          <Button block type="submit" disabled={!ready || busy}>
            {busy ? 'Creating account…' : 'Continue to assessment'}
          </Button>
        </Footer>
      </form>
    </AuthLayout>
  )
}

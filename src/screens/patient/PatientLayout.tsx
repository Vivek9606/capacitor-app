import { CalendarDays, ClipboardList, House, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Shell, type NavItem } from '../../components/Shell'
import { Avatar, Button, Card, Checkbox } from '../../components/ui'
import { firstName } from '../../lib/logic'
import { useMe, useStore } from '../../lib/store'

const ITEMS: NavItem[] = [
  { to: '/me', label: 'Today', icon: House, end: true },
  { to: '/me/plan', label: 'My plan', icon: ClipboardList },
  { to: '/me/appointments', label: 'Visits', icon: CalendarDays },
  { to: '/me/profile', label: 'Profile', icon: User },
]

const FLOW = [/^\/me\/session/, /^\/me\/rx\//, /^\/me\/ask/, /^\/me\/book/, /^\/me\/(consents|invoices)\//]

export default function PatientLayout() {
  const { patient, physio, session } = useMe()
  const store = useStore()
  const myPhysio = patient && store.db.physios.find((p) => p.id === patient.physioId)

  useEffect(() => {
    if (patient?.consentAt) store.markPlansOpened(patient.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, patient?.consentAt])

  if (!session) return <Navigate to="/welcome" replace />
  if (physio) return <Navigate to="/app" replace />
  if (!patient || !myPhysio) return <Navigate to="/welcome" replace />
  if (!patient.consentAt) return <ConsentGate />

  return (
    <Shell
      items={ITEMS}
      hideTabsOn={(p) => FLOW.some((r) => r.test(p))}
      user={{ name: patient.name, sub: `Patient of Dr. ${firstName(myPhysio.name)}` }}
    />
  )
}

/** Patients who log in with OTP (not via the plan link) give consent here once. */
function ConsentGate() {
  const { patient } = useMe()
  const store = useStore()
  const [agree, setAgree] = useState(false)
  if (!patient) return null
  const physio = store.db.physios.find((p) => p.id === patient.physioId)!
  return (
    <div className="mx-auto flex min-h-full max-w-[480px] flex-col px-5 py-6 safe-top lg:justify-center">
      <Logo />
      <div className="mt-8 flex items-center gap-3">
        <Avatar name={physio.name} photo={physio.photo} />
        <div>
          <div className="text-[13px] text-muted">Your physio</div>
          <div className="font-semibold">{physio.name}</div>
        </div>
      </div>
      <h1 className="mt-6 font-display text-[24px] font-bold">Hi {firstName(patient.name)}, one quick thing</h1>
      <p className="mt-2 text-[15px] text-muted">Your exercise progress and pain scores are shared with your physio so they can adjust your plan.</p>
      <Card className="mt-5 p-4">
        <Checkbox
          checked={agree}
          onChange={setAgree}
          label={<span className="text-[14px]">I agree to share my progress with {physio.name}, and to Betterhood’s Terms and Privacy Policy.</span>}
        />
      </Card>
      <Button block className="mt-6" disabled={!agree} onClick={() => store.giveConsent(patient.id)}>
        Agree & continue
      </Button>
    </div>
  )
}

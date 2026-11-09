import { Activity, Bell, Check, RefreshCw } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Footer, PageHeader } from '../../../components/ui'
import { WhatsAppPreview } from '../../../components/WhatsAppPreview'
import { fmtDay, fmtTime } from '../../../lib/dates'
import { firstName } from '../../../lib/logic'
import { visitPlace } from '../../../lib/practice'
import { useMe, useStore } from '../../../lib/store'

// B3 · Booking confirmed
export default function Confirmed() {
  const { id } = useParams()
  const { db } = useStore()
  const { physio } = useMe()
  const nav = useNavigate()
  const b = db.bookings.find((x) => x.id === id)
  if (!b || !physio) return <Navigate to="/app/schedule" replace />
  const name = firstName(b.patientName)
  const where = b.visitType === 'home_visit' ? 'Home visit' : visitPlace(physio) ?? physio.name
  const remindAt = (() => {
    const [h, m] = b.time.split(':').map(Number)
    const t = h * 60 + m - 120
    return t > 0 ? fmtTime(`${Math.floor(t / 60)}:${t % 60}`) : '2 hrs before'
  })()

  return (
    <Page>
      <PageHeader title="Booking confirmed" close onBack={() => nav('/app/schedule', { replace: true })} />
      <div className="flex items-center gap-3">
        <div className="anim-pop grid h-12 w-12 place-items-center rounded-full bg-ok text-white">
          <Check size={26} strokeWidth={3} />
        </div>
        <div>
          <div className="text-[18px] font-semibold">{b.sendConfirmation ? `Confirmed & sent to ${name}` : 'Booked'}</div>
          <div className="text-[13px] text-muted">{b.sendConfirmation ? `This is what ${name} sees on WhatsApp` : 'No WhatsApp message was sent'}</div>
        </div>
      </div>
      {b.sendConfirmation && (
        <div className="mt-4">
          <WhatsAppPreview onBehalfOf={physio.name} time="now" buttons={['Confirm', 'Reschedule', 'Get directions']}>
            <p>
              Hi {name}, your appointment with {physio.name} is confirmed.
            </p>
            <p className="mt-2 font-semibold">
              {fmtDay(b.date)} · {fmtTime(b.time)}
              <br />
              {where}
            </p>
            <p className="mt-2">Please arrive 10 min early and wear comfortable clothes.</p>
          </WhatsAppPreview>
        </div>
      )}
      <h2 className="mb-3 mt-6 text-[17px] font-semibold">What happens next</h2>
      <div className="flex flex-col gap-3.5 text-[14px]">
        {b.reminder && (
          <div className="flex items-center gap-3">
            <Bell size={18} className="shrink-0 text-muted" /> {remindAt} — automatic reminder with directions
          </div>
        )}
        <div className="flex items-center gap-3">
          <RefreshCw size={18} className="shrink-0 text-muted" /> If {name} taps Reschedule, a request appears on Home
        </div>
        <div className="flex items-center gap-3">
          <Activity size={18} className="shrink-0 text-muted" /> After the visit — prompt to send a care plan
        </div>
      </div>
      <p className="mt-4 text-[12px] text-faint">Demo: messages aren’t really sent. Log in as the patient to tap Confirm or Reschedule.</p>
      <Footer>
        <Button block onClick={() => nav('/app/schedule', { replace: true })}>
          Done
        </Button>
      </Footer>
    </Page>
  )
}

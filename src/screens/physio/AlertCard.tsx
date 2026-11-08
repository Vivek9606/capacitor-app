import { CircleAlert, Inbox, MessageSquare, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cx } from '../../components/ui'
import type { Alert } from '../../lib/alerts'
import { firstName } from '../../lib/logic'
import { openWhatsApp, publicUrl, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

export function AlertCard({ alert }: { alert: Alert }) {
  const nav = useNavigate()
  const store = useStore()
  const { physio } = useMe()
  const tone = alert.kind === 'unopened' || alert.kind === 'missed' || alert.kind === 'reschedule' ? 'accent' : alert.kind === 'request' ? 'warn' : 'brand'
  const bg = { accent: 'bg-accent-soft', warn: 'bg-warn-soft', brand: 'bg-brand-soft/70' }[tone]
  const fg = { accent: 'text-accent', warn: 'text-warn', brand: 'text-brand' }[tone]
  const Icon = { request: Inbox, reschedule: RefreshCw, message: MessageSquare, unopened: CircleAlert, missed: CircleAlert }[alert.kind]

  const nudge = () => {
    const link = alert.patientId ? store.db.patients.find((p) => p.id === alert.patientId)?.linkToken : undefined
    openWhatsApp(
      alert.phone,
      `Hi ${firstName(alert.name)}, this is ${physio?.name}. Just checking in on your exercises — here’s your plan: ${publicUrl(`/plan/${link ?? ''}`)}`,
    )
  }

  return (
    <div className={cx('flex gap-3 rounded-2xl p-4', bg)}>
      <Icon size={19} className={cx('mt-0.5 shrink-0', fg)} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium leading-snug">{alert.title}</div>
        {alert.kind === 'request' ? (
          <>
            <div className="mt-0.5 text-[13px] text-muted">{alert.sub}</div>
            <div className="mt-3 flex gap-2">
              <button
                className="h-9 rounded-full bg-brand px-4 text-[13px] font-semibold text-white cursor-pointer"
                onClick={() => {
                  store.updateBooking(alert.bookingId!, { status: 'confirmed' })
                  toast(`Accepted — ${firstName(alert.name)} gets a WhatsApp confirmation`)
                }}
              >
                Accept
              </button>
              <button
                className="h-9 rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-ink cursor-pointer"
                onClick={() => nav('/app/bookings/new', { state: { rescheduleId: alert.bookingId } })}
              >
                Suggest another time
              </button>
              <button
                className="h-9 px-2 text-[13px] font-semibold text-muted cursor-pointer"
                onClick={() => {
                  store.updateBooking(alert.bookingId!, { status: 'cancelled' })
                  toast('Request declined')
                }}
              >
                Decline
              </button>
            </div>
          </>
        ) : alert.kind === 'reschedule' ? (
          <>
            <div className="mt-0.5 text-[13px] text-muted">{alert.sub}</div>
            <button
              className={cx('mt-1.5 text-[13px] font-semibold cursor-pointer', 'text-wa')}
              onClick={() => nav('/app/bookings/new', { state: { rescheduleId: alert.bookingId } })}
            >
              Pick a new time →
            </button>
          </>
        ) : alert.kind === 'message' ? (
          <button
            className="mt-1 text-[13px] font-semibold text-wa cursor-pointer"
            onClick={() => nav(alert.planId ? `/app/plans/${alert.planId}` : `/app/patients/${alert.patientId}`)}
          >
            Reply →
          </button>
        ) : (
          <button className="mt-1 text-[13px] font-semibold text-wa cursor-pointer" onClick={nudge}>
            {alert.sub}
          </button>
        )}
      </div>
    </div>
  )
}

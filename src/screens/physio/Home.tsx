import { Activity, CalendarDays, ChevronRight, Gift, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { bookingLine, BookingBadge, NotifDot } from '../../components/bits'
import { Page } from '../../components/Shell'
import { Avatar, Card, cx, Empty, IconButton, IconTile, SectionTitle } from '../../components/ui'
import { physioAlerts } from '../../lib/alerts'
import { fmtTime, greeting, today } from '../../lib/dates'
import { firstName, profileCompletion } from '../../lib/logic'
import { useMe, useStore } from '../../lib/store'
import { AlertCard } from './AlertCard'

// H1 · Home
export default function Home() {
  const { physio } = useMe()
  const { db } = useStore()
  const nav = useNavigate()
  if (!physio) return null
  const prof = profileCompletion(physio)
  const t = today()
  const todays = db.bookings
    .filter((b) => b.physioId === physio.id && b.date === t && b.status !== 'cancelled' && b.status !== 'requested')
    .sort((a, b) => a.time.localeCompare(b.time))
  const alerts = physioAlerts(db, physio.id)

  const quick = [
    { icon: <Activity size={19} />, label: 'Care plan + Rx', on: () => nav('/app/patients', { state: { pick: 'plan' } }) },
    { icon: <CalendarDays size={19} />, label: 'New booking', on: () => nav('/app/bookings/new') },
    { icon: <UserPlus size={19} />, label: 'Add patient', on: () => nav('/app/patients/new') },
    { icon: <Gift size={19} />, label: 'Invite a physio', on: () => nav('/app/refer'), accent: true },
  ]

  return (
    <Page wide>
      <header className="flex items-center gap-3">
        <Avatar name={physio.name} photo={physio.photo} size={44} className="lg:hidden" />
        <div className="flex-1">
          <div className="text-[13px] text-muted lg:text-[15px]">{greeting()},</div>
          <div className="text-[20px] font-semibold tracking-[-0.01em] lg:text-[28px]">Dr. {firstName(physio.name)}</div>
        </div>
        <IconButton aria-label="Notifications" onClick={() => nav('/app/notifications')}>
          <NotifDot show={alerts.length > 0} />
        </IconButton>
      </header>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          {prof.next && (
            <div className="rounded-[22px] bg-brand p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="text-[17px] font-semibold">Profile {prof.pct}% complete</div>
                <div className="text-[13px] text-white/80">
                  {prof.done} of {prof.total}
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-accent" style={{ width: `${prof.pct}%` }} />
              </div>
              <p className="mt-3 text-[14px] leading-snug text-white/90">{prof.next.nudge}</p>
              <button
                onClick={() => nav(prof.next!.to)}
                className="mt-3 inline-flex h-9 items-center gap-1 rounded-full bg-white px-3.5 text-[13px] font-semibold text-brand cursor-pointer"
              >
                {prof.next.cta} <ChevronRight size={15} />
              </button>
            </div>
          )}

          <SectionTitle>Quick actions</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {quick.map((q) => (
              <button
                key={q.label}
                onClick={q.on}
                className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left text-[15px] font-medium leading-tight hover:border-brand-line cursor-pointer"
              >
                <IconTile tone={q.accent ? 'accent' : 'brand'}>{q.icon}</IconTile>
                {q.label}
              </button>
            ))}
          </div>

          {alerts.length > 0 && (
            <div className="hidden lg:block">
              <SectionTitle>Needs your attention</SectionTitle>
              <div className="flex flex-col gap-3">
                {alerts.map((a) => (
                  <AlertCard key={a.id} alert={a} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <SectionTitle
            className="lg:mt-0"
            right={
              <Link to="/app/schedule" className="text-[14px] font-semibold text-brand">
                See all
              </Link>
            }
          >
            Today · {todays.length} appointment{todays.length === 1 ? '' : 's'}
          </SectionTitle>
          <div className="flex flex-col gap-3">
            {todays.length === 0 && (
              <Card>
                <Empty icon={<CalendarDays size={20} />} title="No appointments today" body="Book a slot and the patient gets a WhatsApp confirmation." />
              </Card>
            )}
            {todays.map((b) => (
              <Card key={b.id} className="flex items-center gap-4 p-4" onClick={() => (b.patientId ? nav(`/app/patients/${b.patientId}`) : nav('/app/schedule'))}>
                <div className="w-[52px] shrink-0 text-center">
                  <div className="text-[17px] font-semibold leading-none">{fmtTime(b.time).split(' ')[0]}</div>
                  <div className="mt-1 text-[11px] text-muted">{fmtTime(b.time).split(' ')[1]}</div>
                </div>
                <div className="min-w-0 flex-1 border-l border-line pl-4">
                  <div className="truncate text-[15px] font-semibold">{b.patientName}</div>
                  <div className="truncate text-[13px] text-muted">{bookingLine(b)}</div>
                </div>
                <BookingBadge status={b.status} />
              </Card>
            ))}
          </div>

          {alerts.length > 0 && (
            <div className={cx('mt-4 flex flex-col gap-3 lg:hidden')}>
              {alerts.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="h-6" />
    </Page>
  )
}

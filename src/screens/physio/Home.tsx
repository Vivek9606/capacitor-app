import { Activity, CalendarDays, Check, ChevronRight, Footprints, Gift, GraduationCap, ReceiptIndianRupee, UsersRound, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { bookingLine, BookingBadge, needsAttendance, NotifDot } from '../../components/bits'
import { Page } from '../../components/Shell'
import { Avatar, Badge, Button, Card, cx, Empty, IconButton, IconTile, RefreshButton, SectionTitle } from '../../components/ui'
import { physioAlerts } from '../../lib/alerts'
import { COURSE, courseProgress } from '../../lib/course'
import { fmtTime, greeting, timeAgo, today } from '../../lib/dates'
import { firstName, profileCompletion } from '../../lib/logic'
import { toast } from '../../lib/platform'
import { groupsOn } from '../../lib/slots'
import { useMe, useStore } from '../../lib/store'
import type { Booking } from '../../lib/types'
import { AlertCard } from './AlertCard'

// H1 · Home
export default function Home() {
  const { physio } = useMe()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  if (!physio) return null
  const prof = profileCompletion(physio)
  const course = courseProgress(physio.courseProgress)
  const t = today()
  const todays = db.bookings
    .filter((b) => b.physioId === physio.id && b.date === t && b.status !== 'cancelled' && b.status !== 'requested')
    .sort((a, b) => a.time.localeCompare(b.time))
  const waiting = todays.filter((b) => b.status === 'checked_in')
  const scheduled = todays.filter((b) => b.status !== 'checked_in')
  const groups = groupsOn(db.groups, physio.id, t)
  const alerts = physioAlerts(db, physio.id)
  const unpaid = db.invoices.filter((i) => i.physioId === physio.id && i.status === 'unpaid')

  const quick = [
    { icon: <Activity size={19} />, label: 'Care plan', on: () => nav('/app/patients', { state: { pick: 'plan' } }) },
    { icon: <Footprints size={19} />, label: 'Walk-in', on: () => nav('/app/walk-in') },
    { icon: <CalendarDays size={19} />, label: 'New booking', on: () => nav('/app/bookings/new') },
    { icon: <UsersRound size={19} />, label: 'Group session', on: () => nav('/app/groups/new') },
    { icon: <ReceiptIndianRupee size={19} />, label: 'Invoice', on: () => nav('/app/invoices/new') },
    { icon: <Gift size={19} />, label: 'Invite a physio', on: () => nav('/app/refer'), accent: true },
  ]

  const done = (b: Booking) => {
    store.updateBooking(b.id, { status: 'done' })
    toast(`Visit done · bill ${firstName(b.patientName)} or send a care plan`)
  }

  return (
    <Page wide>
      <header className="flex items-center gap-3">
        <Avatar name={physio.name} photo={physio.photo} size={44} className="lg:hidden" />
        <div className="flex-1">
          <div className="text-[13px] text-muted lg:text-[15px]">{greeting()},</div>
          <div className="font-display text-[22px] font-bold tracking-[-0.03em] lg:text-[30px]">Dr. {firstName(physio.name)}</div>
        </div>
        <RefreshButton />
        <IconButton aria-label="Notifications" onClick={() => nav('/app/notifications')}>
          <NotifDot show={alerts.length > 0} />
        </IconButton>
      </header>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          {prof.next && (
            <div className="bg-hero relative overflow-hidden rounded-[24px] p-5 text-white shadow-brand">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[18px] border-white/[0.07]" />
              <div className="flex items-center justify-between">
                <div className="font-display text-[18px] font-bold tracking-[-0.02em]">Profile {prof.pct}% complete</div>
                <div className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-white/90">
                  {prof.done} of {prof.total}
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="anim-grow h-full rounded-full bg-gradient-to-r from-[#ffe5bd] to-sun shadow-[0_0_12px_rgb(255_181_71/0.7)]" style={{ width: `${prof.pct}%` }} />
              </div>
              <p className="mt-3 text-[14px] leading-snug text-white/90">{prof.next.nudge}</p>
              <button onClick={() => nav(prof.next!.to)} className="pressable mt-4 inline-flex h-10 items-center gap-1 rounded-full bg-white px-4 text-[13px] font-bold text-brand shadow-[0_6px_16px_-6px_rgb(0_0_0/0.35)] cursor-pointer">
                {prof.next.cta} <ChevronRight size={15} />
              </button>
            </div>
          )}

          <SectionTitle>Quick actions</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {quick.map((q) => (
              <button
                key={q.label}
                onClick={q.on}
                className="pressable flex min-h-[96px] flex-col items-start justify-between gap-2 rounded-[18px] border border-line/70 bg-surface p-3 text-left text-[13px] font-semibold leading-tight shadow-card hover:border-brand-line hover:shadow-lift cursor-pointer"
              >
                <IconTile tone={q.accent ? 'accent' : 'brand'}>{q.icon}</IconTile>
                {q.label}
              </button>
            ))}
          </div>

          {unpaid.length > 0 && (
            <Card className="mt-3 flex items-center gap-3 p-4" onClick={() => nav('/app/invoices')}>
              <IconTile tone="accent">
                <ReceiptIndianRupee size={19} />
              </IconTile>
              <div className="flex-1">
                <div className="text-[15px] font-semibold">₹{unpaid.reduce((s, i) => s + i.total, 0).toLocaleString('en-IN')} outstanding</div>
                <div className="text-[13px] text-muted">
                  {unpaid.length} unpaid invoice{unpaid.length === 1 ? '' : 's'} · send a reminder
                </div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Card>
          )}

          <Card className="mt-3 flex items-center gap-3 p-4" onClick={() => nav(course.next ? `/app/learn/${course.next.id}` : '/app/learn')}>
            <IconTile tone="lime">
              <GraduationCap size={19} />
            </IconTile>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[15px] font-semibold">
                {COURSE.title}
                {course.done === 0 && <Badge tone="accent">New</Badge>}
              </div>
              <div className="truncate text-[13px] text-muted">
                {course.next ? `${course.done ? 'Next' : 'Start'}: ${course.next.title}` : 'Course complete'} · {course.done}/{course.total}
              </div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </Card>

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
          {waiting.length > 0 && (
            <>
              <SectionTitle className="lg:mt-0" right={<Link to="/app/walk-in" className="text-[14px] font-semibold text-brand">+ Walk-in</Link>}>
                Waiting · {waiting.length}
              </SectionTitle>
              <div className="flex flex-col gap-2.5">
                {waiting.map((b) => (
                  <Card key={b.id} className="flex items-center gap-3 border-ok/40 bg-ok-soft/50 p-3.5">
                    <div className="min-w-0 flex-1" onClick={() => b.patientId && nav(`/app/patients/${b.patientId}`)}>
                      <div className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                        {b.source === 'walk_in' && <Footprints size={14} className="shrink-0 text-accent" />}
                        {b.patientName}
                      </div>
                      <div className="truncate text-[13px] text-muted">
                        {b.source === 'walk_in' ? 'Walk-in' : `Booked ${fmtTime(b.time)}`} · arrived {b.checkedInAt ? timeAgo(b.checkedInAt) : fmtTime(b.time)}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => done(b)}>
                      <Check size={14} /> Done
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}

          <SectionTitle
            className={cx(!waiting.length && 'lg:mt-0')}
            right={
              <Link to="/app/schedule" className="text-[14px] font-semibold text-brand">
                See all
              </Link>
            }
          >
            Today · {scheduled.length + groups.length} on the calendar
          </SectionTitle>
          <div className="flex flex-col gap-3">
            {scheduled.length === 0 && groups.length === 0 && (
              <Card>
                <Empty icon={<CalendarDays size={20} />} title="No appointments today" body="Share your booking page, or check in a walk-in." />
              </Card>
            )}
            {[...scheduled.map((b) => ({ time: b.time, b })), ...groups.map((g) => ({ time: g.time, g }))]
              .sort((x, y) => x.time.localeCompare(y.time))
              .map((row) =>
                'b' in row && row.b ? (
                  <Card key={row.b.id} className={cx('p-4', row.b.status === 'no_show' && 'opacity-70')} onClick={() => (row.b.patientId ? nav(`/app/patients/${row.b.patientId}`) : nav('/app/schedule'))}>
                    <div className="flex items-center gap-4">
                      <TimeCol time={row.b.time} />
                      <div className="min-w-0 flex-1 border-l border-line pl-4">
                        <div className="truncate text-[15px] font-semibold">{row.b.patientName}</div>
                        <div className="truncate text-[13px] text-muted">{bookingLine(row.b)}</div>
                      </div>
                      <BookingBadge status={row.b.status} />
                    </div>
                    {needsAttendance(row.b, t) && (
                      <div className="mt-3 flex gap-2 pl-[68px]" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" onClick={() => (store.updateBooking(row.b.id, { status: 'checked_in' }), toast(`${firstName(row.b.patientName)} has arrived`))}>
                          <Check size={14} /> Arrived
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => (store.updateBooking(row.b.id, { status: 'no_show' }), toast('Marked as no-show'))}>
                          <X size={14} /> No-show
                        </Button>
                      </div>
                    )}
                  </Card>
                ) : 'g' in row && row.g ? (
                  <Card key={row.g.id} className="flex items-center gap-4 border-brand-line bg-brand-soft/40 p-4" onClick={() => nav(`/app/groups/${row.g.id}`)}>
                    <TimeCol time={row.g.time} />
                    <div className="min-w-0 flex-1 border-l border-line pl-4">
                      <div className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                        <UsersRound size={15} className="shrink-0 text-brand" /> {row.g.title}
                      </div>
                      <div className="truncate text-[13px] text-muted">
                        Group · {row.g.minutes} min · {row.g.location}
                      </div>
                    </div>
                    <Badge tone="brand">
                      {row.g.participants.filter((p) => p.status !== 'cancelled').length}/{row.g.capacity}
                    </Badge>
                  </Card>
                ) : null,
              )}
          </div>

          {alerts.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 lg:hidden">
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

function TimeCol({ time }: { time: string }) {
  return (
    <div className="w-[52px] shrink-0 text-center">
      <div className="text-[17px] font-semibold leading-none">{fmtTime(time).split(' ')[0]}</div>
      <div className="mt-1 text-[11px] text-muted">{fmtTime(time).split(' ')[1]}</div>
    </div>
  )
}

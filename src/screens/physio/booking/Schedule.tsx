import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookingBadge, bookingLine, VISIT_LABEL } from '../../../components/bits'
import { Page } from '../../../components/Shell'
import { Button, Card, cx, IconButton, PageHeader, Sheet } from '../../../components/ui'
import { addDays, dayNum, dayShort, fmtDay, fmtMonthLong, fmtTime, parseISO, today, weekDays } from '../../../lib/dates'
import { firstName, fmtPhone } from '../../../lib/logic'
import { openMaps, openWhatsApp, toast } from '../../../lib/platform'
import { activeBookings, isWorkingDay, openSlots } from '../../../lib/slots'
import { useMe, useStore } from '../../../lib/store'
import type { Booking } from '../../../lib/types'
import { AlertCard } from '../AlertCard'
import { physioAlerts } from '../../../lib/alerts'

const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// B1 · Schedule
export default function Schedule() {
  const { physio } = useMe()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const [day, setDay] = useState(today())
  const [open, setOpen] = useState<Booking>()
  if (!physio) return null

  const days = weekDays(day)
  const booked = activeBookings(db.bookings, physio.id, day).filter((b) => b.status !== 'requested')
  const free = openSlots(physio, db.bookings, day)
  const working = isWorkingDay(physio, day)
  // Interleave bookings and the first few open slots into one timeline.
  const timeline = [
    ...booked.map((b) => ({ time: b.time, booking: b })),
    ...(working ? free.slice(0, 4).map((t) => ({ time: t, booking: undefined })) : []),
  ].sort((a, b) => a.time.localeCompare(b.time))
  const changes = physioAlerts(db, physio.id).filter((a) => a.kind === 'request' || a.kind === 'reschedule')

  return (
    <Page wide>
      <PageHeader
        title="Schedule"
        subtitle={fmtMonthLong(day)}
        right={
          <button
            aria-label="New booking"
            onClick={() => nav('/app/bookings/new', { state: { date: day } })}
            className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white cursor-pointer"
          >
            <Plus size={22} />
          </button>
        }
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div>
          <div className="flex items-center gap-2">
            <IconButton aria-label="Previous week" className="hidden h-9 w-9 sm:grid" onClick={() => setDay(addDays(day, -7))}>
              <ChevronLeft size={18} />
            </IconButton>
            <div className="grid flex-1 grid-cols-7 gap-1.5">
              {days.map((d) => {
                const sel = d === day
                const has = activeBookings(db.bookings, physio.id, d).some((b) => b.status !== 'requested')
                return (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    className={cx(
                      'flex flex-col items-center rounded-xl border py-2 cursor-pointer',
                      sel ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand-line',
                    )}
                  >
                    <span className={cx('text-[12px]', sel ? 'text-white/80' : 'text-muted')}>{dayShort(d)}</span>
                    <span className="text-[18px] font-semibold">{dayNum(d)}</span>
                    <span className={cx('mt-0.5 h-1.5 w-1.5 rounded-full', has ? (sel ? 'bg-white' : 'bg-brand') : 'bg-transparent')} />
                  </button>
                )
              })}
            </div>
            <IconButton aria-label="Next week" className="hidden h-9 w-9 sm:grid" onClick={() => setDay(addDays(day, 7))}>
              <ChevronRight size={18} />
            </IconButton>
          </div>

          <div className="mb-3 mt-5 flex items-center justify-between">
            <div className="text-[16px] font-semibold">
              {DAY_LONG[parseISO(day).getDay()]}, {fmtDay(day).split(', ')[1]} · {booked.length} booked{working ? `, ${free.length} open` : ''}
            </div>
            {day !== today() && (
              <button className="text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setDay(today())}>
                Today
              </button>
            )}
          </div>

          {!working && booked.length === 0 && (
            <Card className="p-5 text-center text-[14px] text-muted">Not a working day. You can still add a booking with the + button.</Card>
          )}

          <div className="flex flex-col gap-3">
            {timeline.map(({ time, booking }) => (
              <div key={time + (booking?.id ?? 'open')} className="grid grid-cols-[72px_1fr] items-start gap-2">
                <div className="pt-3 text-[13px] text-muted">{fmtTime(time)}</div>
                {booking ? (
                  <Card className="p-3.5" onClick={() => setOpen(booking)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[15px] font-semibold">{booking.patientName}</div>
                      <BookingBadge status={booking.status} />
                    </div>
                    <div className="mt-1 truncate text-[13px] text-muted">{bookingLine(booking)}</div>
                  </Card>
                ) : (
                  <button
                    onClick={() => nav('/app/bookings/new', { state: { date: day, time } })}
                    className="flex h-[52px] items-center gap-2 rounded-2xl border border-dashed border-brand-line px-4 text-[14px] font-semibold text-brand hover:bg-brand-soft/40 cursor-pointer"
                  >
                    <Plus size={16} /> Open slot · tap to book
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="mt-6 lg:mt-0">
          <h2 className="mb-3 text-[17px] font-semibold">Requests & changes</h2>
          {changes.length === 0 ? (
            <Card className="p-4 text-[14px] text-muted">No pending requests. Booking requests from your public profile and reschedule taps from WhatsApp show up here.</Card>
          ) : (
            <div className="flex flex-col gap-3">
              {changes.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          )}
        </aside>
      </div>
      <div className="h-6" />

      <Sheet open={!!open} onClose={() => setOpen(undefined)} title={open?.patientName}>
        {open && (
          <div>
            <div className="text-[15px] text-muted">
              {fmtDay(open.date)} · {fmtTime(open.time)} · {VISIT_LABEL[open.visitType]}
            </div>
            <div className="mt-1 text-[15px] text-muted">{fmtPhone(open.patientPhone)}</div>
            {open.reason && <div className="mt-3 rounded-xl bg-surface p-3 text-[14px]">{open.reason}</div>}
            <div className="mt-3">
              <BookingBadge status={open.status} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {open.patientId && (
                <Button variant="secondary" size="md" onClick={() => nav(`/app/patients/${open.patientId}`)}>
                  Open patient
                </Button>
              )}
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  store.updateBooking(open.id, { status: 'reminder_sent' })
                  toast(`Reminder sent to ${firstName(open.patientName)}`)
                  setOpen(undefined)
                }}
              >
                Send reminder
              </Button>
              <Button variant="secondary" size="md" onClick={() => nav('/app/bookings/new', { state: { rescheduleId: open.id } })}>
                Reschedule
              </Button>
              <Button variant="secondary" size="md" onClick={() => openWhatsApp(open.patientPhone, `Hi ${firstName(open.patientName)}, `)}>
                WhatsApp
              </Button>
              {physio.clinic && (
                <Button variant="secondary" size="md" onClick={() => openMaps(physio.clinic!.address)}>
                  Directions link
                </Button>
              )}
              <Button
                variant="secondary"
                size="md"
                className="text-danger"
                onClick={() => {
                  store.updateBooking(open.id, { status: 'cancelled' })
                  toast('Booking cancelled · patient notified on WhatsApp')
                  setOpen(undefined)
                }}
              >
                Cancel
              </Button>
            </div>
            {open.date <= today() && open.status !== 'done' && (
              <Button
                block
                className="mt-4"
                onClick={() => {
                  store.updateBooking(open.id, { status: 'done' })
                  if (open.patientId) {
                    const p = db.patients.find((x) => x.id === open.patientId)
                    if (p) toast(`Visit marked done · send ${firstName(p.name)} a care plan?`)
                  } else toast('Visit marked done')
                  setOpen(undefined)
                }}
              >
                Mark visit done
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </Page>
  )
}

import { Ban, Check, ChevronLeft, ChevronRight, Clock, Footprints, Plus, Settings2, UsersRound, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookingBadge, bookingLine, isOpenBooking, VISIT_LABEL } from '../../../components/bits'
import { Page } from '../../../components/Shell'
import { Badge, Button, Card, Chip, cx, IconButton, Input, Label, PageHeader, Sheet, Toggle } from '../../../components/ui'
import { physioAlerts } from '../../../lib/alerts'
import { addDays, dayNum, dayShort, diffDays, fmtDay, fmtMonthLong, fmtShort, fmtTime, parseISO, today, weekDays } from '../../../lib/dates'
import { firstName, fmtPhone } from '../../../lib/logic'
import { openMaps, openWhatsApp, publicUrl, toast } from '../../../lib/platform'
import { activeBookings, blocksOn, groupsOn, isWorkingDay, openSlots, windowsFor } from '../../../lib/slots'
import { useMe, useStore } from '../../../lib/store'
import type { Block, Booking, GroupSession } from '../../../lib/types'
import { AlertCard } from '../AlertCard'

const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BLOCK_REASONS = ['Lunch', 'Admin', 'Leave', 'Hospital rounds', 'Personal', 'Training']

type Row = { time: string; booking?: Booking; group?: GroupSession; block?: Block; open?: boolean }

// B1 · Schedule
export default function Schedule() {
  const { physio } = useMe()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const [day, setDay] = useState(today())
  const [open, setOpen] = useState<Booking>()
  const [blockOpen, setBlockOpen] = useState(false)
  const [showAllOpen, setShowAllOpen] = useState(false)
  if (!physio) return null

  const days = weekDays(day)
  const booked = activeBookings(db.bookings, physio.id, day).filter((b) => b.status !== 'requested')
  const groups = groupsOn(db.groups, physio.id, day)
  const blocks = blocksOn(db.blocks, physio.id, day)
  const dayBlock = blocks.find((b) => !b.start)
  const free = openSlots(physio, db, day)
  const working = isWorkingDay(physio, day)
  const shownFree = showAllOpen ? free : free.slice(0, 4)
  const timeline: Row[] = [
    ...booked.map((b) => ({ time: b.time, booking: b })),
    ...groups.map((g) => ({ time: g.time, group: g })),
    ...blocks.filter((b) => b.start).map((b) => ({ time: b.start!, block: b })),
    ...(working && !dayBlock ? shownFree.map((t) => ({ time: t, open: true })) : []),
  ].sort((a, b) => a.time.localeCompare(b.time))
  const changes = physioAlerts(db, physio.id).filter((a) => a.kind === 'request' || a.kind === 'reschedule')
  const hoursLabel = windowsFor(physio, day)
    .map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`)
    .join(', ')

  const markDone = (b: Booking) => {
    store.updateBooking(b.id, { status: 'done' })
    setOpen(undefined)
    toast(b.patientId ? `Visit done · send ${firstName(b.patientName)} a care plan or invoice` : 'Visit marked done')
  }

  return (
    <Page wide>
      <PageHeader
        back={false}
        title="Schedule"
        subtitle={fmtMonthLong(day)}
        right={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setBlockOpen(true)}>
              <Ban size={15} /> Block
            </Button>
            <IconButton aria-label="Availability settings" onClick={() => nav('/app/profile/availability')}>
              <Settings2 size={18} />
            </IconButton>
            <button
              aria-label="New booking"
              onClick={() => nav('/app/bookings/new', { state: { date: day } })}
              className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white cursor-pointer"
            >
              <Plus size={22} />
            </button>
          </div>
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
                const has = activeBookings(db.bookings, physio.id, d).some((b) => b.status !== 'requested') || groupsOn(db.groups, physio.id, d).length > 0
                const off = !isWorkingDay(physio, d) || blocksOn(db.blocks, physio.id, d).some((b) => !b.start)
                return (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    className={cx(
                      'flex flex-col items-center rounded-xl border py-2 cursor-pointer',
                      sel ? 'border-brand bg-brand text-white' : off ? 'border-dashed border-line bg-bg' : 'border-line bg-surface hover:border-brand-line',
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

          <div className="mb-3 mt-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[16px] font-semibold">
                {DAY_LONG[parseISO(day).getDay()]}, {fmtDay(day).split(', ')[1]} · {booked.length} booked{groups.length ? `, ${groups.length} group` : ''}
                {working && !dayBlock ? `, ${free.length} open` : ''}
              </div>
              {working && <div className="truncate text-[13px] text-muted">Hours {hoursLabel}</div>}
            </div>
            {day !== today() && (
              <button className="shrink-0 text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setDay(today())}>
                Today
              </button>
            )}
          </div>

          {dayBlock && (
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-dashed border-line bg-bg p-4">
              <Ban size={18} className="shrink-0 text-muted" />
              <div className="flex-1 text-[14px]">
                <div className="font-semibold">Blocked all day{dayBlock.reason ? ` · ${dayBlock.reason}` : ''}</div>
                <div className="text-[13px] text-muted">Patients can’t book this day.</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => (store.removeBlock(dayBlock.id), toast('Day unblocked'))}>
                Unblock
              </Button>
            </div>
          )}

          {!working && booked.length === 0 && groups.length === 0 && !dayBlock && (
            <Card className="p-5 text-center text-[14px] text-muted">
              Not a working day.{' '}
              <button className="font-semibold text-brand cursor-pointer" onClick={() => nav('/app/profile/availability')}>
                Change hours
              </button>{' '}
              or add a booking with +.
            </Card>
          )}

          <div className="flex flex-col gap-3">
            {timeline.map((r) => (
              <div key={r.time + (r.booking?.id ?? r.group?.id ?? r.block?.id ?? 'open')} className="grid grid-cols-[72px_1fr] items-start gap-2">
                <div className="pt-3 text-[13px] text-muted">{fmtTime(r.time)}</div>
                {r.booking ? (
                  <Card className={cx('p-3.5', r.booking.status === 'no_show' && 'opacity-70')} onClick={() => setOpen(r.booking)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold">
                        {r.booking.source === 'walk_in' && <Footprints size={14} className="shrink-0 text-accent" />}
                        <span className="truncate">{r.booking.patientName}</span>
                      </div>
                      <BookingBadge status={r.booking.status} />
                    </div>
                    <div className="mt-1 truncate text-[13px] text-muted">{bookingLine(r.booking)}</div>
                    {r.booking.date <= today() && isOpenBooking(r.booking) && (
                      <div className="mt-2.5 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {r.booking.status === 'checked_in' ? (
                          <Button size="sm" onClick={() => markDone(r.booking!)}>
                            <Check size={14} /> Visit done
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => (store.updateBooking(r.booking!.id, { status: 'checked_in' }), toast(`${firstName(r.booking!.patientName)} has arrived`))}>
                              <Check size={14} /> Arrived
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => (store.updateBooking(r.booking!.id, { status: 'no_show' }), toast('Marked as no-show'))}>
                              <X size={14} /> No-show
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                ) : r.group ? (
                  <Card className="border-brand-line bg-brand-soft/40 p-3.5" onClick={() => nav(`/app/groups/${r.group!.id}`)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold">
                        <UsersRound size={15} className="shrink-0 text-brand" />
                        <span className="truncate">{r.group.title}</span>
                      </div>
                      <Badge tone="brand">
                        {r.group.participants.filter((p) => p.status !== 'cancelled').length}/{r.group.capacity}
                      </Badge>
                    </div>
                    <div className="mt-1 truncate text-[13px] text-muted">
                      Group · {r.group.minutes} min · {r.group.location}
                    </div>
                  </Card>
                ) : r.block ? (
                  <div className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-dashed border-line bg-bg px-4 py-2 text-[14px]">
                    <Ban size={15} className="shrink-0 text-muted" />
                    <span className="flex-1 text-muted">
                      Blocked until {fmtTime(r.block.end ?? '23:59')}
                      {r.block.reason ? ` · ${r.block.reason}` : ''}
                    </span>
                    <button className="text-[13px] font-semibold text-brand cursor-pointer" onClick={() => (store.removeBlock(r.block!.id), toast('Time unblocked'))}>
                      Unblock
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => nav('/app/bookings/new', { state: { date: day, time: r.time } })}
                    className="flex h-[52px] items-center gap-2 rounded-2xl border border-dashed border-brand-line px-4 text-[14px] font-semibold text-brand hover:bg-brand-soft/40 cursor-pointer"
                  >
                    <Plus size={16} /> Open slot · tap to book
                  </button>
                )}
              </div>
            ))}
            {working && !dayBlock && free.length > 4 && (
              <button className="ml-[80px] self-start text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setShowAllOpen(!showAllOpen)}>
                {showAllOpen ? 'Show fewer open slots' : `Show all ${free.length} open slots`}
              </button>
            )}
          </div>
        </div>

        <aside className="mt-6 lg:mt-0">
          <h2 className="mb-3 text-[17px] font-semibold">Requests & changes</h2>
          {changes.length === 0 ? (
            <Card className="p-4 text-[14px] text-muted">No pending requests. Bookings from your booking page and reschedule taps from WhatsApp show up here.</Card>
          ) : (
            <div className="flex flex-col gap-3">
              {changes.map((a) => (
                <AlertCard key={a.id} alert={a} />
              ))}
            </div>
          )}
          <UpcomingBlocks />
        </aside>
      </div>
      <div className="h-6" />

      <BlockSheet open={blockOpen} onClose={() => setBlockOpen(false)} defaultDate={day} />

      <Sheet open={!!open} onClose={() => setOpen(undefined)} title={open?.patientName}>
        {open && (
          <div>
            <div className="text-[15px] text-muted">
              {fmtDay(open.date)} · {fmtTime(open.time)} · {VISIT_LABEL[open.visitType]}
              {open.source === 'walk_in' ? ' · Walk-in' : ''}
            </div>
            <div className="mt-1 text-[15px] text-muted">{fmtPhone(open.patientPhone)}</div>
            {open.reason && <div className="mt-3 rounded-xl bg-surface p-3 text-[14px]">{open.reason}</div>}
            <div className="mt-3">
              <BookingBadge status={open.status} />
            </div>

            {open.date <= today() && isOpenBooking(open) && (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {open.status !== 'checked_in' ? (
                  <Button size="md" onClick={() => (store.updateBooking(open.id, { status: 'checked_in' }), setOpen(undefined), toast(`${firstName(open.patientName)} has arrived`))}>
                    <Check size={16} /> Arrived
                  </Button>
                ) : (
                  <Button size="md" onClick={() => markDone(open)}>
                    <Check size={16} /> Visit done
                  </Button>
                )}
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => {
                    store.updateBooking(open.id, { status: 'no_show' })
                    setOpen({ ...open, status: 'no_show' })
                    toast('Marked as no-show')
                  }}
                >
                  <X size={16} /> No-show
                </Button>
              </div>
            )}
            {open.status === 'no_show' && (
              <Button
                block
                variant="whatsapp"
                size="md"
                className="mt-4"
                onClick={() => openWhatsApp(open.patientPhone, `Hi ${firstName(open.patientName)}, we missed you at your ${fmtTime(open.time)} appointment today. Book a new time here: ${publicUrl(`/dr/${physio.slug}/book`)}`)}
              >
                Message to rebook
              </Button>
            )}
            {(open.status === 'done' || open.status === 'checked_in') && (
              <Button block variant="soft" size="md" className="mt-3" onClick={() => nav('/app/invoices/new', { state: { bookingId: open.id } })}>
                Create invoice
              </Button>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {open.patientId && (
                <Button variant="secondary" size="md" onClick={() => nav(`/app/patients/${open.patientId}`)}>
                  Open patient
                </Button>
              )}
              {isOpenBooking(open) && open.status !== 'checked_in' && (
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
              )}
              {isOpenBooking(open) && (
                <Button variant="secondary" size="md" onClick={() => nav('/app/bookings/new', { state: { rescheduleId: open.id } })}>
                  Reschedule
                </Button>
              )}
              <Button variant="secondary" size="md" onClick={() => openWhatsApp(open.patientPhone, `Hi ${firstName(open.patientName)}, `)}>
                WhatsApp
              </Button>
              {physio.clinic && open.visitType === 'in_clinic' && (
                <Button variant="secondary" size="md" onClick={() => openMaps(physio.clinic!.address)}>
                  Directions link
                </Button>
              )}
              {isOpenBooking(open) && (
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
              )}
            </div>
          </div>
        )}
      </Sheet>
    </Page>
  )
}

function UpcomingBlocks() {
  const { physio } = useMe()
  const store = useStore()
  if (!physio) return null
  const list = store.db.blocks
    .filter((b) => b.physioId === physio.id && b.date >= today())
    .sort((a, b) => (a.date + (a.start ?? '')).localeCompare(b.date + (b.start ?? '')))
    .slice(0, 6)
  if (!list.length) return null
  return (
    <>
      <h2 className="mb-3 mt-6 text-[17px] font-semibold">Blocked time</h2>
      <Card className="divide-y divide-line">
        {list.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-3">
            <Clock size={16} className="shrink-0 text-muted" />
            <div className="min-w-0 flex-1 text-[14px]">
              <div className="font-medium">
                {fmtDay(b.date)} · {b.start ? `${fmtTime(b.start)}–${fmtTime(b.end ?? '23:59')}` : 'All day'}
              </div>
              {b.reason && <div className="text-[13px] text-muted">{b.reason}</div>}
            </div>
            <button aria-label="Unblock" className="text-muted hover:text-ink cursor-pointer" onClick={() => (store.removeBlock(b.id), toast('Unblocked'))}>
              <X size={16} />
            </button>
          </div>
        ))}
      </Card>
    </>
  )
}

/** Block a time range or whole days (leave). Blocked time disappears from every booking page. */
export function BlockSheet({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate: string }) {
  const { physio } = useMe()
  const store = useStore()
  const [date, setDate] = useState(defaultDate)
  const [until, setUntil] = useState(defaultDate)
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState('13:00')
  const [end, setEnd] = useState('14:00')
  const [reason, setReason] = useState('')
  const [lastDefault, setLastDefault] = useState(defaultDate)
  if (defaultDate !== lastDefault) {
    setLastDefault(defaultDate)
    setDate(defaultDate)
    setUntil(defaultDate)
  }
  if (!physio) return null
  const n = allDay ? Math.max(1, diffDays(until, date) + 1) : 1
  const valid = allDay ? until >= date && n <= 60 : start < end
  const clashing = allDay
    ? store.db.bookings.filter((b) => b.physioId === physio.id && b.date >= date && b.date <= until && isOpenBooking(b)).length
    : store.db.bookings.filter((b) => b.physioId === physio.id && b.date === date && isOpenBooking(b) && b.time >= start && b.time < end).length

  return (
    <Sheet open={open} onClose={onClose} title="Block time">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[15px] font-semibold">Whole day(s)</div>
            <div className="text-[13px] text-muted">For leave, conferences or holidays</div>
          </div>
          <Toggle label="Whole day" checked={allDay} onChange={setAllDay} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <Label>{allDay ? 'From' : 'Date'}</Label>
            <input type="date" min={today()} value={date} onChange={(e) => e.target.value && (setDate(e.target.value), until < e.target.value && setUntil(e.target.value))} className="h-[52px] w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand" />
          </label>
          {allDay ? (
            <label>
              <Label>Until</Label>
              <input type="date" min={date} value={until} onChange={(e) => e.target.value && setUntil(e.target.value)} className="h-[52px] w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand" />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label>
                <Label>From</Label>
                <input type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} className="h-[52px] w-full rounded-xl border border-line bg-surface px-2 outline-none focus:border-brand" />
              </label>
              <label>
                <Label>To</Label>
                <input type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className="h-[52px] w-full rounded-xl border border-line bg-surface px-2 outline-none focus:border-brand" />
              </label>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {BLOCK_REASONS.map((r) => (
            <Chip key={r} selected={reason === r} onClick={() => setReason(reason === r ? '' : r)}>
              {r}
            </Chip>
          ))}
        </div>
        <Input placeholder="Note (only you see this)" value={BLOCK_REASONS.includes(reason) ? '' : reason} onChange={(e) => setReason(e.target.value)} />
        {clashing > 0 && (
          <p className="rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn">
            {clashing} existing booking{clashing === 1 ? '' : 's'} in this time stay{clashing === 1 ? 's' : ''} on your calendar — reschedule {clashing === 1 ? 'it' : 'them'} if needed.
          </p>
        )}
        <Button
          block
          disabled={!valid}
          onClick={() => {
            const rows = Array.from({ length: n }, (_, i) =>
              allDay ? { date: addDays(date, i), reason: reason.trim() || undefined } : { date, start, end, reason: reason.trim() || undefined },
            )
            store.addBlocks(physio.id, rows)
            toast(allDay ? `${n} day${n === 1 ? '' : 's'} blocked` : `Blocked ${fmtShort(date)}, ${fmtTime(start)}–${fmtTime(end)}`)
            onClose()
          }}
        >
          {allDay && n > 1 ? `Block ${n} days` : 'Block'}
        </Button>
      </div>
    </Sheet>
  )
}

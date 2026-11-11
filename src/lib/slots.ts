import { addDays, dayShort, diffDays, today, WEEK_ORDER } from './dates'
import type { Availability, Block, Booking, GroupSession, Physio, TimeRange, VisitType } from './types'

export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
export const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export const DEFAULT_AVAILABILITY: Availability = {
  weekly: Object.fromEntries(
    WEEK_ORDER.map((d) => [d, d === 'Sun' ? [] : [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:30' }]]),
  ),
  slotStepMin: 30,
  bufferMin: 0,
  minNoticeHours: 2,
  maxDaysAhead: 30,
}

/**
 * The physio's weekly hours. Older profiles only have working days + open/close times;
 * those keep the 1–2 PM lunch break they always had.
 */
export function effectiveAvailability(p: Physio): Availability {
  if (p.availability) return p.availability
  const start = p.hours?.start ?? '09:00'
  const end = p.hours?.end ?? '18:30'
  const windows: TimeRange[] =
    toMin(start) < 13 * 60 && toMin(end) > 14 * 60
      ? [
          { start, end: '13:00' },
          { start: '14:00', end },
        ]
      : [{ start, end }]
  return { ...DEFAULT_AVAILABILITY, weekly: Object.fromEntries(WEEK_ORDER.map((d) => [d, p.workingDays.includes(d) ? windows : []])) }
}

/** Working days + overall open/close, kept in sync for older screens and the API's reminders. */
export function summariseAvailability(a: Availability): { workingDays: string[]; hours?: { start: string; end: string } } {
  const workingDays = WEEK_ORDER.filter((d) => (a.weekly[d] ?? []).length > 0)
  const all = workingDays.flatMap((d) => a.weekly[d])
  if (!all.length) return { workingDays }
  return {
    workingDays,
    hours: { start: fromMin(Math.min(...all.map((w) => toMin(w.start)))), end: fromMin(Math.max(...all.map((w) => toMin(w.end)))) },
  }
}

export function windowsFor(p: Physio, date: string): TimeRange[] {
  return effectiveAvailability(p).weekly[dayShort(date)] ?? []
}

export function isWorkingDay(physio: Physio, date: string) {
  return windowsFor(physio, date).length > 0
}

export function visitMinutes(p: Physio, visitType: VisitType): number {
  if (visitType === 'home_visit') return p.consult.homeVisit.minutes || 60
  return p.consult.inClinic.minutes || 45
}

export function visitFee(p: Physio, visitType: VisitType): number {
  return visitType === 'home_visit' ? p.consult.homeVisit.fee : p.consult.inClinic.fee
}

/** Time kept free after an appointment (plus travel for home visits). */
function bufferAfter(p: Physio, visitType: VisitType): number {
  return effectiveAvailability(p).bufferMin + (visitType === 'home_visit' ? p.practice?.travelBufferMin ?? 0 : 0)
}

export function bookingMinutes(p: Physio, b: Pick<Booking, 'minutes' | 'visitType'>): number {
  return b.minutes ?? visitMinutes(p, b.visitType)
}

const OCCUPYING = new Set<Booking['status']>(['requested', 'awaiting', 'confirmed', 'reminder_sent', 'reschedule', 'checked_in', 'done'])

export function activeBookings(bookings: Booking[], physioId: string, date: string) {
  return bookings
    .filter((b) => b.physioId === physioId && b.date === date && b.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time))
}

export function blocksOn(blocks: Block[] | undefined, physioId: string, date: string) {
  return (blocks ?? []).filter((b) => b.physioId === physioId && b.date === date)
}

export function groupsOn(groups: GroupSession[] | undefined, physioId: string, date: string) {
  return (groups ?? []).filter((g) => g.physioId === physioId && g.date === date && g.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time))
}

export function isDayBlocked(blocks: Block[] | undefined, physioId: string, date: string) {
  return blocksOn(blocks, physioId, date).some((b) => !b.start)
}

export interface Calendar {
  bookings: Booking[]
  blocks?: Block[]
  groups?: GroupSession[]
}

/** Busy [start, end) minute ranges on a date: bookings (+ buffers), blocks and group sessions. */
export function busyRanges(p: Physio, cal: Calendar, date: string, excludeBookingId?: string): [number, number][] {
  const out: [number, number][] = []
  for (const b of cal.bookings) {
    if (b.physioId !== p.id || b.date !== date || b.id === excludeBookingId || !OCCUPYING.has(b.status)) continue
    const s = toMin(b.time)
    out.push([s, s + bookingMinutes(p, b) + bufferAfter(p, b.visitType)])
  }
  for (const bl of blocksOn(cal.blocks, p.id, date)) out.push(bl.start ? [toMin(bl.start), toMin(bl.end ?? '23:59')] : [0, 24 * 60])
  for (const g of groupsOn(cal.groups, p.id, date)) {
    const s = toMin(g.time)
    out.push([s, s + g.minutes + effectiveAvailability(p).bufferMin])
  }
  return out
}

export interface SlotOptions {
  visitType?: VisitType
  minutes?: number
  /** Patient-facing: apply minimum notice and the booking window. */
  forPatient?: boolean
  excludeBookingId?: string
  now?: Date
  /** Only these weekdays ('Mon'..'Sun'), e.g. the days a physio is at one of their practices. */
  days?: string[]
}

/** Every start time inside the physio's hours on a date, ignoring what's booked. */
export function daySlots(physio: Physio, date: string, opts: SlotOptions = {}): string[] {
  const a = effectiveAvailability(physio)
  const len = opts.minutes ?? visitMinutes(physio, opts.visitType ?? 'in_clinic')
  const step = Math.max(5, a.slotStepMin || 30)
  if (opts.days?.length && !opts.days.includes(dayShort(date))) return []
  const out: string[] = []
  for (const w of windowsFor(physio, date)) {
    for (let m = toMin(w.start); m + len <= toMin(w.end); m += step) out.push(fromMin(m))
  }
  const now = opts.now ?? new Date()
  const t = today()
  if (opts.forPatient) {
    if (diffDays(date, t) > a.maxDaysAhead || date < t) return []
    const earliest = now.getTime() + a.minNoticeHours * 3600_000
    return out.filter((s) => {
      const [y, mo, d] = date.split('-').map(Number)
      return new Date(y, mo - 1, d, Number(s.slice(0, 2)), Number(s.slice(3, 5))).getTime() >= earliest
    })
  }
  if (date === t) {
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return out.filter((s) => toMin(s) > nowMin)
  }
  return date < t ? [] : out
}

/** Open slots that don't collide with bookings, blocks or group sessions. */
export function openSlots(physio: Physio, cal: Calendar | Booking[], date: string, opts: SlotOptions = {}): string[] {
  const c: Calendar = Array.isArray(cal) ? { bookings: cal } : cal
  const len = opts.minutes ?? visitMinutes(physio, opts.visitType ?? 'in_clinic')
  const busy = busyRanges(physio, c, date, opts.excludeBookingId)
  return daySlots(physio, date, opts).filter((s) => {
    const a = toMin(s)
    const b = a + len
    return !busy.some(([x, y]) => a < y && x < b)
  })
}

/** Does a time on a date clash with anything? (Walk-ins and manual times can still go ahead.) */
export function clashes(physio: Physio, cal: Calendar, date: string, time: string, minutes: number, excludeBookingId?: string) {
  const a = toMin(time)
  return busyRanges(physio, cal, date, excludeBookingId).some(([x, y]) => a < y && x < a + minutes)
}

/** Next N days (from today) that have at least one open slot. */
export function bookableDays(physio: Physio, cal: Calendar, opts: SlotOptions & { horizon?: number } = {}): string[] {
  const horizon = opts.horizon ?? effectiveAvailability(physio).maxDaysAhead
  const out: string[] = []
  for (let i = 0; i <= horizon; i++) {
    const d = addDays(today(), i)
    if (openSlots(physio, cal, d, opts).length) out.push(d)
  }
  return out
}

/** Current time rounded down to 5 minutes, as HH:mm. */
export function nowHHMM(): string {
  const n = new Date()
  return fromMin(n.getHours() * 60 + Math.floor(n.getMinutes() / 5) * 5)
}

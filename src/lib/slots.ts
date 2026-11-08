import { dayShort, today } from './dates'
import type { Booking, Physio } from './types'

/** Bookable slots for a physio on a date (30-min grid, consult length respected). */
export function daySlots(physio: Physio, date: string): string[] {
  const start = physio.hours?.start ?? '09:00'
  const end = physio.hours?.end ?? '18:30'
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const out: string[] = []
  const step = 30
  const len = physio.consult.inClinic.minutes || 45
  for (let m = toMin(start); m + len <= toMin(end); m += step) {
    if (m >= 13 * 60 && m < 14 * 60) continue // lunch
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  if (date === today()) {
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return out.filter((s) => toMin(s) > nowMin)
  }
  return out
}

export function isWorkingDay(physio: Physio, date: string) {
  return physio.workingDays.includes(dayShort(date))
}

export function activeBookings(bookings: Booking[], physioId: string, date: string) {
  return bookings
    .filter((b) => b.physioId === physioId && b.date === date && b.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time))
}

/** Open slots that don't collide with an existing booking. */
export function openSlots(physio: Physio, bookings: Booking[], date: string): string[] {
  const taken = activeBookings(bookings, physio.id, date).map((b) => b.time)
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const len = physio.consult.inClinic.minutes || 45
  return daySlots(physio, date).filter((s) => !taken.some((t) => Math.abs(toMin(t) - toMin(s)) < len))
}

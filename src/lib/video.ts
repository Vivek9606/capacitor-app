// Video consults (teleconsult bookings). The backend issues a LiveKit token per booking;
// these helpers mirror its timing rules so the Join button appears at the right moment.
import type { Booking } from './types'

/** Must match capacitor-app-backend/src/routes/video.ts */
export const OPENS_BEFORE_MIN = 15
export const CLOSES_AFTER_MIN = 30

const CALLABLE = new Set(['awaiting', 'confirmed', 'reminder_sent', 'reschedule', 'checked_in'])

export function isVideoBooking(b: Booking): boolean {
  return b.visitType === 'teleconsult' && CALLABLE.has(b.status)
}

/** Booking date + time are Indian local time. */
export function callWindow(b: Booking, minutes: number) {
  const start = Date.parse(`${b.date}T${b.time}:00+05:30`)
  const end = start + minutes * 60_000
  return { start, end, opens: start - OPENS_BEFORE_MIN * 60_000, closes: end + CLOSES_AFTER_MIN * 60_000 }
}

export type CallState = 'later' | 'open' | 'ended'

export function callState(b: Booking, minutes: number, now = Date.now()): CallState {
  const w = callWindow(b, minutes)
  return now < w.opens ? 'later' : now > w.closes ? 'ended' : 'open'
}

export interface CallGrant {
  url: string
  token: string
  room: string
  role: 'physio' | 'patient'
  peerName: string
  startsAt: string
  endsAt: string
}

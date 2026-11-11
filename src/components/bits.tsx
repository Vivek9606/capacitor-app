import { Bell, Check, Clock, DoorOpen, Footprints, Inbox, MessageCircle, RefreshCw, UserX } from 'lucide-react'
import type { Booking, BookingStatus, VisitType } from '../lib/types'
import { Badge } from './ui'

export function BookingBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case 'confirmed':
      return (
        <Badge tone="brand" icon={<Check size={13} strokeWidth={2.5} />}>
          Confirmed
        </Badge>
      )
    case 'reminder_sent':
      return (
        <Badge tone="lime" icon={<MessageCircle size={13} />}>
          Reminder sent
        </Badge>
      )
    case 'awaiting':
      return (
        <Badge tone="accent" icon={<Clock size={13} />}>
          Awaiting reply
        </Badge>
      )
    case 'reschedule':
      return (
        <Badge tone="accent" icon={<RefreshCw size={12} />}>
          Reschedule asked
        </Badge>
      )
    case 'requested':
      return (
        <Badge tone="warn" icon={<Inbox size={13} />}>
          New request
        </Badge>
      )
    case 'checked_in':
      return (
        <Badge tone="ok" icon={<DoorOpen size={13} />}>
          Arrived
        </Badge>
      )
    case 'no_show':
      return (
        <Badge tone="warn" icon={<UserX size={13} />}>
          No-show
        </Badge>
      )
    case 'done':
      return <Badge tone="muted">Done</Badge>
    case 'cancelled':
      return <Badge tone="muted">Cancelled</Badge>
  }
}

export const VISIT_LABEL: Record<VisitType, string> = {
  in_clinic: 'In-clinic',
  home_visit: 'Home visit',
  teleconsult: 'Video consult',
}

export function bookingLine(b: Booking) {
  return [b.source === 'walk_in' ? 'Walk-in' : b.isNewPatient ? 'New patient' : undefined, b.reason?.replace(/^Walk-in( · )?/, '') || undefined, VISIT_LABEL[b.visitType]]
    .filter(Boolean)
    .join(' · ')
}

export function WalkInIcon({ size = 14 }: { size?: number }) {
  return <Footprints size={size} />
}

/** Booking still on the calendar and waiting for the visit to happen. */
export const isOpenBooking = (b: Booking) => ['awaiting', 'confirmed', 'reminder_sent', 'reschedule', 'checked_in'].includes(b.status)

/** Today's or past visits that still need a show / no-show mark (including requests nobody accepted). */
export const needsAttendance = (b: Booking, todayIso: string) => b.date <= todayIso && (isOpenBooking(b) || b.status === 'requested')

/** Any visit still open (any date): the physio can mark show / no-show from the booking itself. */
export const canMarkAttendance = (b: Booking) => isOpenBooking(b) || b.status === 'requested'

/** Visits already marked, so a wrong mark can be switched. */
export const attendanceMarked = (b: Booking, _todayIso?: string) => b.status === 'done' || b.status === 'no_show'

export function NotifDot({ show }: { show: boolean }) {
  return (
    <span className="relative">
      <Bell size={19} />
      {show && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />}
    </span>
  )
}

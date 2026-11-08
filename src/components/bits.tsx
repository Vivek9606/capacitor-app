import { Check, Clock, MessageCircle, RefreshCw, Bell, Inbox } from 'lucide-react'
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
    case 'done':
      return <Badge tone="muted">Done</Badge>
    case 'cancelled':
      return <Badge tone="muted">Cancelled</Badge>
  }
}

export const VISIT_LABEL: Record<VisitType, string> = {
  in_clinic: 'In-clinic',
  home_visit: 'Home visit',
  teleconsult: 'Teleconsult',
}

export function bookingLine(b: Booking) {
  return [b.isNewPatient ? 'New patient' : undefined, b.reason, VISIT_LABEL[b.visitType]].filter(Boolean).join(' · ')
}

export function NotifDot({ show }: { show: boolean }) {
  return (
    <span className="relative">
      <Bell size={19} />
      {show && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />}
    </span>
  )
}

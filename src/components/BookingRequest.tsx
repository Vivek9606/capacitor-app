import { useState } from 'react'
import { addDays, fmtTime, relDay, today } from '../lib/dates'
import { isWorkingDay, openSlots } from '../lib/slots'
import { useStore } from '../lib/store'
import type { Booking, Physio } from '../lib/types'
import { Button, Chip, Input, Label, TextArea } from './ui'

export interface BookingRequestValue {
  name: string
  phone: string
  date: string
  time: string
  reason: string
}

/** Patient-side booking request (public profile + patient app). Physio accepts from Home. */
export function BookingRequest({
  physio,
  known,
  onSubmit,
  submitLabel = 'Request booking',
  bookings: given,
  busy: sending,
}: {
  /** Bookings to avoid (defaults to everything in the store). */
  bookings?: Booking[]
  busy?: boolean
  physio: Physio
  known?: { name: string; phone: string }
  onSubmit: (v: BookingRequestValue) => void
  submitLabel?: string
}) {
  const { db } = useStore()
  const taken = given ?? db.bookings
  const days = Array.from({ length: 10 }, (_, i) => addDays(today(), i)).filter((d) => isWorkingDay(physio, d) && openSlots(physio, taken, d).length > 0).slice(0, 5)
  const [date, setDate] = useState(days[0])
  const [time, setTime] = useState<string>()
  const [name, setName] = useState(known?.name ?? '')
  const [phone, setPhone] = useState(known?.phone ?? '')
  const [reason, setReason] = useState('')
  const slots = date ? openSlots(physio, taken, date) : []
  const digits = phone.replace(/\D/g, '')
  const valid = !!date && !!time && name.trim().length > 1 && /^[6-9]\d{9}$/.test(digits)

  if (!days.length) return <p className="text-[14px] text-muted">No open slots in the next few days. Message the clinic on WhatsApp instead.</p>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Day</Label>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Chip
              key={d}
              selected={date === d}
              onClick={() => {
                setDate(d)
                setTime(undefined)
              }}
            >
              {relDay(d)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <Label>Time</Label>
        <div className="grid grid-cols-3 gap-2">
          {slots.slice(0, 12).map((s) => (
            <Chip key={s} selected={time === s} onClick={() => setTime(s)} className="justify-center px-2">
              {fmtTime(s)}
            </Chip>
          ))}
        </div>
      </div>
      {!known && (
        <>
          <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <Input label="Mobile (WhatsApp)" prefix="+91" inputMode="numeric" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} autoComplete="tel-national" />
        </>
      )}
      <TextArea label="What’s bothering you? (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Knee pain while climbing stairs" />
      <Button block disabled={!valid || sending} onClick={() => valid && onSubmit({ name: name.trim(), phone: digits, date: date!, time: time!, reason: reason.trim() })}>
        {submitLabel}
      </Button>
    </div>
  )
}

import { Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, apiMode } from '../lib/api'
import { fmtDay, fmtTime, today } from '../lib/dates'
import { firstName } from '../lib/logic'
import { bookingMinutes, fromMin, toMin } from '../lib/slots'
import { useMe } from '../lib/store'
import type { Booking, Physio } from '../lib/types'
import { callState, type CallStatus, isVideoBooking, OPENS_BEFORE_MIN, peerWaiting } from '../lib/video'
import { Button, cx } from './ui'

/**
 * The video-call button on an appointment card. Every state leads to the call lobby (/call/:id), where people can
 * check their camera and microphone; the call itself opens 15 minutes before the start.
 *  - open:            "Join video call", or "Rahul is waiting · Join" when the other side is already in
 *  - later today:     "Call opens 10:45 · Test camera"
 *  - a later day:     "Test camera & mic" (patients only; the card already shows the date)
 * Renders nothing for other visits, closed bookings and finished calls.
 */
export function JoinCall({ booking, physio, size = 'sm', block, className }: { booking: Booking; physio: Physio; size?: 'sm' | 'md'; block?: boolean; className?: string }) {
  const nav = useNavigate()
  const { session } = useMe()
  const [now, setNow] = useState(Date.now())
  const [status, setStatus] = useState<CallStatus>()
  const video = apiMode && isVideoBooking(booking)
  const state = video ? callState(booking, bookingMinutes(physio, booking), now) : 'ended'

  useEffect(() => {
    if (!video) return
    const t = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(t)
  }, [video])

  // While the call is open, check every 20s whether the other side is already in it.
  useEffect(() => {
    if (state !== 'open' || !session?.token) return
    let live = true
    const check = () =>
      api<CallStatus>(`/bookings/${encodeURIComponent(booking.id)}/call`, { token: session.token })
        .then((s) => live && setStatus(s))
        .catch(() => {})
    check()
    const t = setInterval(check, 20_000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [state, booking.id, session?.token])

  if (!video || state === 'ended') return null
  const go = (e: React.MouseEvent) => {
    e.stopPropagation()
    nav(`/call/${booking.id}`)
  }

  if (state === 'later') {
    const sameDay = booking.date === today()
    if (!sameDay && session?.role !== 'patient') return null
    const opens = fmtTime(fromMin(Math.max(0, toMin(booking.time) - OPENS_BEFORE_MIN)))
    return (
      <Button size={size} block={block} className={className} variant="secondary" onClick={go} title={sameDay ? undefined : `Opens ${fmtDay(booking.date)}, ${opens}`}>
        <Video size={14} /> {sameDay ? `Call opens ${opens} · Test camera` : 'Test camera & mic'}
      </Button>
    )
  }

  const waiting = peerWaiting(status)
  const peer = session?.role === 'physio' ? firstName(booking.patientName) : `Dr. ${firstName(physio.name)}`
  return (
    <Button size={size} block={block} className={cx(className, waiting && 'animate-pulse')} onClick={go}>
      <Video size={14} /> {waiting ? `${peer} is waiting · Join` : 'Join video call'}
    </Button>
  )
}

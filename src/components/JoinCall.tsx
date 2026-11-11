import { Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiMode } from '../lib/api'
import { fmtTime, today } from '../lib/dates'
import { bookingMinutes, fromMin, toMin } from '../lib/slots'
import type { Booking, Physio } from '../lib/types'
import { callState, isVideoBooking, OPENS_BEFORE_MIN } from '../lib/video'
import { Button } from './ui'

/** "Join video call" for a video-consult booking. Renders nothing for other visits or closed bookings. */
export function JoinCall({ booking, physio, size = 'sm', block, className }: { booking: Booking; physio: Physio; size?: 'sm' | 'md'; block?: boolean; className?: string }) {
  const nav = useNavigate()
  const [now, setNow] = useState(Date.now())
  const video = apiMode && isVideoBooking(booking)
  useEffect(() => {
    if (!video) return
    const t = setInterval(() => setNow(Date.now()), 20_000)
    return () => clearInterval(t)
  }, [video])
  if (!video) return null

  const state = callState(booking, bookingMinutes(physio, booking), now)
  if (state === 'ended') return null
  if (state === 'later') {
    // Same day: say when it opens. Further out, the card's date says enough.
    if (booking.date !== today()) return null
    return (
      <Button size={size} block={block} className={className} variant="secondary" disabled>
        <Video size={14} /> Call opens {fmtTime(fromMin(Math.max(0, toMin(booking.time) - OPENS_BEFORE_MIN)))}
      </Button>
    )
  }
  return (
    <Button
      size={size}
      block={block}
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        nav(`/call/${booking.id}`)
      }}
    >
      <Video size={14} /> Join video call
    </Button>
  )
}

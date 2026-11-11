import { Mic, MicOff, PhoneOff, RefreshCw, SwitchCamera, Video, VideoOff, Volume2, WifiOff } from 'lucide-react'
import {
  ConnectionQuality,
  ConnectionState,
  type LocalVideoTrack,
  type Participant,
  RemoteParticipant,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, cx } from '../../components/ui'
import { api, ApiError, apiMode } from '../../lib/api'
import { firstName } from '../../lib/logic'
import { haptic, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import type { CallGrant } from '../../lib/video'

type Phase = 'connecting' | 'live' | 'ended' | 'error'

/** Attach a participant's camera (or mic) track to a media element while it exists. */
function useTrack(room: Room | undefined, participant: Participant | undefined, source: Track.Source, el: React.RefObject<HTMLMediaElement | null>, tick: number) {
  const track = participant?.getTrackPublication(source)?.track
  useEffect(() => {
    if (!track || !el.current) return
    track.attach(el.current)
    return () => {
      track.detach(el.current!)
    }
  }, [track, el, room])
  return { track, muted: !track || participant?.getTrackPublication(source)?.isMuted === true, tick }
}

function fmtElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Full-screen 1:1 video call for a teleconsult booking (physio ↔ patient).
export default function Call() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const store = useStore()
  const { session } = useMe()
  const [phase, setPhase] = useState<Phase>('connecting')
  const [error, setError] = useState('')
  const [grant, setGrant] = useState<CallGrant>()
  const [room, setRoom] = useState<Room>()
  const [tick, setTick] = useState(0) // re-render on room events
  const [joinedAt, setJoinedAt] = useState<number>()
  const [now, setNow] = useState(Date.now())
  const [needsAudioTap, setNeedsAudioTap] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [attempt, setAttempt] = useState(0)
  const localEl = useRef<HTMLVideoElement>(null)
  const remoteEl = useRef<HTMLVideoElement>(null)
  const remoteAudio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!session?.token) return
    let cancelled = false
    setRoom(undefined)
    const r = new Room({
      adaptiveStream: true, // only receive the resolution we actually show
      dynacast: true, // stop sending layers nobody watches
      videoCaptureDefaults: { resolution: VideoPresets.h540.resolution, facingMode: 'user' },
    })
    const bump = () => setTick((t) => t + 1)
    r.on(RoomEvent.ParticipantConnected, () => (haptic('light'), bump()))
      .on(RoomEvent.ParticipantDisconnected, bump)
      .on(RoomEvent.TrackSubscribed, bump)
      .on(RoomEvent.TrackUnsubscribed, bump)
      .on(RoomEvent.TrackMuted, bump)
      .on(RoomEvent.TrackUnmuted, bump)
      .on(RoomEvent.LocalTrackPublished, bump)
      .on(RoomEvent.ConnectionStateChanged, bump)
      .on(RoomEvent.ConnectionQualityChanged, bump)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setNeedsAudioTap(!r.canPlaybackAudio))
      .on(RoomEvent.Disconnected, () => !cancelled && setPhase((p) => (p === 'error' ? p : 'ended')))

    ;(async () => {
      try {
        const g = await api<CallGrant>(`/bookings/${encodeURIComponent(id)}/call`, { method: 'POST', token: session.token })
        if (cancelled) return
        setGrant(g)
        await r.connect(g.url, g.token)
        if (cancelled) return r.disconnect()
        setRoom(r)
        setPhase('live')
        setJoinedAt(Date.now())
        setNeedsAudioTap(!r.canPlaybackAudio)
        try {
          await r.localParticipant.enableCameraAndMicrophone()
        } catch {
          // Joined, but no camera/mic: they can still see and hear the other person.
          toast('Camera or microphone blocked. Allow them in settings to be seen and heard.')
        }
        bump()
      } catch (e) {
        if (cancelled) return
        setPhase('error')
        setError(e instanceof ApiError ? e.message : 'Couldn’t connect to the call. Check your internet and try again.')
        r.disconnect()
      }
    })()

    return () => {
      cancelled = true
      r.disconnect()
    }
  }, [id, session?.token, attempt])

  useEffect(() => {
    if (phase !== 'live') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [phase])

  const local = room?.localParticipant
  const remote: RemoteParticipant | undefined = room ? [...room.remoteParticipants.values()][0] : undefined
  const mine = useTrack(room, local, Track.Source.Camera, localEl, tick)
  const theirs = useTrack(room, remote, Track.Source.Camera, remoteEl, tick)
  useTrack(room, remote, Track.Source.Microphone, remoteAudio, tick)
  const theirMicOff = !remote || remote.getTrackPublication(Track.Source.Microphone)?.isMuted !== false
  const micOn = local?.isMicrophoneEnabled ?? false
  const camOn = local?.isCameraEnabled ?? false
  const reconnecting = room?.state === ConnectionState.Reconnecting
  const poor = remote?.connectionQuality === ConnectionQuality.Poor || local?.connectionQuality === ConnectionQuality.Poor

  if (!session) return <Navigate to="/welcome" replace />
  const home = session.role === 'physio' ? '/app/schedule' : '/me/appointments'
  const peer = grant ? (session.role === 'physio' ? firstName(grant.peerName) : grant.peerName) : ''

  const leave = () => {
    room?.disconnect()
    setPhase('ended')
  }

  if (!apiMode) {
    return (
      <Shell>
        <Notice title="Video calls need the live app" body="They aren’t available in demo mode." action={<Button onClick={() => nav(-1)}>Back</Button>} />
      </Shell>
    )
  }

  if (phase === 'error') {
    return (
      <Shell>
        <Notice
          title="Can’t join the call"
          body={error}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => nav(home)}>Back</Button>
              <Button onClick={() => (setPhase('connecting'), setAttempt((a) => a + 1))}>
                <RefreshCw size={16} /> Try again
              </Button>
            </div>
          }
        />
      </Shell>
    )
  }

  if (phase === 'ended') {
    const booking = store.db.bookings.find((b) => b.id === id)
    const canMarkDone = session.role === 'physio' && booking && booking.status !== 'done'
    return (
      <Shell>
        <Notice
          title="Call ended"
          body={joinedAt ? `Duration ${fmtElapsed(now - joinedAt)}` : undefined}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {canMarkDone && (
                <Button
                  onClick={() => {
                    store.updateBooking(booking.id, { status: 'done' })
                    toast('Visit marked as done')
                    nav(home)
                  }}
                >
                  Mark visit done
                </Button>
              )}
              <Button variant="secondary" onClick={() => (setPhase('connecting'), setAttempt((a) => a + 1))}>
                Rejoin
              </Button>
              <Button variant="secondary" onClick={() => nav(home)}>
                Close
              </Button>
            </div>
          }
        />
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Remote video fills the screen; until they join, show who we're waiting for. */}
      <video ref={remoteEl} autoPlay playsInline className={cx('absolute inset-0 h-full w-full object-cover', theirs.muted && 'hidden')} />
      <audio ref={remoteAudio} autoPlay />
      {(!remote || theirs.muted) && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <div>
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/10 font-display text-[36px] font-bold text-white">
              {(peer || '·').charAt(0).toUpperCase()}
            </div>
            <div className="mt-4 text-[18px] font-semibold text-white">{phase === 'connecting' ? 'Connecting…' : remote ? peer : `Waiting for ${peer || 'the other person'} to join`}</div>
            {remote && theirs.muted && <div className="mt-1 text-[14px] text-white/60">Camera is off</div>}
            {!remote && phase === 'live' && <div className="mt-1 text-[14px] text-white/60">Keep this screen open. They’ll appear here.</div>}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-[calc(14px+env(safe-area-inset-top))] text-white">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold">{peer || 'Video consult'}</div>
          <div className="flex items-center gap-1.5 text-[13px] text-white/75">
            {remote ? fmtElapsed(now - (joinedAt ?? now)) : 'Video consult'}
            {remote && theirMicOff && (
              <span className="flex items-center gap-1">
                · <MicOff size={12} /> muted
              </span>
            )}
          </div>
        </div>
        {(reconnecting || poor) && (
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[12px] font-semibold">
            <WifiOff size={13} /> {reconnecting ? 'Reconnecting…' : 'Weak connection'}
          </span>
        )}
      </div>

      {/* Self view */}
      <div className="absolute right-4 top-[calc(76px+env(safe-area-inset-top))] h-[150px] w-[108px] overflow-hidden rounded-2xl border border-white/20 bg-black/60 shadow-float sm:h-[180px] sm:w-[240px]">
        <video ref={localEl} autoPlay playsInline muted className={cx('h-full w-full object-cover', facing === 'user' && '-scale-x-100', mine.muted && 'hidden')} />
        {mine.muted && (
          <div className="grid h-full place-items-center text-white/60">
            <VideoOff size={22} />
          </div>
        )}
      </div>

      {needsAudioTap && (
        <button onClick={() => room?.startAudio()} className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-ink shadow-float cursor-pointer">
          <Volume2 size={18} /> Tap to turn on sound
        </button>
      )}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-10">
        <CtrlButton label={micOn ? 'Mute' : 'Unmute'} off={!micOn} disabled={!local} onClick={() => local?.setMicrophoneEnabled(!micOn).then(() => setTick((t) => t + 1))}>
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </CtrlButton>
        <CtrlButton label={camOn ? 'Turn camera off' : 'Turn camera on'} off={!camOn} disabled={!local} onClick={() => local?.setCameraEnabled(!camOn).then(() => setTick((t) => t + 1))}>
          {camOn ? <Video size={22} /> : <VideoOff size={22} />}
        </CtrlButton>
        <CtrlButton
          label="Flip camera"
          disabled={!camOn}
          onClick={async () => {
            const next = facing === 'user' ? 'environment' : 'user'
            const t = local?.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined
            try {
              await t?.restartTrack({ facingMode: next })
              setFacing(next)
            } catch {
              toast('Couldn’t switch camera')
            }
          }}
        >
          <SwitchCamera size={22} />
        </CtrlButton>
        <button aria-label="Leave call" onClick={leave} className="pressable grid h-16 w-16 place-items-center rounded-full bg-danger text-white shadow-float cursor-pointer">
          <PhoneOff size={26} />
        </button>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-hidden bg-scrim">{children}</div>
}

function Notice({ title, body, action }: { title: string; body?: string; action: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center text-white">
      <div className="max-w-[360px]">
        <div className="font-display text-[24px] font-bold">{title}</div>
        {body && <p className="mt-2 text-[15px] text-white/70">{body}</p>}
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </div>
  )
}

function CtrlButton({ label, off, disabled, onClick, children }: { label: string; off?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'pressable grid h-14 w-14 place-items-center rounded-full backdrop-blur-md cursor-pointer disabled:opacity-40',
        off ? 'bg-white text-ink' : 'bg-white/15 text-white',
      )}
    >
      {children}
    </button>
  )
}

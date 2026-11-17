import { AlertTriangle, CalendarCheck, FlaskConical, RotateCcw, Send, Sparkles, Video } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { SlotPicker } from '../../components/SlotPicker'
import { Avatar, Button, Card, cx, IconButton, PageHeader } from '../../components/ui'
import { ApiError, apiMode } from '../../lib/api'
import { fmtDay, fmtTime } from '../../lib/dates'
import { painChatApi, type ChatTurn, type PainChat as Chat } from '../../lib/painChat'
import { haptic, toast } from '../../lib/platform'
import { usePublicPhysio } from '../../lib/publicData'
import { useMe, useStore } from '../../lib/store'

const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.')

// Patient · talk to the physio assistant about your pain → free video consult (Betterhood pays)
export default function PainChat() {
  const { session, patient } = useMe()
  const token = session?.token ?? ''
  const nav = useNavigate()
  const [chat, setChat] = useState<Chat | null>()
  const [pending, setPending] = useState<ChatTurn>()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!apiMode || !token) return
    painChatApi
      .latest(token)
      .then((r) => (r.chat ? setChat(r.chat) : painChatApi.start(token).then((s) => setChat(s.chat))))
      .catch((e) => (toast(msg(e)), setChat(null)))
  }, [token])

  const turns = useMemo(() => [...(chat?.messages ?? []), ...(pending ? [pending] : [])], [chat, pending])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [turns.length, busy, chat?.status])

  if (!apiMode)
    return (
      <Page>
        <PageHeader title="Pain assistant" />
        <p className="py-10 text-center text-[14px] text-muted">The pain assistant needs the live app. It isn’t available in demo mode.</p>
      </Page>
    )
  if (!patient) return null

  const send = async () => {
    const t = text.trim()
    if (!t || !chat || busy) return
    setText('')
    setPending({ role: 'user', text: t, at: new Date().toISOString() })
    setBusy(true)
    try {
      const r = await painChatApi.send(token, chat.id, t)
      setChat(r.chat)
      if (r.chat.status === 'ready' && chat.status !== 'ready') haptic('success')
    } catch (e) {
      setText(t) // keep what they wrote so they can resend
      toast(msg(e))
    } finally {
      setPending(undefined)
      setBusy(false)
    }
  }

  const restart = async () => {
    if (busy) return
    setBusy(true)
    try {
      setChat((await painChatApi.start(token)).chat)
    } catch (e) {
      toast(msg(e))
    } finally {
      setBusy(false)
    }
  }

  const canType = chat && chat.status !== 'closed' && chat.status !== 'red_flag'

  return (
    <Page className="flex min-h-full flex-col">
      <PageHeader
        title="Pain assistant"
        subtitle="Free physio video consult, sponsored by Betterhood"
        right={
          chat && chat.messages.length > 1 ? (
            <IconButton aria-label="Start a new chat" title="Start a new chat" onClick={restart} disabled={busy}>
              <RotateCcw size={17} />
            </IconButton>
          ) : undefined
        }
      />
      {chat?.engine === 'scripted' && (
        <div className="-mt-1 mb-3 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-ink">
          <FlaskConical size={14} className="shrink-0 text-warn" /> Test mode: fixed questions. The AI assistant switches on once the server has an Anthropic key.
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2.5 pb-4">
        {chat === undefined && <div className="mx-auto mt-10 h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />}
        {turns.map((m, i) => (
          <Bubble key={`${m.at}-${i}`} turn={m} />
        ))}
        {busy && pending && <Typing />}

        {chat?.status === 'ready' && chat.physio && <ConsultCard chat={chat} onBooked={setChat} />}
        {chat?.status === 'ready' && !chat.physio && (
          <Card className="mt-2 p-4 text-[14px] text-muted">We’re finding the right physio for you. Our care team will call you shortly to set up your free consult.</Card>
        )}
        {chat?.status === 'red_flag' && (
          <Card className="mt-2 border-accent/40 bg-accent-soft p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <div className="text-[15px] font-semibold">Please see a doctor first</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink/80">
                  Some of what you described needs a medical check before physiotherapy. If it’s severe or getting worse, go to the nearest emergency department now.
                </p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={restart}>
                  Start a new chat
                </Button>
              </div>
            </div>
          </Card>
        )}
        {chat?.status === 'booked' && chat.booking && (
          <Card className="mt-2 border-ok/30 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ok/15 text-ok">
                <CalendarCheck size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">Free consult requested</div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                  {fmtDay(chat.booking.date)}, {fmtTime(chat.booking.time)} with {chat.physio?.name ?? 'your physio'}. They’ll confirm on WhatsApp. At the time, open Appointments and tap Join video call.
                </p>
                <Button size="sm" className="mt-3" onClick={() => nav('/me/appointments')}>
                  View appointments
                </Button>
              </div>
            </div>
          </Card>
        )}
        <div ref={end} />
      </div>

      {canType && (
        <form
          className="sticky bottom-0 -mx-5 flex items-center gap-2 border-t border-line bg-bg px-5 py-3 safe-bottom"
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder={chat.status === 'open' ? 'Describe your pain…' : 'Ask a follow-up question…'}
            className="h-12 flex-1 rounded-full border border-line bg-surface px-4 text-[15px] outline-none focus:border-brand"
          />
          <button aria-label="Send" disabled={!text.trim() || busy} className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white disabled:opacity-40 cursor-pointer">
            <Send size={18} />
          </button>
        </form>
      )}
      <p className="pb-2 text-center text-[11px] text-faint">Guidance only, not a diagnosis. In an emergency, call 112.</p>
    </Page>
  )
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const mine = turn.role === 'user'
  return (
    <div className={cx('flex items-end gap-2', mine && 'justify-end')}>
      {!mine && (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
          <Sparkles size={14} />
        </span>
      )}
      <div className={cx('max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed', mine ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm border border-line bg-surface')}>
        {turn.text}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div className="flex items-end gap-2" aria-label="Assistant is typing">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <Sparkles size={14} />
      </span>
      <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    </div>
  )
}

/** The hand-off: who the physio is, and a time picker for the free video consult. */
function ConsultCard({ chat, onBooked }: { chat: Chat; onBooked: (c: Chat) => void }) {
  const store = useStore()
  const nav = useNavigate()
  const { session, patient } = useMe()
  const ph = chat.physio!
  const { physio, cal, loading } = usePublicPhysio(ph.slug)
  const [picking, setPicking] = useState(false)
  const [date, setDate] = useState<string>()
  const [time, setTime] = useState<string>()
  const [saving, setSaving] = useState(false)
  const opts = useMemo(() => ({ visitType: 'teleconsult' as const, forPatient: true }), [])
  const bookPath = patient?.physioId === ph.id ? '/me/book' : `/dr/${ph.slug}/book`

  const book = async () => {
    if (!date || !time || !session?.token) return
    setSaving(true)
    try {
      const r = await painChatApi.book(session.token, chat.id, date, time)
      haptic('success')
      toast('Free consult requested')
      onBooked(r.chat)
      await store.refresh() // they now have a physio and an appointment
    } catch (e) {
      toast(msg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-2 overflow-hidden p-0">
      <div className="bg-hero p-4 text-white">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-white/75">{chat.freeConsultUsed ? 'Your physio' : 'Your free video consult'}</div>
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={ph.name} photo={ph.photo} size={52} />
          <div className="min-w-0">
            <div className="text-[17px] font-semibold">{ph.name}</div>
            <div className="truncate text-[13px] text-white/80">
              {[ph.qualification, ph.experienceYrs ? `${ph.experienceYrs} yrs experience` : '', ph.verification === 'verified' ? 'Verified' : ''].filter(Boolean).join(' · ') || 'Physiotherapist'}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[13px] text-white/85">
          <Video size={15} /> Video call in the app{chat.freeConsultUsed ? '' : ' · '}{!chat.freeConsultUsed && <span className="font-semibold text-white">₹0, Betterhood pays</span>}
        </div>
      </div>

      <div className="p-4">
        {chat.freeConsultUsed ? (
          <>
            <p className="text-[14px] text-muted">You’ve already used your free consult. You can still book a video consult or a visit with {ph.name}.</p>
            <Button size="md" block className="mt-3" onClick={() => nav(`${bookPath}?visit=teleconsult`)}>
              <Video size={17} /> Book a video consult
            </Button>
            {(physio?.consult.inClinic.enabled || physio?.consult.homeVisit.enabled) && (
              <Button size="md" variant="secondary" block className="mt-2" onClick={() => nav(bookPath)}>
                Book a {[physio.consult.homeVisit.enabled && 'home', physio.consult.inClinic.enabled && 'clinic'].filter(Boolean).join(' or ')} visit
              </Button>
            )}
          </>
        ) : !picking ? (
          <Button size="md" block onClick={() => setPicking(true)}>
            Pick a time for your free consult
          </Button>
        ) : loading || !physio || !cal ? (
          <div className="mx-auto my-6 h-7 w-7 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading times" />
        ) : (
          <>
            <SlotPicker
              physio={physio}
              cal={cal}
              opts={opts}
              date={date}
              time={time}
              onDate={(d) => (setDate(d), setTime(undefined))}
              onTime={setTime}
              layout="stacked"
            />
            <Button size="md" block className="mt-4" disabled={!date || !time || saving} onClick={book}>
              {saving ? 'Booking…' : date && time ? `Book free consult · ${fmtDay(date)}, ${fmtTime(time)}` : 'Pick a day and time'}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

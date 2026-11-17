import { AlertTriangle, ArrowUpRight, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge, type BadgeTone, cx } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtPhone } from '../../lib/logic'
import { toast } from '../../lib/platform'
import { ago, day } from './Journeys'
import { BarList, countBy, fmtInt, fmtPct, Funnel, PageHeading, Panel, PanelHead, type Period, periodWords, Segmented, Tile } from './kit'

/** Pain assistant chats in the consumer app (backend: GET /admin/pain-chats). */

export type ChatStatus = 'open' | 'ready' | 'red_flag' | 'booked' | 'closed'
export interface ChatRow {
  id: string
  status: ChatStatus
  engine: 'claude' | 'gemini' | 'scripted'
  area: string
  stage: string
  severity: number
  redFlags: string[]
  summary?: string
  userMessages: number
  firstMessage?: string
  patient: { id: string; name: string; phone: string; city?: string }
  physioName?: string
  booking?: { id: string; date: string; time: string; status: string }
  createdAt: string
  updatedAt: string
}

const AREA: Record<string, string> = {
  back: 'Back',
  neck: 'Neck',
  shoulder: 'Shoulder',
  knee: 'Knee',
  hip: 'Hip',
  ankle_foot: 'Ankle / foot',
  elbow_wrist_hand: 'Elbow / wrist / hand',
  other: 'Other',
  unknown: 'Not known yet',
}
const STAGE: Record<string, string> = { acute: 'Acute', subacute: 'Subacute', chronic: 'Chronic', unknown: '' }
const STATUS: Record<ChatStatus, { label: string; tone: BadgeTone }> = {
  open: { label: 'Chatting', tone: 'muted' },
  ready: { label: 'Matched, not booked', tone: 'warn' },
  booked: { label: 'Consult booked', tone: 'ok' },
  red_flag: { label: 'Sent to a doctor', tone: 'accent' },
  closed: { label: 'Started over', tone: 'muted' },
}
const BOOKING: Record<string, string> = {
  requested: 'waiting for the physio',
  awaiting: 'waiting for the physio',
  confirmed: 'confirmed',
  reminder_sent: 'confirmed',
  reschedule: 'being rescheduled',
  checked_in: 'in progress',
  done: 'done',
  no_show: 'no-show',
  cancelled: 'cancelled',
}
const ENGINE = { claude: 'Claude', gemini: 'Gemini', scripted: 'Fixed questions (test mode)' }

type Filter = 'all' | ChatStatus
const problem = (c: ChatRow) => [AREA[c.area] ?? c.area, STAGE[c.stage], c.severity >= 0 && c.area !== 'unknown' ? `${c.severity}/10` : ''].filter(Boolean).join(' · ')

export function PainChatsPage({ chats, period, q, token }: { chats: ChatRow[]; period: Period; q: string; token?: string }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<ChatRow>()

  const inPeriod = useMemo(() => {
    const since = Date.now() - Number(period) * 864e5
    return chats.filter((c) => Date.parse(c.createdAt) >= since)
  }, [chats, period])

  const n = (f: (c: ChatRow) => boolean) => inPeriod.filter(f).length
  const started = inPeriod.length
  const answered = n((c) => c.userMessages > 0)
  const matched = n((c) => c.status === 'ready' || c.status === 'booked')
  const booked = n((c) => c.status === 'booked')
  const done = n((c) => c.booking?.status === 'done')
  const redFlags = n((c) => c.status === 'red_flag')
  const pct = (a: number, b: number) => (b ? fmtPct(a / b) : '-')

  const needle = q.trim().toLowerCase()
  const rows = inPeriod.filter(
    (c) => (filter === 'all' || c.status === filter) && (!needle || `${c.patient.name} ${c.patient.phone} ${c.patient.city ?? ''} ${c.area} ${c.physioName ?? ''}`.toLowerCase().includes(needle)),
  )
  const count = (s: ChatStatus) => inPeriod.filter((c) => c.status === s).length

  return (
    <>
      <PageHeading title="Pain chats">
        Consumers who described their pain to the assistant in the app, what it understood, and whether they booked the free video consult Betterhood pays for. Showing the {periodWords(period)}.
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Chats started" value={fmtInt(started)} note={`${fmtInt(answered)} replied at least once`} />
        <Tile label="Matched with a physio" value={fmtInt(matched)} note={`${pct(matched, answered)} of those who replied`} />
        <Tile label="Free consults booked" value={fmtInt(booked)} note={`${pct(booked, matched)} of matched · ${fmtInt(done)} done`} tone={booked ? 'good' : undefined} />
        <Tile label="Sent to a doctor" value={fmtInt(redFlags)} note="Red flags: no consult offered" tone={redFlags ? 'bad' : undefined} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <Panel className="pb-5">
          <PanelHead title="From chat to consult" desc="Each step only counts chats that reached the one above." />
          <div className="px-5 pt-4">
            <Funnel
              steps={[
                { label: 'Started a chat', n: started },
                { label: 'Replied', n: answered, follows: true },
                { label: 'Matched with a physio', n: matched, follows: true, hint: 'The assistant had enough to hand over (or 8 messages passed).' },
                { label: 'Booked the free consult', n: booked, follows: true },
                { label: 'Consult done', n: done, follows: true, hint: 'The physio marked the booking done.' },
              ]}
            />
          </div>
        </Panel>
        <Panel className="pb-4">
          <PanelHead title="Where it hurts" desc="Chats where the area is known." />
          <div className="px-3 pt-3">
            <BarList rows={countBy(inPeriod.filter((c) => c.area !== 'unknown'), (c) => AREA[c.area] ?? c.area)} empty="No chats got that far yet." />
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h3 className="text-[15px] font-semibold">
            {fmtInt(rows.length)} chat{rows.length === 1 ? '' : 's'}
          </h3>
          <div className="max-w-full overflow-x-auto">
            <Segmented
              label="Status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All ${started}` },
                { value: 'open', label: `Chatting ${count('open')}` },
                { value: 'ready', label: `Not booked ${count('ready')}` },
                { value: 'booked', label: `Booked ${count('booked')}` },
                { value: 'red_flag', label: `Doctor ${count('red_flag')}` },
              ]}
            />
          </div>
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[860px] text-left text-[14px]">
            <thead className="border-b border-line text-[12px] uppercase tracking-wider text-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">Consumer</th>
                <th className="px-4 py-3 font-semibold">Problem</th>
                <th className="px-4 py-3 font-semibold">Messages</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Physio and consult</th>
                <th className="px-4 py-3 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    {started ? 'No chats match.' : `No pain chats in the ${periodWords(period)}.`}
                  </td>
                </tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} onClick={() => setOpen(c)} className="cursor-pointer hover:bg-track/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{c.patient.name}</div>
                    <div className="text-[12px] text-muted">
                      {fmtPhone(c.patient.phone)}
                      {c.patient.city ? ` · ${c.patient.city}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {problem(c)}
                    {c.firstMessage && <div className="max-w-[260px] truncate text-[12px] text-muted">“{c.firstMessage}”</div>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">{c.userMessages}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {c.physioName ?? <span className="text-faint">-</span>}
                    {c.booking && (
                      <div className="text-[12px] text-muted">
                        {day(`${c.booking.date}T${c.booking.time}:00`)} {c.booking.time} · {BOOKING[c.booking.status] ?? c.booking.status}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{ago(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <ChatDrawer chat={open} token={token} onClose={() => setOpen(undefined)} />
    </>
  )
}

function ChatDrawer({ chat, token, onClose }: { chat?: ChatRow; token?: string; onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; at: string }[]>()

  useEffect(() => {
    setMessages(undefined)
    if (!chat) return
    let live = true
    api<{ messages: NonNullable<typeof messages> }>(`/admin/pain-chats/${encodeURIComponent(chat.id)}`, { token })
      .then((r) => live && setMessages(r.messages))
      .catch((e) => toast(e instanceof Error ? e.message : 'Couldn’t load the chat'))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      live = false
      window.removeEventListener('keydown', onKey)
    }
  }, [chat, token, onClose])

  if (!chat) return null
  const facts: [string, React.ReactNode][] = [
    ['Status', <Badge tone={STATUS[chat.status].tone}>{STATUS[chat.status].label}</Badge>],
    ['Problem', problem(chat) || '-'],
    ['Physio', chat.physioName ?? 'Not matched yet'],
    ['Consult', chat.booking ? `${day(`${chat.booking.date}T${chat.booking.time}:00`)} ${chat.booking.time} · ${BOOKING[chat.booking.status] ?? chat.booking.status}` : 'Not booked'],
    ['Answered by', ENGINE[chat.engine] ?? chat.engine],
    ['Started', `${day(chat.createdAt)} (${ago(chat.createdAt)})`],
    ['Last message', ago(chat.updatedAt)],
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="anim-fade absolute inset-0 bg-scrim/45" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={`Pain chat with ${chat.patient.name}`} className="relative flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-bg shadow-float">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-bg px-5 py-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-faint">Pain chat</div>
            <h2 className="truncate font-display text-[22px] font-bold">{chat.patient.name}</h2>
            <div className="flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
              {fmtPhone(chat.patient.phone)}
              {chat.patient.city ? ` · ${chat.patient.city}` : ''}
              <a href={`https://wa.me/91${chat.patient.phone}`} target="_blank" rel="noopener" className="flex items-center gap-1 font-semibold text-brand">
                WhatsApp <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted cursor-pointer hover:text-brand">
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-[14px]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>

          {chat.redFlags.length > 0 && (
            <div className="rounded-xl border border-accent/30 bg-accent-soft px-3.5 py-3 text-[14px]">
              <div className="flex items-center gap-1.5 font-semibold text-danger">
                <AlertTriangle size={15} /> Red flags
              </div>
              <ul className="mt-1 list-disc pl-5 text-ink">
                {chat.redFlags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {chat.summary && (
            <div className="rounded-xl bg-brand-soft/60 px-3.5 py-3 text-[14px]">
              <div className="flex items-center gap-1.5 font-semibold text-brand">
                <Sparkles size={15} /> Summary for the physio
              </div>
              <p className="mt-1 whitespace-pre-wrap text-ink">{chat.summary}</p>
            </div>
          )}

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-faint">Conversation</h3>
            {!messages ? (
              <div className="mt-4 h-6 w-6 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {messages.map((m, i) => (
                  <div key={i} className={cx('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug', m.role === 'user' ? 'self-end rounded-br-md bg-brand text-white' : 'self-start rounded-bl-md border border-line bg-surface text-ink')}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <div className={cx('mt-1 text-[11px]', m.role === 'user' ? 'text-white/70' : 'text-faint')}>
                      {new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}

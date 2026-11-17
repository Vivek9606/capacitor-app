import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Globe,
  IndianRupee,
  ListChecks,
  MessageCircleHeart,
  Megaphone,
  NotebookPen,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../../components/ui'
import { api } from '../../lib/api'
import { type Product, productUrl, recommendedFor } from '../../lib/explore'
import { fmtPhone } from '../../lib/logic'
import { toast } from '../../lib/platform'
import { ago, C_STAGE, type ConsumerRow, day, formName, HEALTH, type Journeys, P_STAGE, type PhysioRow, type WebRow } from './Journeys'
import type { ChatRow } from './PainChats'

/**
 * Mind-map views of the two journeys. The ecosystem map shows where people came into Betterhood and how far
 * they got; the person map puts one consumer (or physio) at the centre with a branch per stage and the data
 * each stage holds, plus what to send them next.
 */

// ---------------------------------------------------------------------------------------------------------------
// palette (same hues as seo-dashboard-v2)

const C = {
  blue: 'hsl(221 83% 53%)',
  violet: 'hsl(262 75% 60%)',
  indigo: 'hsl(243 75% 59%)',
  sky: 'hsl(199 89% 42%)',
  teal: 'hsl(186 72% 33%)',
  green: 'hsl(152 69% 36%)',
  emerald: 'hsl(160 84% 28%)',
  amber: 'hsl(35 92% 42%)',
  rose: 'hsl(350 72% 50%)',
  slate: 'hsl(220 9% 46%)',
}

// ---------------------------------------------------------------------------------------------------------------
// the map itself

export interface Leaf {
  label: string
  value: ReactNode
  href?: string
  tone?: 'good' | 'bad' | 'warn'
  onClick?: () => void
  active?: boolean
}
export interface Branch {
  key: string
  title: string
  icon: ReactNode
  color: string
  /** False: the person hasn't reached this stage. Drawn dashed so the gaps stand out. */
  reached: boolean
  /** Short line under the title, e.g. "3 assessments" or "Not yet". */
  summary?: string
  when?: string
  leaves: Leaf[]
  footer?: ReactNode
  onClick?: () => void
  active?: boolean
}

const LEAVES_SHOWN = 6

function BranchCard({ b, n, refFn }: { b: Branch; n: number; refFn: (el: HTMLDivElement | null) => void }) {
  const [all, setAll] = useState(false)
  const leaves = all ? b.leaves : b.leaves.slice(0, LEAVES_SHOWN)
  return (
    <div
      ref={refFn}
      onClick={b.onClick}
      className={cx(
        'relative rounded-xl border bg-surface p-3.5 text-left transition-shadow',
        b.reached ? 'border-line shadow-[0_1px_2px_rgba(16,24,40,0.04)]' : 'border-dashed border-line bg-surface/60',
        b.onClick && 'cursor-pointer hover:shadow-md',
        b.active && 'ring-2 ring-offset-2 ring-offset-bg',
      )}
      style={{ ...(b.active ? ({ '--tw-ring-color': b.color } as React.CSSProperties) : {}), borderLeft: `3px ${b.reached ? 'solid' : 'dashed'} ${b.color}` }}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${b.color} 12%, transparent)`, color: b.color }}>
          {b.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[11px] text-faint">{String(n).padStart(2, '0')}</span>
            <h4 className="truncate text-[14px] font-semibold text-ink">{b.title}</h4>
          </div>
          <div className={cx('text-[12px]', b.reached ? 'text-muted' : 'text-faint')}>
            {b.summary ?? (b.reached ? '' : 'Not yet')}
            {b.when && <span className="text-faint"> · {b.when}</span>}
          </div>
        </div>
      </div>
      {leaves.length > 0 && (
        <dl className="mt-2.5 grid grid-cols-[minmax(84px,auto)_1fr] gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[12.5px]">
          {leaves.map((l, i) => (
            <div key={`${l.label}-${i}`} className="contents">
              <dt className="truncate text-muted">{l.label}</dt>
              <dd
                onClick={
                  l.onClick
                    ? (e) => {
                        e.stopPropagation()
                        l.onClick!()
                      }
                    : undefined
                }
                className={cx(
                  'min-w-0 break-words font-medium tabular-nums',
                  l.tone === 'good' ? 'text-ok' : l.tone === 'bad' ? 'text-danger' : l.tone === 'warn' ? 'text-warn' : 'text-ink',
                  l.onClick && 'cursor-pointer rounded px-1 -mx-1 hover:bg-track',
                  l.active && 'bg-track',
                )}
              >
                {l.href ? (
                  <a href={l.href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 hover:underline" style={{ color: b.color }}>
                    {l.value} <ArrowUpRight size={11} className="shrink-0" />
                  </a>
                ) : (
                  l.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {b.leaves.length > LEAVES_SHOWN && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setAll(!all)
          }}
          className="mt-1.5 text-[12px] font-medium text-muted cursor-pointer hover:text-ink"
        >
          {all ? 'Show less' : `+${b.leaves.length - LEAVES_SHOWN} more`}
        </button>
      )}
      {b.footer && <div className="mt-2.5 border-t border-line pt-2.5">{b.footer}</div>}
    </div>
  )
}

/** Centre node with branches on both sides, joined by curves. Early stages on the left, later ones on the right. */
export function MindMap({ center, branches }: { center: ReactNode; branches: Branch[] }) {
  const box = useRef<HTMLDivElement>(null)
  const hub = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLDivElement>())
  const [paths, setPaths] = useState<{ key: string; d: string; color: string; dashed: boolean }[]>([])
  const half = Math.ceil(branches.length / 2)
  const left = branches.slice(0, half)
  const right = branches.slice(half)

  const measure = useCallback(() => {
    const b = box.current?.getBoundingClientRect()
    const h = hub.current?.getBoundingClientRect()
    if (!b || !h || window.innerWidth < 1024) return setPaths([])
    const out: typeof paths = []
    branches.forEach((br, i) => {
      const el = nodes.current.get(br.key)
      if (!el) return
      const r = el.getBoundingClientRect()
      const isLeft = i < half
      const x1 = (isLeft ? h.left : h.right) - b.left
      const y1 = h.top + h.height / 2 - b.top
      const x2 = (isLeft ? r.right : r.left) - b.left
      const y2 = r.top + Math.min(r.height / 2, 28) - b.top
      const mid = (x1 + x2) / 2
      out.push({ key: br.key, d: `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`, color: br.color, dashed: !br.reached })
    })
    setPaths(out)
  }, [branches, half])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (box.current) ro.observe(box.current)
    nodes.current.forEach((el) => ro.observe(el))
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const ref = (key: string) => (el: HTMLDivElement | null) => {
    if (el) nodes.current.set(key, el)
    else nodes.current.delete(key)
  }

  return (
    <div ref={box} className="relative">
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" aria-hidden>
        {paths.map((p) => (
          <g key={p.key}>
            <path d={p.d} fill="none" stroke={p.color} strokeOpacity={p.dashed ? 0.35 : 0.55} strokeWidth={p.dashed ? 1.25 : 1.75} strokeDasharray={p.dashed ? '4 4' : undefined} />
          </g>
        ))}
      </svg>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,270px)_minmax(0,1fr)] lg:items-center lg:gap-x-14">
        <div ref={hub} className="relative z-[1] lg:order-2">
          {center}
        </div>
        <div className="relative z-[1] flex flex-col gap-3 lg:order-1">
          {left.map((b, i) => (
            <BranchCard key={b.key} b={b} n={i + 1} refFn={ref(b.key)} />
          ))}
        </div>
        <div className="relative z-[1] flex flex-col gap-3 lg:order-3">
          {right.map((b, i) => (
            <BranchCard key={b.key} b={b} n={half + i + 1} refFn={ref(b.key)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Hub({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[hsl(222_47%_11%)] p-5 text-center text-white shadow-lg">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">{eyebrow}</div>
      <div className="mt-1.5 text-[20px] font-semibold leading-tight tracking-tight">{title}</div>
      {sub && <div className="mt-1 text-[13px] text-white/70">{sub}</div>}
      {children && <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">{children}</div>}
    </div>
  )
}
const HubChip = ({ children }: { children: ReactNode }) => <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-white/85">{children}</span>

// ---------------------------------------------------------------------------------------------------------------
// where people came from

type ConsumerChannel = 'lead' | 'website' | 'app' | 'physio'
const CONSUMER_CHANNEL: Record<ConsumerChannel, { title: string; icon: ReactNode; color: string; blurb: string }> = {
  lead: { title: 'Website, no account yet', icon: <Globe size={16} />, color: C.sky, blurb: 'Left a form or took an assessment on betterhood.in but hasn’t signed up in the app' },
  website: { title: 'Website, then the app', icon: <Globe size={16} />, color: C.blue, blurb: 'Used betterhood.in first, then signed up' },
  app: { title: 'Signed up in the app', icon: <UserPlus size={16} />, color: C.violet, blurb: 'Found the app on their own' },
  physio: { title: 'Added by their physio', icon: <Stethoscope size={16} />, color: C.teal, blurb: 'A physio added them as a patient' },
}
export const consumerChannel = (c: Pick<ConsumerRow, 'origin' | 'firstWebAt' | 'createdAt'>): Exclude<ConsumerChannel, 'lead'> =>
  c.firstWebAt && c.firstWebAt <= c.createdAt ? 'website' : c.origin === 'physio' ? 'physio' : 'app'

type PhysioChannel = 'invited' | 'website' | 'self'
const PHYSIO_CHANNEL: Record<PhysioChannel, { title: string; icon: ReactNode; color: string; blurb: string }> = {
  invited: { title: 'Invited by a physio', icon: <Users size={16} />, color: C.teal, blurb: 'Joined through another physio’s invite' },
  website: { title: 'Website first', icon: <Globe size={16} />, color: C.blue, blurb: 'Used betterhood.in before signing up' },
  self: { title: 'Signed up directly', icon: <UserPlus size={16} />, color: C.violet, blurb: 'Downloaded the app and signed up' },
}
export const physioChannel = (p: Pick<PhysioRow, 'wasReferred' | 'firstWebAt' | 'createdAt'>): PhysioChannel =>
  p.wasReferred ? 'invited' : p.firstWebAt && p.firstWebAt <= p.createdAt ? 'website' : 'self'

const C_ORDER = Object.keys(C_STAGE) as ConsumerRow['stage'][]
const P_ORDER = Object.keys(P_STAGE) as PhysioRow['stage'][]

// ---------------------------------------------------------------------------------------------------------------
// ecosystem maps

type Pick_ = { channel: string; stage?: string }

function PeopleList({
  title,
  rows,
}: {
  title: string
  rows: { id: string; name: string; sub: string; stage: string; health?: keyof typeof HEALTH; last?: string; onClick: () => void }[]
}) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <span className="text-[13px] text-muted">{rows.length} {rows.length === 1 ? 'person' : 'people'} · click one to open their map</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-[14px] text-muted">Nobody here yet.</p>
      ) : (
        <ul className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-3">
          {rows.slice(0, 300).map((r) => (
            <li key={r.id}>
              <button onClick={r.onClick} className="flex w-full items-center gap-3 px-5 py-3 text-left cursor-pointer hover:bg-track/60 sm:border-b sm:border-line">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-track text-[13px] font-semibold text-muted">{r.name.slice(0, 1).toUpperCase() || '?'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">{r.name}</span>
                  <span className="block truncate text-[12px] text-muted">{r.sub}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px] font-medium text-ink">{r.stage}</span>
                  {r.health && (
                    <span className={cx('block text-[11px]', r.health === 'active' ? 'text-ok' : r.health === 'slipping' ? 'text-warn' : 'text-faint')}>
                      {HEALTH[r.health].label}
                      {r.last ? ` · ${r.last}` : ''}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ConsumerEcosystem({ j, chats, q, onOpen, onLead }: { j: Journeys; chats?: ChatRow[]; q: string; onOpen: (row: ConsumerRow) => void; onLead: (row: WebRow) => void }) {
  const [pick, setPick] = useState<Pick_>()
  const chatted = useMemo(() => new Set((chats ?? []).filter((c) => c.userMessages > 0).map((c) => c.patient.id)), [chats])
  const leads = useMemo(() => j.web.recent.filter((w) => !w.patientId && !w.physioId), [j])
  const needle = q.trim().toLowerCase()
  const match = (s: string) => !needle || s.toLowerCase().includes(needle)

  const by = useMemo(() => {
    const m: Record<Exclude<ConsumerChannel, 'lead'>, ConsumerRow[]> = { website: [], app: [], physio: [] }
    for (const c of j.consumers) m[consumerChannel(c)].push(c)
    return m
  }, [j])

  const stageLeaves = (key: ConsumerChannel, rows: ConsumerRow[]): Leaf[] => [
    ...C_ORDER.map((s) => ({ s, n: rows.filter((r) => r.stage === s).length }))
      .filter((x) => x.n > 0)
      .map(({ s, n }) => ({ label: C_STAGE[s], value: n, onClick: () => setPick({ channel: key, stage: s }), active: pick?.channel === key && pick.stage === s })),
    { label: 'Used pain chat', value: rows.filter((r) => chatted.has(r.id)).length, onClick: () => setPick({ channel: key, stage: 'chat' }), active: pick?.channel === key && pick.stage === 'chat' },
    { label: 'Slipping', value: rows.filter((r) => r.health === 'slipping').length, tone: 'warn', onClick: () => setPick({ channel: key, stage: 'slipping' }), active: pick?.channel === key && pick.stage === 'slipping' },
  ]

  const branches: Branch[] = [
    {
      key: 'lead',
      ...CONSUMER_CHANNEL.lead,
      reached: leads.length > 0,
      summary: `${leads.length} recent submission${leads.length === 1 ? '' : 's'}`,
      leaves: [
        { label: 'Assessments', value: leads.filter((w) => w.kind === 'assessment').length },
        { label: 'Lead forms', value: leads.filter((w) => w.kind === 'form').length },
        { label: 'Left a phone', value: leads.filter((w) => w.phone).length, tone: 'good' },
      ],
      onClick: () => setPick({ channel: 'lead' }),
      active: pick?.channel === 'lead',
    },
    ...(['website', 'app', 'physio'] as const).map((k) => ({
      key: k,
      ...CONSUMER_CHANNEL[k],
      reached: by[k].length > 0,
      summary: `${by[k].length} consumer${by[k].length === 1 ? '' : 's'} · ${CONSUMER_CHANNEL[k].blurb.toLowerCase()}`,
      leaves: stageLeaves(k, by[k]),
      onClick: () => setPick({ channel: k }),
      active: pick?.channel === k && !pick.stage,
    })),
  ]

  const list = (() => {
    if (!pick) return undefined
    if (pick.channel === 'lead')
      return {
        title: CONSUMER_CHANNEL.lead.title,
        rows: leads
          .filter((w) => match(`${w.name ?? ''} ${w.phone ?? ''} ${w.form}`))
          .map((w) => ({ id: w.id, name: w.name || (w.phone ? fmtPhone(w.phone) : 'Anonymous visitor'), sub: formName(w), stage: w.kind === 'assessment' ? 'Website assessment' : 'Website form', last: ago(w.createdAt), onClick: () => onLead(w) })),
      }
    const k = pick.channel as Exclude<ConsumerChannel, 'lead'>
    const rows = by[k].filter((r) =>
      !pick.stage ? true : pick.stage === 'chat' ? chatted.has(r.id) : pick.stage === 'slipping' ? r.health === 'slipping' : r.stage === pick.stage,
    )
    const label = !pick.stage ? '' : pick.stage === 'chat' ? ' · used pain chat' : pick.stage === 'slipping' ? ' · slipping' : ` · ${C_STAGE[pick.stage as ConsumerRow['stage']]}`
    return {
      title: `${CONSUMER_CHANNEL[k].title}${label}`,
      rows: rows
        .filter((r) => match(`${r.name} ${r.phone} ${r.city ?? ''} ${r.tags.join(' ')}`))
        .map((r) => ({ id: r.id, name: r.name, sub: [r.city, r.condition ?? r.painArea, r.physioName].filter(Boolean).join(' · ') || fmtPhone(r.phone), stage: C_STAGE[r.stage], health: r.health, last: ago(r.lastActiveAt), onClick: () => onOpen(r) })),
    }
  })()

  const total = j.consumers.length
  return (
    <>
      <MindMap
        center={
          <Hub eyebrow="Consumers" title={`${total} in Betterhood`} sub="Where they came in, and how far they got">
            <HubChip>{j.health.consumers.active} active</HubChip>
            <HubChip>{j.health.consumers.slipping} slipping</HubChip>
            <HubChip>{leads.length} website leads</HubChip>
          </Hub>
        }
        branches={branches}
      />
      {list ? <PeopleList title={list.title} rows={list.rows} /> : <p className="text-center text-[13px] text-muted">Click a branch, or a stage inside one, to see who’s there.</p>}
    </>
  )
}

export function PhysioEcosystem({ j, q, onOpen }: { j: Journeys; q: string; onOpen: (row: PhysioRow) => void }) {
  const [pick, setPick] = useState<Pick_>()
  const by = useMemo(() => {
    const m: Record<PhysioChannel, PhysioRow[]> = { invited: [], website: [], self: [] }
    for (const p of j.physios) m[physioChannel(p)].push(p)
    return m
  }, [j])
  const needle = q.trim().toLowerCase()

  const branches: Branch[] = (['self', 'website', 'invited'] as const).map((k) => ({
    key: k,
    ...PHYSIO_CHANNEL[k],
    reached: by[k].length > 0,
    summary: `${by[k].length} physio${by[k].length === 1 ? '' : 's'} · ${PHYSIO_CHANNEL[k].blurb.toLowerCase()}`,
    leaves: [
      ...P_ORDER.map((s) => ({ s, n: by[k].filter((r) => r.stage === s).length }))
        .filter((x) => x.n > 0)
        .map(({ s, n }) => ({ label: P_STAGE[s], value: n, onClick: () => setPick({ channel: k, stage: s }), active: pick?.channel === k && pick.stage === s })),
      { label: 'Verified', value: by[k].filter((r) => r.verification === 'verified').length, tone: 'good' as const },
      { label: 'Listed on betterhood.in', value: by[k].filter((r) => r.listing?.status === 'live').length },
    ],
    onClick: () => setPick({ channel: k }),
    active: pick?.channel === k && !pick.stage,
  }))

  const rows = pick
    ? by[pick.channel as PhysioChannel]
        .filter((r) => !pick.stage || r.stage === pick.stage)
        .filter((r) => !needle || `${r.name} ${r.phone} ${r.place ?? ''} ${r.tags.join(' ')}`.toLowerCase().includes(needle))
    : []
  const total = j.physios.length

  return (
    <>
      <MindMap
        center={
          <Hub eyebrow="Physios" title={`${total} on Betterhood`} sub="How they joined, and how far they’ve set up their practice">
            <HubChip>{j.health.physios.active} active</HubChip>
            <HubChip>{j.physios.filter((p) => p.verification === 'verified').length} verified</HubChip>
            <HubChip>{j.physios.reduce((a, p) => a + p.patients, 0)} patients</HubChip>
          </Hub>
        }
        branches={branches}
      />
      {pick ? (
        <PeopleList
          title={`${PHYSIO_CHANNEL[pick.channel as PhysioChannel].title}${pick.stage ? ` · ${P_STAGE[pick.stage as PhysioRow['stage']]}` : ''}`}
          rows={rows.map((r) => ({ id: r.id, name: r.name, sub: [r.place, `${r.patients} patients`].filter(Boolean).join(' · '), stage: P_STAGE[r.stage], health: r.health, last: ago(r.lastActiveAt), onClick: () => onOpen(r) }))}
        />
      ) : (
        <p className="text-center text-[13px] text-muted">Click a branch, or a stage inside one, to see who’s there.</p>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// one person's map

interface WebItem {
  id: string
  kind: 'form' | 'assessment'
  form: string
  page?: string
  title?: string
  result?: string
  condition?: string
  area?: string
  createdAt: string
}
interface PatientJourney {
  type: 'patient'
  profile: {
    id: string
    name: string
    phone: string
    email?: string
    city?: string
    age?: number
    sex?: string
    condition?: string
    selfSignup: boolean
    createdAt: string
    consentAt?: string
    lastSeenAt?: string
    physio?: { id: string; name: string; slug: string; matchStatus?: string; since?: string }
    dischargedAt?: string
    discharge?: { outcome?: string; note?: string }
  }
  web: WebItem[]
  assessments: { id: string; title: string; area: string; kind: string; result?: string; condition?: string; advisory?: string; scores?: { overall?: number }; source: string; createdAt: string }[]
  chats: { id: string; status: string; engine: string; area: string; stage: string; severity: number; redFlags: string[]; summary?: string; userMessages: number; physioName?: string; createdAt: string }[]
  bookings: { id: string; date: string; time: string; visitType: string; status: string; source?: string; sponsored?: boolean; physioName: string; createdAt?: string }[]
  plans: { id: string; title: string; status: string; weeks: number; daysPerWeek: number; sentAt?: string; openedAt?: string; done: number; skipped: number; lastDay?: string; avgPain?: number; firstPain?: number; lastPain?: number }[]
  messages: { fromPatient: number; fromPhysio: number; lastAt?: string }
  invoices: { number: string; total: number; status: string; method?: string; createdAt: string; paidAt?: string }[]
  consents: { title: string; status: string; signedAt?: string }[]
  tags: string[]
  notes: number
}
interface PhysioJourney {
  type: 'physio'
  profile: PhysioRow & { qualification?: string; experienceYrs?: number; councilRegNo?: string; referredBy?: string; slug: string }
  web: WebItem[]
  listing?: { slug: string; status: string; url: string; publishedAt?: string }
  patients: { id: string; name: string; selfSignup: boolean; condition?: string; createdAt: string; dischargedAt?: string; lastSession?: string }[]
  plans: { status: string; n: number; firstAt?: string }[]
  bookings: { source: string; visitType: string; status: string; sponsored: boolean; n: number; firstAt?: string }[]
  invoices: { status: string; n: number; total: number }[]
  groups: { title: string; date: string; time: string; status: string; capacity: number }[]
  referrals: { name: string; status: string; at?: string }[]
  tags: string[]
  notes: number
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const words = (s?: string) => (s ? s.replace(/_/g, ' ') : '')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const daysSince = (d?: string) => (d ? Math.floor((Date.now() - Date.parse(d.length === 10 ? `${d}T12:00:00+05:30` : d)) / 864e5) : undefined)
const AREA: Record<string, string> = { back: 'Back', neck: 'Neck', shoulder: 'Shoulder', knee: 'Knee', hip: 'Hip', ankle_foot: 'Ankle / foot', elbow_wrist_hand: 'Elbow / wrist / hand' }
const VISIT: Record<string, string> = { in_clinic: 'Clinic', home_visit: 'Home', teleconsult: 'Video' }

const wa = (phone: string, text: string) => `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`

function WaButton({ phone, text, label }: { phone: string; text: string; label: string }) {
  return (
    <a
      href={wa(phone, text)}
      target="_blank"
      rel="noopener"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#128c7e] px-3 text-[12.5px] font-semibold text-white hover:bg-[#0d7064]"
    >
      {label} <ArrowUpRight size={13} />
    </a>
  )
}

/** What to say next, from the gaps in the journey. The first one is the one to act on. */
function consumerNudges(d: PatientJourney, products: Product[]): { why: string; say: string }[] {
  const first = d.profile.name.split(' ')[0]
  const out: { why: string; say: string }[] = []
  const chat = d.chats.at(-1)
  const plan = d.plans.find((p) => p.status === 'active') ?? d.plans.at(-1)
  const upcoming = d.bookings.find((b) => b.date >= new Date().toISOString().slice(0, 10) && !['cancelled', 'done', 'no_show'].includes(b.status))
  if (chat?.status === 'red_flag') out.push({ why: 'Pain chat flagged a red flag', say: `Hi ${first}, this is Betterhood. Checking in after our chat: were you able to see a doctor? Once you’re cleared, we’ll help you with physio.` })
  if (d.profile.dischargedAt)
    out.push({ why: 'Discharged: keep them well', say: `Hi ${first}, hope you’re keeping well since finishing your physio! A few things that help you stay pain-free: ${products.slice(0, 2).map((p) => productUrl(p.handle)).join(' ')}` })
  if (!d.assessments.length && !d.chats.length && !d.web.some((w) => w.kind === 'assessment'))
    out.push({ why: 'No assessment or pain chat yet', say: `Hi ${first}, welcome to Betterhood! Tell us where it hurts in the app’s pain assistant and we’ll match you with a physio for a free video consult.` })
  if (chat?.status === 'ready' && !upcoming) out.push({ why: 'Matched in pain chat, consult not booked', say: `Hi ${first}, ${chat.physioName ?? 'your physio'} is ready for your free video consult. Open the Betterhood app to pick a time that suits you.` })
  if (d.profile.physio && !d.bookings.length && !d.plans.length) out.push({ why: 'Has a physio, no visit booked', say: `Hi ${first}, ${d.profile.physio.name} is your physio on Betterhood. Book your first visit (video, home or clinic) from the app.` })
  if (plan && plan.sentAt && !plan.openedAt) out.push({ why: 'Care plan sent but never opened', say: `Hi ${first}, your exercise plan “${plan.title}” is waiting in the Betterhood app. It takes about 15 minutes a day.` })
  const quiet = daysSince(plan?.lastDay)
  if (plan && plan.status === 'active' && (plan.skipped > plan.done || (quiet !== undefined && quiet > 4)))
    out.push({ why: quiet !== undefined && quiet > 4 ? `No exercises for ${quiet} days` : 'Skipping more sessions than doing', say: `Hi ${first}, how’s the pain? Your plan is waiting in the app. If it’s too hard or too easy, reply here and we’ll tell your physio.` })
  if (products.length && !d.profile.dischargedAt)
    out.push({ why: 'Products picked for their problem', say: `Hi ${first}, physios often suggest these for ${d.profile.condition?.toLowerCase() ?? 'what you described'}: ${products.slice(0, 2).map((p) => `${p.title.split('|')[0].trim()} ${productUrl(p.handle)}`).join(' · ')}` })
  return out
}

function productsFor(d: PatientJourney): { products: Product[]; basis?: string } {
  const a = d.assessments.at(-1)
  if (a) {
    const p = recommendedFor({ result: a.result, area: a.area as never })
    if (p.length) return { products: p, basis: `${a.title}${a.condition ? `: ${a.condition}` : ''}` }
  }
  const w = [...d.web].reverse().find((x) => x.kind === 'assessment' && (x.result || x.area))
  if (w) {
    const p = recommendedFor({ result: w.result, area: (w.area ?? '') as never })
    if (p.length) return { products: p, basis: `Website: ${w.title ?? w.form}` }
  }
  const area = [...d.chats].reverse().find((c) => c.area !== 'unknown')?.area
  if (area) {
    const p = recommendedFor({ area: area as never })
    if (p.length) return { products: p, basis: `Pain chat: ${AREA[area] ?? area} pain` }
  }
  return { products: [] }
}

function patientBranches(d: PatientJourney): Branch[] {
  const p = d.profile
  const { products, basis } = productsFor(d)
  const nudges = consumerNudges(d, products)
  const webForms = d.web.filter((w) => w.kind === 'form')
  const webAs = d.web.filter((w) => w.kind === 'assessment')
  const sessions = d.plans.reduce((a, x) => ({ done: a.done + x.done, skipped: a.skipped + x.skipped }), { done: 0, skipped: 0 })
  const lastDay = d.plans.map((x) => x.lastDay).filter(Boolean).sort().at(-1)
  const painPlan = d.plans.find((x) => x.firstPain != null && x.lastPain != null)
  const paid = d.invoices.filter((i) => i.status === 'paid').reduce((a, i) => a + i.total, 0)
  const unpaid = d.invoices.filter((i) => i.status === 'unpaid').reduce((a, i) => a + i.total, 0)
  const chat = d.chats.at(-1)

  return [
    {
      key: 'web',
      title: 'Website',
      icon: <Globe size={16} />,
      color: C.sky,
      reached: d.web.length > 0,
      summary: d.web.length ? `${webAs.length} assessment${webAs.length === 1 ? '' : 's'}, ${webForms.length} form${webForms.length === 1 ? '' : 's'}` : 'Never used betterhood.in with this number',
      when: d.web[0] ? day(d.web[0].createdAt) : undefined,
      leaves: d.web.map((w) => ({ label: day(w.createdAt), value: w.kind === 'assessment' ? `${w.title ?? w.form}${w.condition ? `: ${w.condition}` : ''}` : `“${words(w.form)}” form` })),
    },
    {
      key: 'account',
      title: 'Account',
      icon: <UserRound size={16} />,
      color: C.slate,
      reached: true,
      summary: p.selfSignup ? 'Signed up in the app' : `Added by ${p.physio?.name ?? 'a physio'}`,
      when: day(p.createdAt),
      leaves: [
        { label: 'Phone', value: fmtPhone(p.phone) },
        ...(p.email ? [{ label: 'Email', value: p.email }] : []),
        { label: 'About', value: [p.age && `${p.age} yrs`, p.sex === 'F' ? 'female' : p.sex === 'M' ? 'male' : '', p.city].filter(Boolean).join(', ') || '-' },
        { label: 'Last opened app', value: ago(p.lastSeenAt), tone: (daysSince(p.lastSeenAt) ?? 99) > 14 ? 'warn' : undefined },
        { label: 'Terms', value: p.consentAt ? `Agreed ${day(p.consentAt)}` : 'Not yet' },
        ...d.consents.map((c) => ({ label: 'Consent', value: `${c.title}: ${c.status}` })),
      ],
    },
    {
      key: 'assess',
      title: 'Assessments',
      icon: <ClipboardList size={16} />,
      color: C.violet,
      reached: d.assessments.length > 0,
      summary: d.assessments.length ? `${d.assessments.length} in the app` : undefined,
      when: d.assessments.at(-1) ? day(d.assessments.at(-1)!.createdAt) : undefined,
      leaves: d.assessments.map((a) => ({
        label: day(a.createdAt),
        value: `${a.title}: ${a.condition ?? (a.scores?.overall != null ? `${a.scores.overall}/10` : '-')}${a.advisory ? ' · see a doctor' : ''}`,
        tone: a.advisory ? ('bad' as const) : undefined,
      })),
    },
    {
      key: 'chat',
      title: 'Pain chat',
      icon: <MessageCircleHeart size={16} />,
      color: C.indigo,
      reached: d.chats.some((c) => c.userMessages > 0),
      summary: chat ? `${d.chats.length} chat${d.chats.length === 1 ? '' : 's'} · last: ${{ open: 'still chatting', ready: 'matched, not booked', booked: 'consult booked', red_flag: 'sent to a doctor', closed: 'started over' }[chat.status] ?? chat.status}` : undefined,
      when: chat ? day(chat.createdAt) : undefined,
      leaves: chat
        ? [
            { label: 'Problem', value: [AREA[chat.area] ?? (chat.area === 'unknown' ? 'Not known' : chat.area), chat.stage !== 'unknown' ? cap(chat.stage) : '', chat.severity >= 0 && chat.area !== 'unknown' ? `${chat.severity}/10` : ''].filter(Boolean).join(' · ') },
            { label: 'Messages', value: chat.userMessages },
            ...(chat.redFlags.length ? [{ label: 'Red flags', value: chat.redFlags.join(', '), tone: 'bad' as const }] : []),
            ...(chat.summary ? [{ label: 'Summary', value: chat.summary }] : []),
            ...(chat.physioName ? [{ label: 'Matched with', value: chat.physioName }] : []),
          ]
        : [],
    },
    {
      key: 'physio',
      title: 'Physio',
      icon: <Stethoscope size={16} />,
      color: C.teal,
      reached: !!p.physio,
      summary: p.physio ? p.physio.name : 'No physio yet',
      when: p.physio?.since ? day(`${p.physio.since}T12:00:00+05:30`) : undefined,
      leaves: p.physio
        ? [
            { label: 'Match', value: p.selfSignup ? cap(words(p.physio.matchStatus) || 'confirmed') : 'Their own patient' },
            { label: 'Condition', value: p.condition ?? '-' },
            { label: 'Messages', value: `${d.messages.fromPatient} sent · ${d.messages.fromPhysio} received` },
            ...(d.messages.lastAt ? [{ label: 'Last message', value: ago(d.messages.lastAt) }] : []),
          ]
        : [],
    },
    {
      key: 'consults',
      title: 'Consults & visits',
      icon: <CalendarCheck size={16} />,
      color: C.blue,
      reached: d.bookings.length > 0,
      summary: d.bookings.length ? `${d.bookings.length} booking${d.bookings.length === 1 ? '' : 's'}${d.bookings.some((b) => b.sponsored) ? ' · free consult used' : ''}` : undefined,
      leaves: d.bookings.map((b) => ({
        label: `${day(`${b.date}T12:00:00+05:30`)} ${b.time}`,
        value: `${VISIT[b.visitType] ?? b.visitType}${b.sponsored ? ' (free)' : ''} · ${words(b.status)}`,
        tone: b.status === 'done' ? ('good' as const) : b.status === 'no_show' || b.status === 'cancelled' ? ('bad' as const) : undefined,
      })),
    },
    {
      key: 'plan',
      title: 'Care plan',
      icon: <ListChecks size={16} />,
      color: C.green,
      reached: d.plans.length > 0,
      summary: d.plans.length ? `${d.plans.length} plan${d.plans.length === 1 ? '' : 's'}` : undefined,
      when: d.plans[0]?.sentAt ? day(d.plans[0].sentAt) : undefined,
      leaves: d.plans.flatMap((x) => [
        { label: 'Plan', value: `${x.title} · ${x.status}` },
        { label: 'Schedule', value: `${x.daysPerWeek} days a week, ${x.weeks} weeks` },
        { label: 'Opened', value: x.openedAt ? day(x.openedAt) : 'Not yet', tone: x.openedAt ? undefined : ('warn' as const) },
      ]),
    },
    {
      key: 'exercise',
      title: 'Exercising',
      icon: <Activity size={16} />,
      color: C.emerald,
      reached: sessions.done > 0,
      summary: sessions.done || sessions.skipped ? `${sessions.done} done · ${sessions.skipped} skipped` : undefined,
      when: lastDay ? `last ${ago(`${lastDay}T12:00:00+05:30`)}` : undefined,
      leaves: [
        ...(sessions.done + sessions.skipped ? [{ label: 'Adherence', value: `${Math.round((sessions.done / (sessions.done + sessions.skipped)) * 100)}%`, tone: sessions.done >= sessions.skipped ? ('good' as const) : ('warn' as const) }] : []),
        ...(painPlan ? [{ label: 'Pain', value: `${painPlan.firstPain}/10 → ${painPlan.lastPain}/10`, tone: painPlan.lastPain! < painPlan.firstPain! ? ('good' as const) : painPlan.lastPain! > painPlan.firstPain! ? ('bad' as const) : undefined }] : []),
        ...d.plans.filter((x) => x.avgPain != null).map((x) => ({ label: 'Average pain', value: `${x.avgPain}/10` })),
        ...(p.dischargedAt ? [{ label: 'Discharged', value: `${day(p.dischargedAt)}${p.discharge?.outcome ? ` · ${words(p.discharge.outcome)}` : ''}`, tone: 'good' as const }] : []),
      ],
    },
    {
      key: 'pay',
      title: 'Payments',
      icon: <IndianRupee size={16} />,
      color: C.amber,
      reached: d.invoices.length > 0,
      summary: d.invoices.length ? `${rupees(paid)} paid${unpaid ? ` · ${rupees(unpaid)} due` : ''}` : 'No invoices',
      leaves: [
        ...d.invoices.map((i) => ({ label: day(i.createdAt), value: `${i.number} · ${rupees(i.total)} · ${i.status}${i.method ? ` (${i.method})` : ''}`, tone: i.status === 'paid' ? ('good' as const) : ('warn' as const) })),
        { label: 'Shop orders', value: 'Not connected yet' },
      ],
    },
    {
      key: 'products',
      title: 'Products to send',
      icon: <ShoppingBag size={16} />,
      color: C.violet,
      reached: products.length > 0,
      summary: products.length ? `Picked for ${basis}` : 'Needs an assessment or pain chat first',
      leaves: products.slice(0, 8).map((x) => ({ label: rupees(x.price), value: x.title.split('|')[0].trim(), href: productUrl(x.handle) })),
      footer: products.length ? (
        <WaButton
          phone={p.phone}
          label="Send top picks on WhatsApp"
          text={`Hi ${p.name.split(' ')[0]}, physios often suggest these for ${basis?.toLowerCase().replace(/^website: |^pain chat: /, '') ?? 'your pain'}: ${products
            .slice(0, 3)
            .map((x) => `${x.title.split('|')[0].trim()} ${productUrl(x.handle)}`)
            .join(' · ')}`}
        />
      ) : undefined,
    },
    {
      key: 'next',
      title: 'Next step',
      icon: <Megaphone size={16} />,
      color: C.rose,
      reached: nudges.length > 0,
      summary: nudges[0]?.why ?? 'Nothing to chase right now',
      leaves: nudges.slice(1).map((n) => ({ label: 'Also', value: n.why })),
      footer: nudges[0] ? <WaButton phone={p.phone} label="Send this on WhatsApp" text={nudges[0].say} /> : undefined,
    },
  ]
}

function physioBranches(d: PhysioJourney, row?: PhysioRow): Branch[] {
  const p = d.profile
  const setup = row?.setup ?? {}
  const SETUP: Record<string, string> = { photo: 'Photo', qualification: 'Qualification', focusAreas: 'Focus areas', place: 'Practice place', availability: 'Availability', billing: 'Billing details' }
  const missing = Object.entries(setup).filter(([, v]) => !v).map(([k]) => SETUP[k] ?? k)
  const sum = (xs: { n: number }[]) => xs.reduce((a, x) => a + x.n, 0)
  const active = d.patients.filter((x) => !x.dischargedAt && (daysSince(x.lastSession) ?? 99) <= 14).length
  const paid = d.invoices.find((i) => i.status === 'paid')?.total ?? 0
  const unpaid = d.invoices.find((i) => i.status === 'unpaid')?.total ?? 0
  const planN = sum(d.plans)
  const bookN = sum(d.bookings)
  const first = p.name.replace(/^Dr\.?\s*/i, '').split(' ')[0]

  const nudges: { why: string; say: string }[] = []
  if (missing.length) nudges.push({ why: `Profile missing: ${missing.join(', ').toLowerCase()}`, say: `Hi Dr. ${first}, your Betterhood profile is almost ready. Add your ${missing.slice(0, 3).join(', ').toLowerCase()} in the app so patients can find and book you.` })
  if (!d.listing) nudges.push({ why: 'Not listed on betterhood.in', say: `Hi Dr. ${first}, list your practice on the betterhood.in directory (free) so patients in your area can find you. It takes 2 minutes in the app.` })
  if (!d.patients.length) nudges.push({ why: 'No patients yet', say: `Hi Dr. ${first}, add your first patient in the Betterhood app: they get your exercise plan on their phone and you see how they’re doing.` })
  else if (!planN) nudges.push({ why: 'Has patients, no care plan sent', say: `Hi Dr. ${first}, send your patients a care plan from the app: they get videos and reminders, and you see who’s doing their exercises.` })
  if (p.verification === 'none') nudges.push({ why: 'Not verified', say: `Hi Dr. ${first}, add your council registration number in the Betterhood app to get the verified badge on your profile.` })
  if (!d.referrals.length && d.patients.length >= 3) nudges.push({ why: 'Never invited a colleague', say: `Hi Dr. ${first}, know a physio who’d like Betterhood? Invite them from the app.` })

  return [
    {
      key: 'web',
      title: 'Website',
      icon: <Globe size={16} />,
      color: C.sky,
      reached: d.web.length > 0,
      summary: d.web.length ? `${d.web.length} submission${d.web.length === 1 ? '' : 's'} on betterhood.in` : 'Never used betterhood.in with this number',
      leaves: d.web.map((w) => ({ label: day(w.createdAt), value: w.kind === 'assessment' ? (w.title ?? w.form) : `“${words(w.form)}” form` })),
    },
    {
      key: 'profile',
      title: 'Profile set-up',
      icon: <UserRound size={16} />,
      color: C.slate,
      reached: true,
      summary: row ? `${row.setupDone} of ${row.setupTotal} done` : undefined,
      when: day(p.createdAt),
      leaves: [
        { label: 'Phone', value: fmtPhone(p.phone) },
        ...(p.email ? [{ label: 'Email', value: p.email }] : []),
        { label: 'Qualification', value: [p.qualification, p.experienceYrs ? `${p.experienceYrs} yrs` : ''].filter(Boolean).join(' · ') || '-' },
        { label: 'Focus areas', value: p.focusAreas.join(', ') || '-' },
        { label: 'Verification', value: p.verification === 'none' ? 'Not verified' : cap(p.verification), tone: p.verification === 'verified' ? ('good' as const) : p.verification === 'pending' ? ('warn' as const) : undefined },
        ...(missing.length ? [{ label: 'Still to add', value: missing.join(', '), tone: 'warn' as const }] : []),
        { label: 'Last opened app', value: ago(p.lastSeenAt) },
      ],
    },
    {
      key: 'listing',
      title: 'Directory listing',
      icon: <BadgeCheck size={16} />,
      color: C.blue,
      reached: !!d.listing,
      summary: d.listing ? (d.listing.status === 'live' ? 'Live on betterhood.in' : 'Hidden by an admin') : undefined,
      when: d.listing?.publishedAt ? day(d.listing.publishedAt) : undefined,
      leaves: d.listing ? [{ label: 'Profile', value: d.listing.slug, href: d.listing.url }] : [],
    },
    {
      key: 'patients',
      title: 'Patients',
      icon: <Users size={16} />,
      color: C.teal,
      reached: d.patients.length > 0,
      summary: d.patients.length ? `${d.patients.length} total · ${active} exercising · ${d.patients.filter((x) => x.dischargedAt).length} discharged` : undefined,
      when: d.patients[0] ? `first ${day(d.patients[0].createdAt)}` : undefined,
      leaves: [...d.patients].reverse().map((x) => ({ label: day(x.createdAt), value: `${x.name}${x.condition ? ` · ${x.condition}` : ''}${x.selfSignup ? ' (from Betterhood)' : ''}${x.dischargedAt ? ' · discharged' : ''}` })),
    },
    {
      key: 'plans',
      title: 'Care plans',
      icon: <ListChecks size={16} />,
      color: C.green,
      reached: planN > 0,
      summary: planN ? `${planN} sent` : undefined,
      leaves: d.plans.map((x) => ({ label: cap(x.status), value: x.n })),
    },
    {
      key: 'bookings',
      title: 'Bookings',
      icon: <CalendarCheck size={16} />,
      color: C.indigo,
      reached: bookN > 0,
      summary: bookN ? `${bookN} total` : undefined,
      leaves: (() => {
        const agg = (f: (x: PhysioJourney['bookings'][number]) => string) => {
          const m = new Map<string, number>()
          for (const b of d.bookings) m.set(f(b), (m.get(f(b)) ?? 0) + b.n)
          return [...m.entries()]
        }
        return [
          ...agg((b) => VISIT[b.visitType] ?? b.visitType).map(([k, n]) => ({ label: k, value: n })),
          ...agg((b) => (b.source === 'public_profile' ? 'From public profile' : b.source === 'physio' ? 'Added by physio' : words(b.source))).map(([k, n]) => ({ label: k, value: n })),
          { label: 'Free consults (Betterhood)', value: d.bookings.filter((b) => b.sponsored).reduce((a, b) => a + b.n, 0) },
          { label: 'Done', value: d.bookings.filter((b) => b.status === 'done').reduce((a, b) => a + b.n, 0), tone: 'good' as const },
        ]
      })(),
    },
    {
      key: 'earn',
      title: 'Earnings',
      icon: <IndianRupee size={16} />,
      color: C.amber,
      reached: sum(d.invoices) > 0,
      summary: sum(d.invoices) ? `${rupees(paid)} paid${unpaid ? ` · ${rupees(unpaid)} due` : ''}` : 'No invoices',
      leaves: d.invoices.map((i) => ({ label: cap(i.status), value: `${i.n} · ${rupees(i.total)}` })),
    },
    {
      key: 'groups',
      title: 'Group sessions',
      icon: <Sparkles size={16} />,
      color: C.violet,
      reached: d.groups.length > 0,
      summary: d.groups.length ? `${d.groups.length} set up` : undefined,
      leaves: d.groups.map((g) => ({ label: `${day(`${g.date}T12:00:00+05:30`)} ${g.time}`, value: `${g.title} · ${g.status}` })),
    },
    {
      key: 'referrals',
      title: 'Invites & course',
      icon: <BookOpen size={16} />,
      color: C.slate,
      reached: d.referrals.length > 0 || (row?.courseLessons ?? 0) > 0,
      summary: `${d.referrals.length} invited · ${row?.courseLessons ?? 0} course lessons`,
      leaves: d.referrals.map((r) => ({ label: r.at ? day(r.at) : '-', value: `${r.name} · ${r.status}` })),
    },
    {
      key: 'next',
      title: 'Next step',
      icon: <Megaphone size={16} />,
      color: C.rose,
      reached: nudges.length > 0,
      summary: nudges[0]?.why ?? 'Nothing to chase right now',
      leaves: nudges.slice(1).map((n) => ({ label: 'Also', value: n.why })),
      footer: nudges[0] ? <WaButton phone={p.phone} label="Send this on WhatsApp" text={nudges[0].say} /> : undefined,
    },
  ]
}

export type MapSubject = { type: 'patient'; row: ConsumerRow } | { type: 'physio'; row: PhysioRow }

export function PersonMap({ subject, token, onBack, onNotes }: { subject: MapSubject; token?: string; onBack: () => void; onNotes: () => void }) {
  const [data, setData] = useState<PatientJourney | PhysioJourney>()
  const [failed, setFailed] = useState(false)
  const { type, row } = subject

  useEffect(() => {
    let live = true
    setData(undefined)
    setFailed(false)
    api<PatientJourney | PhysioJourney>(`/admin/journey/${type}/${encodeURIComponent(row.id)}`, { token })
      .then((d) => live && setData(d))
      .catch((e) => {
        if (!live) return
        setFailed(true)
        toast(e instanceof Error ? e.message : 'Couldn’t load the journey')
      })
    return () => {
      live = false
    }
  }, [type, row.id, token])

  const branches = useMemo(() => (!data ? [] : data.type === 'patient' ? patientBranches(data) : physioBranches(data, type === 'physio' ? row : undefined)), [data, type, row])

  const entry = (() => {
    if (!data) return undefined
    if (data.type === 'patient') {
      const firstWeb = data.web[0]
      if (firstWeb && firstWeb.createdAt <= data.profile.createdAt) return { title: 'Website', sub: firstWeb.kind === 'assessment' ? `took ${firstWeb.title ?? firstWeb.form}` : `sent the “${words(firstWeb.form)}” form` }
      if (!data.profile.selfSignup) return { title: 'Their physio', sub: `added by ${data.profile.physio?.name ?? 'a physio'}` }
      return { title: 'App sign-up', sub: 'found the app on their own' }
    }
    if (data.profile.referredBy) return { title: 'Invite', sub: `invited by ${data.profile.referredBy}` }
    const firstWeb = data.web[0]
    if (firstWeb && firstWeb.createdAt <= data.profile.createdAt) return { title: 'Website', sub: 'used betterhood.in first' }
    return { title: 'App sign-up', sub: 'signed up directly' }
  })()

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-muted cursor-pointer hover:text-ink">
          <ArrowLeft size={14} /> {type === 'patient' ? 'Consumer map' : 'Physio map'}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {data?.tags.map((t) => (
            <span key={t} className="rounded-full bg-track px-2.5 py-1 text-[12px] font-medium text-muted">
              {t}
            </span>
          ))}
          <button onClick={onNotes} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-ink cursor-pointer hover:bg-track/60">
            <NotebookPen size={14} /> Timeline, notes & tags{data?.notes ? ` (${data.notes})` : ''}
          </button>
        </div>
      </div>

      {failed ? (
        <p className="rounded-xl border border-line bg-surface p-10 text-center text-muted">Couldn’t load this journey. Try refreshing.</p>
      ) : !data ? (
        <div className="grid place-items-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-track border-t-[hsl(221_83%_53%)]" aria-label="Loading" />
        </div>
      ) : (
        <MindMap
          center={
            <Hub eyebrow={`Came in via · ${entry?.title}`} title={row.name} sub={entry?.sub}>
              <HubChip>{fmtPhone(row.phone)}</HubChip>
              {type === 'patient' ? <HubChip>{C_STAGE[(row as ConsumerRow).stage]}</HubChip> : <HubChip>{P_STAGE[(row as PhysioRow).stage]}</HubChip>}
              <HubChip>{HEALTH[row.health].label}</HubChip>
              <a href={`https://wa.me/91${row.phone}`} target="_blank" rel="noopener" className="rounded-full bg-[#128c7e] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#0d7064]">
                WhatsApp
              </a>
            </Hub>
          }
          branches={branches}
        />
      )}
      {data && (
        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-faint">
          <AlertTriangle size={12} /> Dashed branches are stages they haven’t reached yet. Message text and chat transcripts aren’t shown here.
        </p>
      )}
    </>
  )
}

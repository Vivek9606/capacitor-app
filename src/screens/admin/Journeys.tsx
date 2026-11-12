import { ArrowUpRight, Check, Download, StickyNote, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, type BadgeTone, Button, Card, cx, TextArea } from '../../components/ui'
import { api } from '../../lib/api'
import { fmtPhone } from '../../lib/logic'
import { toast } from '../../lib/platform'

/**
 * Journey views for the admin dashboard: where every consumer and physio is, what they did last,
 * and what came in from the website. Data comes from GET /admin/journeys (API mode only).
 */

// ---------- types (mirror the backend's routes/adminJourneys.ts) ----------
type Health = 'active' | 'slipping' | 'inactive' | 'discharged'
export interface ConsumerRow {
  id: string
  name: string
  phone: string
  city?: string
  condition?: string
  physioId?: string
  physioName?: string
  origin: 'self' | 'physio'
  stage: 'signed_up' | 'assessed' | 'matched' | 'booked' | 'on_plan' | 'exercising' | 'discharged'
  health: Health
  createdAt: string
  lastSeenAt?: string
  lastActiveAt?: string
  firstWebAt?: string
  webSubmissions: number
  assessments: number
  bookings: number
  plans: number
  planOpenedAt?: string
  sessionsDone: number
  sessionsSkipped: number
  lastSessionAt?: string
  paidTotal: number
  dischargedAt?: string
  tags: string[]
  notes: number
}
export interface PhysioRow {
  id: string
  name: string
  phone: string
  email?: string
  place?: string
  focusAreas: string[]
  verification: 'none' | 'pending' | 'verified'
  stage: 'signed_up' | 'set_up' | 'first_patient' | 'treating' | 'running'
  health: Health
  setup: Record<string, boolean>
  setupDone: number
  setupTotal: number
  createdAt: string
  lastSeenAt?: string
  lastActiveAt?: string
  listing?: { status: string; url: string }
  patients: number
  activePatients: number
  discharged: number
  plans: number
  activePlans: number
  bookings: number
  publicBookings: number
  invoices: number
  paidTotal: number
  unpaidTotal: number
  groups: number
  referrals: number
  courseLessons: number
  tags: string[]
  notes: number
}
export interface WebRow {
  id: string
  kind: 'form' | 'assessment'
  form: string
  page?: string
  name?: string
  phone?: string
  email?: string
  data: Record<string, unknown>
  createdAt: string
  patientId?: string
  physioId?: string
  tags: string[]
  notes: number
}
interface Step {
  label: string
  n: number
  hint?: string
}
type Week = { week: string; consumers: number; physios: number; assessments: number; web: number; bookings: number; plans: number; sessions: number }
export interface Journeys {
  generatedAt: string
  consumers: ConsumerRow[]
  physios: PhysioRow[]
  web: { total: number; forms: number; assessments: number; with_phone: number; converted: number; recent: WebRow[] }
  weeks: Week[]
  consumerSteps: Step[]
  physioSteps: Step[]
  health: { consumers: Record<Health, number>; physios: Record<Exclude<Health, 'discharged'>, number> }
}
export type Subject = { type: 'patient'; row: ConsumerRow } | { type: 'physio'; row: PhysioRow } | { type: 'lead'; row: WebRow }

// ---------- labels ----------
const C_STAGE: Record<ConsumerRow['stage'], string> = { signed_up: 'Signed up', assessed: 'Assessed', matched: 'Has a physio', booked: 'Booked', on_plan: 'On a plan', exercising: 'Exercising', discharged: 'Discharged' }
const P_STAGE: Record<PhysioRow['stage'], string> = { signed_up: 'Signed up', set_up: 'Profile set up', first_patient: 'First patient', treating: 'Treating', running: 'Running practice' }
const HEALTH: Record<Health, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'ok' },
  slipping: { label: 'Slipping', tone: 'warn' },
  inactive: { label: 'Inactive', tone: 'accent' },
  discharged: { label: 'Discharged', tone: 'muted' },
}
const SETUP: Record<string, string> = { photo: 'Photo', qualification: 'Qualification', focusAreas: 'Focus areas', place: 'Place', availability: 'Availability', billing: 'Billing' }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const day = (ts?: string) => {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
const ago = (ts?: string) => {
  if (!ts) return 'never'
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : `${Math.round(d / 30)} months ago`
}
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
const formName = (w: WebRow) => (w.kind === 'assessment' ? String(w.data.title ?? w.form.replace(/^assessment-/, '').replace(/-/g, ' ')) : w.form.replace(/[-_:]/g, ' '))

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return toast('Nothing to export')
  const cols = Object.keys(rows[0])
  const cell = (v: unknown) => {
    const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v)
    // Leading = + - @ would run as a formula in a spreadsheet.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// ---------- small pieces ----------
function Pills<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { key: T; label: string; n?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cx('h-8 rounded-full border px-3 text-[13px] font-semibold cursor-pointer', value === o.key ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-brand')}
        >
          {o.label}
          {o.n !== undefined && <span className="ml-1.5 opacity-70">{o.n}</span>}
        </button>
      ))}
    </div>
  )
}

/** Milestones as horizontal bars. One hue: the bars show how many, the labels say what. */
function Milestones({ title, sub, steps }: { title: string; sub: string; steps: Step[] }) {
  const total = Math.max(steps[0]?.n ?? 0, 1)
  return (
    <Card className="p-5">
      <h3 className="font-display text-[18px] font-bold">{title}</h3>
      <p className="mt-0.5 text-[13px] text-muted">{sub}</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <div key={s.label} title={s.hint} className="grid grid-cols-[150px_1fr_84px] items-center gap-3 text-[13px]">
            <span className="truncate text-ink">{s.label}</span>
            <div className="h-3.5 rounded-[4px] bg-track">
              <div className="h-full rounded-[4px] bg-brand" style={{ width: `${(s.n / total) * 100}%`, minWidth: s.n ? 4 : 0 }} />
            </div>
            <span className="text-right tabular-nums">
              <b className="text-ink">{s.n}</b>
              {i > 0 && <span className="ml-1.5 text-faint">{Math.round((s.n / total) * 100)}%</span>}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Twelve weeks of one measure. Hovering (or focusing) a bar reads out its week and value. */
function Trend({ title, weeks, pick }: { title: string; weeks: Week[]; pick: (w: Week) => number }) {
  const [hover, setHover] = useState<number>()
  const vals = weeks.map(pick)
  const max = Math.max(...vals, 1)
  const total = vals.reduce((a, b) => a + b, 0)
  const shown = hover ?? weeks.length - 1
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <span className="text-[12px] text-faint">{total} in 12 weeks</span>
      </div>
      <div className="mt-1 text-[13px] text-muted">
        <b className="font-display text-[22px] text-ink">{vals[shown] ?? 0}</b> <span>{hover === undefined ? 'this week' : `week of ${day(weeks[shown].week)}`}</span>
      </div>
      <div className="mt-3 flex h-[72px] items-end gap-[3px]" onMouseLeave={() => setHover(undefined)}>
        {weeks.map((w, i) => (
          <button
            key={w.week}
            aria-label={`Week of ${day(w.week)}: ${vals[i]}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(undefined)}
            className="flex h-full flex-1 cursor-default items-end"
          >
            <span className={cx('block w-full rounded-t-[4px]', i === shown ? 'bg-brand' : 'bg-brand-line')} style={{ height: vals[i] ? `${Math.max((vals[i] / max) * 100, 5)}%` : 2 }} />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-faint">
        <span>{day(weeks[0]?.week)}</span>
        <span>{day(weeks[weeks.length - 1]?.week)}</span>
      </div>
    </Card>
  )
}

function HealthBadge({ h }: { h: Health }) {
  return <Badge tone={HEALTH[h].tone}>{HEALTH[h].label}</Badge>
}

/** The steps someone has done, as a row of dots with the step names on hover. */
function Dots({ steps }: { steps: [string, boolean][] }) {
  return (
    <div className="flex items-center gap-1" aria-label={steps.filter((s) => s[1]).map((s) => s[0]).join(', ') || 'No steps yet'}>
      {steps.map(([label, done]) => (
        <span key={label} title={`${label}: ${done ? 'yes' : 'not yet'}`} className={cx('grid h-5 w-5 place-items-center rounded-full', done ? 'bg-ok text-white' : 'bg-track text-transparent')}>
          <Check size={12} strokeWidth={3} />
        </span>
      ))}
    </div>
  )
}

const Th = ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-4 py-3 font-semibold">{children}</th>
const TagList = ({ tags, notes }: { tags: string[]; notes: number }) => (
  <div className="flex flex-wrap items-center gap-1">
    {tags.map((t) => (
      <Badge key={t} tone="brand">
        {t}
      </Badge>
    ))}
    {notes > 0 && (
      <span className="flex items-center gap-0.5 text-[12px] text-muted" title={`${notes} note${notes > 1 ? 's' : ''}`}>
        <StickyNote size={13} /> {notes}
      </span>
    )}
  </div>
)

function TableShell({ count, noun, onExport, filters, caption, children }: { count: number; noun: string; onExport: () => void; filters: React.ReactNode; caption?: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">{filters}</div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted">
            {count} {noun}
          </span>
          <Button size="sm" variant="secondary" onClick={onExport}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>
      <Card className="overflow-x-auto p-0">{children}</Card>
      {caption && <p className="mt-2 text-[12px] text-faint">{caption}</p>}
    </>
  )
}

// ---------- overview ----------
export function OverviewTab({ j, open }: { j: Journeys; open: (s: Subject) => void }) {
  const stuck = j.consumers.filter((c) => c.health !== 'active' && c.health !== 'discharged' && c.plans > 0).slice(0, 6)
  const waiting = j.physios.filter((p) => p.patients === 0 && Date.now() - new Date(p.createdAt).getTime() > 3 * 86_400_000).slice(0, 6)
  const leads = j.web.recent.filter((w) => w.phone && !w.patientId && !w.physioId).slice(0, 6)
  const hc = j.health.consumers
  const hp = j.health.physios
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Milestones title="Consumer journey" sub="How many consumers have reached each step. Percentages are of all accounts." steps={j.consumerSteps} />
        <Milestones title="Physio journey" sub="How many physios have reached each step. Percentages are of all accounts." steps={j.physioSteps} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ['Consumers by activity', [['active', hc.active], ['slipping', hc.slipping], ['inactive', hc.inactive], ['discharged', hc.discharged]]],
            ['Physios by activity', [['active', hp.active], ['slipping', hp.slipping], ['inactive', hp.inactive]]],
          ] as [string, [Health, number][]][]
        ).map(([title, rows]) => (
          <Card key={title} className="p-4">
            <h3 className="text-[14px] font-semibold">{title}</h3>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {rows.map(([h, n]) => (
                <div key={h} className="flex items-center gap-2">
                  <span className="font-display text-[24px] font-bold leading-none">{n}</span>
                  <HealthBadge h={h} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-faint">Active: did something in the last 7 days. Slipping: 8 to 21 days. Inactive: longer.</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Trend title="New consumers" weeks={j.weeks} pick={(w) => w.consumers} />
        <Trend title="New physios" weeks={j.weeks} pick={(w) => w.physios} />
        <Trend title="Website submissions" weeks={j.weeks} pick={(w) => w.web} />
        <Trend title="Exercise sessions done" weeks={j.weeks} pick={(w) => w.sessions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Attention title="On a plan but gone quiet" empty="Everyone on a plan has been active this week.">
          {stuck.map((c) => (
            <AttentionRow key={c.id} name={c.name} sub={`Last active ${ago(c.lastActiveAt)} · ${c.physioName ?? 'no physio'}`} onClick={() => open({ type: 'patient', row: c })} />
          ))}
        </Attention>
        <Attention title="Physios with no patients yet" empty="Every physio who joined more than 3 days ago has a patient.">
          {waiting.map((p) => (
            <AttentionRow key={p.id} name={p.name} sub={`Joined ${ago(p.createdAt)} · setup ${p.setupDone}/${p.setupTotal}`} onClick={() => open({ type: 'physio', row: p })} />
          ))}
        </Attention>
        <Attention title="Website leads without an account" empty="No open website leads with a phone number.">
          {leads.map((w) => (
            <AttentionRow key={w.id} name={w.name || fmtPhone(w.phone!)} sub={`${formName(w)} · ${ago(w.createdAt)}`} onClick={() => open({ type: 'lead', row: w })} />
          ))}
        </Attention>
      </div>
    </div>
  )
}

function Attention({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <Card className="p-4">
      <h3 className="text-[14px] font-semibold">{title}</h3>
      {children.length === 0 ? <p className="mt-3 text-[13px] text-muted">{empty}</p> : <div className="mt-2 divide-y divide-line">{children}</div>}
    </Card>
  )
}
function AttentionRow({ name, sub, onClick }: { name: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-2 py-2.5 text-left cursor-pointer hover:text-brand">
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold">{name}</span>
        <span className="block truncate text-[12px] text-muted">{sub}</span>
      </span>
      <ArrowUpRight size={15} className="shrink-0 text-faint" />
    </button>
  )
}

// ---------- consumers ----------
export function ConsumersTab({ j, q, open }: { j: Journeys; q: string; open: (s: Subject) => void }) {
  const [stage, setStage] = useState<'all' | ConsumerRow['stage']>('all')
  const [hl, setHl] = useState<'all' | Health>('all')
  const needle = q.trim().toLowerCase()
  const searched = useMemo(() => j.consumers.filter((c) => !needle || `${c.name} ${c.phone} ${c.city ?? ''} ${c.physioName ?? ''} ${c.tags.join(' ')}`.toLowerCase().includes(needle)), [j.consumers, needle])
  const rows = searched.filter((c) => (stage === 'all' || c.stage === stage) && (hl === 'all' || c.health === hl))
  const n = (k: ConsumerRow['stage']) => searched.filter((c) => c.stage === k).length
  return (
    <TableShell
      count={rows.length}
      noun="consumers"
      caption="Journey ticks, left to right: website, assessment, physio, booking, care plan, opened the plan, exercise session. Click a row for the full timeline."
      onExport={() =>
        downloadCsv(
          'consumers',
          rows.map((c) => ({
            Name: c.name, Phone: c.phone, City: c.city, Stage: C_STAGE[c.stage], Activity: HEALTH[c.health].label, 'Came from': c.origin === 'self' ? 'Self sign-up' : 'Added by physio', Physio: c.physioName,
            'Website submissions': c.webSubmissions, Assessments: c.assessments, Bookings: c.bookings, Plans: c.plans, 'Sessions done': c.sessionsDone, 'Paid (INR)': c.paidTotal,
            Joined: c.createdAt.slice(0, 10), 'Last active': c.lastActiveAt?.slice(0, 10), 'Last opened app': c.lastSeenAt?.slice(0, 10), Tags: c.tags,
          })),
        )
      }
      filters={
        <>
          <Pills value={stage} onChange={setStage} options={[{ key: 'all', label: 'All stages', n: searched.length }, ...(Object.keys(C_STAGE) as ConsumerRow['stage'][]).map((k) => ({ key: k, label: C_STAGE[k], n: n(k) }))]} />
          <Pills value={hl} onChange={setHl} options={[{ key: 'all', label: 'Any activity' }, { key: 'active', label: 'Active' }, { key: 'slipping', label: 'Slipping' }, { key: 'inactive', label: 'Inactive' }]} />
        </>
      }
    >
      <table className="w-full min-w-[980px] text-left text-[14px]">
        <thead className="border-b border-line text-[12px] uppercase tracking-wider text-faint">
          <tr>
            <Th>Consumer</Th>
            <Th>Stage</Th>
            <Th>Journey</Th>
            <Th>Physio</Th>
            <Th>Sessions</Th>
            <Th>Last active</Th>
            <Th>Follow-up</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-10 text-center text-muted">
                No consumers match.
              </td>
            </tr>
          )}
          {rows.map((c) => (
            <tr key={c.id} onClick={() => open({ type: 'patient', row: c })} className="cursor-pointer hover:bg-brand-soft/40">
              <td className="px-4 py-3">
                <div className="font-semibold">{c.name}</div>
                <div className="text-[12px] text-muted">
                  {fmtPhone(c.phone)}
                  {c.city ? ` · ${c.city}` : ''} · {c.origin === 'self' ? 'self sign-up' : 'added by physio'}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-start gap-1">
                  <Badge tone="brand">{C_STAGE[c.stage]}</Badge>
                  {c.health !== 'discharged' && <HealthBadge h={c.health} />}
                </div>
              </td>
              <td className="px-4 py-3">
                <Dots steps={[['Website', c.webSubmissions > 0], ['Assessment', c.assessments > 0], ['Physio', !!c.physioId], ['Booking', c.bookings > 0], ['Care plan', c.plans > 0], ['Opened plan', !!c.planOpenedAt], ['Exercise session', c.sessionsDone > 0]]} />
              </td>
              <td className="px-4 py-3">{c.physioName ?? <span className="text-faint">—</span>}</td>
              <td className="px-4 py-3 tabular-nums">
                {c.sessionsDone}
                {c.sessionsSkipped > 0 && <span className="text-faint"> · {c.sessionsSkipped} skipped</span>}
              </td>
              <td className="px-4 py-3 text-muted">
                <div>{ago(c.lastActiveAt)}</div>
                <div className="text-[12px] text-faint">joined {day(c.createdAt)}</div>
              </td>
              <td className="px-4 py-3">
                <TagList tags={c.tags} notes={c.notes} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  )
}

// ---------- physios ----------
export function PhysioJourneyTab({ j, q, open }: { j: Journeys; q: string; open: (s: Subject) => void }) {
  const [stage, setStage] = useState<'all' | PhysioRow['stage']>('all')
  const [hl, setHl] = useState<'all' | Health>('all')
  const needle = q.trim().toLowerCase()
  const searched = useMemo(() => j.physios.filter((p) => !needle || `${p.name} ${p.phone} ${p.place ?? ''} ${p.tags.join(' ')}`.toLowerCase().includes(needle)), [j.physios, needle])
  const rows = searched.filter((p) => (stage === 'all' || p.stage === stage) && (hl === 'all' || p.health === hl))
  const n = (k: PhysioRow['stage']) => searched.filter((p) => p.stage === k).length
  return (
    <TableShell
      count={rows.length}
      noun="physios"
      caption="Journey ticks, left to right: profile set up, directory listing, verified, first patient, care plan sent, booking, invoice. Click a row for the full timeline."
      onExport={() =>
        downloadCsv(
          'physios',
          rows.map((p) => ({
            Name: p.name, Phone: p.phone, Email: p.email, Place: p.place, Stage: P_STAGE[p.stage], Activity: HEALTH[p.health].label, Verification: p.verification, Listing: p.listing?.status ?? 'none',
            'Setup done': `${p.setupDone}/${p.setupTotal}`, Patients: p.patients, 'Active patients (14 days)': p.activePatients, Plans: p.plans, Bookings: p.bookings, 'Bookings from public profile': p.publicBookings,
            Invoices: p.invoices, 'Paid (INR)': p.paidTotal, 'Unpaid (INR)': p.unpaidTotal, 'Group sessions': p.groups, Referrals: p.referrals,
            Joined: p.createdAt.slice(0, 10), 'Last active': p.lastActiveAt?.slice(0, 10), 'Last opened app': p.lastSeenAt?.slice(0, 10), Tags: p.tags,
          })),
        )
      }
      filters={
        <>
          <Pills value={stage} onChange={setStage} options={[{ key: 'all', label: 'All stages', n: searched.length }, ...(Object.keys(P_STAGE) as PhysioRow['stage'][]).map((k) => ({ key: k, label: P_STAGE[k], n: n(k) }))]} />
          <Pills value={hl} onChange={setHl} options={[{ key: 'all', label: 'Any activity' }, { key: 'active', label: 'Active' }, { key: 'slipping', label: 'Slipping' }, { key: 'inactive', label: 'Inactive' }]} />
        </>
      }
    >
      <table className="w-full min-w-[1040px] text-left text-[14px]">
        <thead className="border-b border-line text-[12px] uppercase tracking-wider text-faint">
          <tr>
            <Th>Physio</Th>
            <Th>Stage</Th>
            <Th>Journey</Th>
            <Th>Patients</Th>
            <Th>Plans</Th>
            <Th>Bookings</Th>
            <Th>Collected</Th>
            <Th>Last active</Th>
            <Th>Follow-up</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="p-10 text-center text-muted">
                No physios match.
              </td>
            </tr>
          )}
          {rows.map((p) => (
            <tr key={p.id} onClick={() => open({ type: 'physio', row: p })} className="cursor-pointer hover:bg-brand-soft/40">
              <td className="max-w-[260px] px-4 py-3">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="truncate text-[12px] text-muted">
                  {fmtPhone(p.phone)}
                  {p.place ? ` · ${p.place}` : ''}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-start gap-1">
                  <Badge tone="brand">{P_STAGE[p.stage]}</Badge>
                  <HealthBadge h={p.health} />
                </div>
              </td>
              <td className="px-4 py-3">
                <Dots steps={[['Profile set up', p.setupDone >= 4], ['Directory listing', p.listing?.status === 'live'], ['Verified', p.verification === 'verified'], ['First patient', p.patients > 0], ['Care plan sent', p.plans > 0], ['Booking', p.bookings > 0], ['Invoice', p.invoices > 0]]} />
                <div className="mt-1 text-[12px] text-faint">
                  setup {p.setupDone}/{p.setupTotal}
                </div>
              </td>
              <td className="px-4 py-3 tabular-nums">
                {p.patients}
                {p.activePatients > 0 && <span className="text-faint"> · {p.activePatients} exercising</span>}
              </td>
              <td className="px-4 py-3 tabular-nums">{p.plans}</td>
              <td className="px-4 py-3 tabular-nums">{p.bookings}</td>
              <td className="px-4 py-3 tabular-nums">{p.paidTotal ? rupees(p.paidTotal) : <span className="text-faint">—</span>}</td>
              <td className="px-4 py-3 text-muted">
                <div>{ago(p.lastActiveAt)}</div>
                <div className="text-[12px] text-faint">joined {day(p.createdAt)}</div>
              </td>
              <td className="px-4 py-3">
                <TagList tags={p.tags} notes={p.notes} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  )
}

// ---------- website ----------
export function WebsiteTab({ j, q, open }: { j: Journeys; q: string; open: (s: Subject) => void }) {
  const [kind, setKind] = useState<'all' | 'form' | 'assessment' | 'open'>('all')
  const needle = q.trim().toLowerCase()
  const rows = j.web.recent.filter(
    (w) => (kind === 'all' || (kind === 'open' ? !!w.phone && !w.patientId && !w.physioId : w.kind === kind)) && (!needle || `${w.name ?? ''} ${w.phone ?? ''} ${w.email ?? ''} ${w.form} ${w.page ?? ''}`.toLowerCase().includes(needle)),
  )
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['Submissions', j.web.total],
            ['Lead forms', j.web.forms],
            ['Assessments taken', j.web.assessments],
            ['People who also have an account', j.web.converted],
          ] as [string, number][]
        ).map(([label, n]) => (
          <Card key={label} className="p-4">
            <div className="font-display text-[26px] font-bold leading-none">{n}</div>
            <div className="mt-1.5 text-[13px] text-muted">{label}</div>
          </Card>
        ))}
      </div>
      <TableShell
        count={rows.length}
        noun="submissions"
        onExport={() =>
          downloadCsv(
            'website-submissions',
            rows.map((w) => ({
              Date: w.createdAt.slice(0, 10), Type: w.kind === 'form' ? 'Lead form' : 'Assessment', Form: formName(w), Page: w.page, Name: w.name, Phone: w.phone, Email: w.email,
              'Has an account': w.patientId ? 'Consumer' : w.physioId ? 'Physio' : 'No', Details: JSON.stringify(w.data), Tags: w.tags,
            })),
          )
        }
        filters={
          <Pills
            value={kind}
            onChange={setKind}
            options={[
              { key: 'all', label: 'Everything' },
              { key: 'form', label: 'Lead forms' },
              { key: 'assessment', label: 'Assessments' },
              { key: 'open', label: 'Leads without an account' },
            ]}
          />
        }
      >
        <table className="w-full min-w-[820px] text-left text-[14px]">
          <thead className="border-b border-line text-[12px] uppercase tracking-wider text-faint">
            <tr>
              <Th>When</Th>
              <Th>What</Th>
              <Th>Who</Th>
              <Th>Result</Th>
              <Th>Account</Th>
              <Th>Follow-up</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted">
                  {j.web.total === 0 ? 'Nothing from the website yet. Lead forms and assessments taken on betterhood.in will show up here.' : 'No submissions match.'}
                </td>
              </tr>
            )}
            {rows.map((w) => (
              <tr key={w.id} onClick={() => open({ type: 'lead', row: w })} className="cursor-pointer hover:bg-brand-soft/40">
                <td className="px-4 py-3 text-muted">{day(w.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold capitalize">{formName(w)}</div>
                  <div className="text-[12px] text-muted">{w.kind === 'form' ? 'Lead form' : 'Assessment'}</div>
                </td>
                <td className="px-4 py-3">
                  {w.name || w.phone || w.email ? (
                    <>
                      <div>{w.name ?? '—'}</div>
                      <div className="text-[12px] text-muted">{[w.phone && fmtPhone(w.phone), w.email].filter(Boolean).join(' · ')}</div>
                    </>
                  ) : (
                    <span className="text-faint">Anonymous</span>
                  )}
                </td>
                <td className="px-4 py-3">{String(w.data.condition ?? (w.data.overall != null ? `${w.data.overall}/10 overall` : (w.data.message ?? '—'))).slice(0, 80)}</td>
                <td className="px-4 py-3">{w.patientId ? <Badge tone="ok">Consumer</Badge> : w.physioId ? <Badge tone="ok">Physio</Badge> : w.phone ? <Badge tone="warn">Not yet</Badge> : <span className="text-faint">—</span>}</td>
                <td className="px-4 py-3">
                  <TagList tags={w.tags} notes={w.notes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </>
  )
}

// ---------- detail drawer: facts, tags, notes, timeline ----------
interface Timeline {
  events: { at: string; kind: string; title: string; detail?: string }[]
  notes: { id: string; text: string; author: string; createdAt: string }[]
  tags: string[]
}
const SUGGESTED_TAGS = ['call back', 'high intent', 'needs help', 'vip', 'do not contact']

export function SubjectDrawer({ subject, token, onClose, onChanged }: { subject?: Subject; token?: string; onClose: () => void; onChanged: () => void }) {
  const [tl, setTl] = useState<Timeline>()
  const [note, setNote] = useState('')
  const [tag, setTag] = useState('')
  const [busy, setBusy] = useState(false)
  const key = subject && `${subject.type}/${subject.row.id}`

  const load = useCallback(async () => {
    if (!key) return
    try {
      setTl(await api<Timeline>(`/admin/timeline/${key}`, { token }))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t load the timeline')
    }
  }, [key, token])
  useEffect(() => {
    setTl(undefined)
    setNote('')
    setTag('')
    load()
  }, [load])
  useEffect(() => {
    if (!subject) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [subject, onClose])

  if (!subject) return null
  const { type, row } = subject
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      await load()
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save')
    } finally {
      setBusy(false)
    }
  }
  const setTags = (tags: string[]) => act(() => api('/admin/tags', { method: 'PUT', token, body: { subjectType: type, subjectId: row.id, tags } }))
  const addTag = (t: string) => {
    const v = t.trim().toLowerCase()
    if (v && !tl?.tags.includes(v)) setTags([...(tl?.tags ?? []), v])
    setTag('')
  }

  const title = type === 'lead' ? row.name || (row.phone ? fmtPhone(row.phone) : 'Anonymous visitor') : row.name
  const facts: [string, React.ReactNode][] =
    type === 'patient'
      ? [
          ['Stage', C_STAGE[row.stage]],
          ['Came from', row.origin === 'self' ? 'Self sign-up' : 'Added by physio'],
          ['Physio', row.physioName ?? 'None yet'],
          ['Condition', row.condition ?? '—'],
          ['Joined', day(row.createdAt)],
          ['Last opened the app', ago(row.lastSeenAt)],
          ['Sessions done', `${row.sessionsDone}${row.sessionsSkipped ? ` (${row.sessionsSkipped} skipped)` : ''}`],
          ['Paid', row.paidTotal ? rupees(row.paidTotal) : '—'],
        ]
      : type === 'physio'
        ? [
            ['Stage', P_STAGE[row.stage]],
            ['Verification', row.verification === 'none' ? 'Not verified' : row.verification],
            ['Joined', day(row.createdAt)],
            ['Last opened the app', ago(row.lastSeenAt)],
            ['Patients', `${row.patients} (${row.activePatients} exercising, ${row.discharged} discharged)`],
            ['Plans', `${row.plans} (${row.activePlans} active)`],
            ['Bookings', `${row.bookings} (${row.publicBookings} from public profile)`],
            ['Invoices', `${row.invoices} · ${rupees(row.paidTotal)} paid · ${rupees(row.unpaidTotal)} unpaid`],
            ['Group sessions', row.groups],
            ['Referrals', row.referrals],
            ['Course lessons done', row.courseLessons],
            ['Still to set up', Object.entries(row.setup).filter(([, v]) => !v).map(([k]) => SETUP[k] ?? k).join(', ') || 'Nothing'],
          ]
        : [
            ['Type', row.kind === 'form' ? 'Lead form' : 'Assessment'],
            ['Form', formName(row)],
            ['Page', row.page ?? '—'],
            ['Email', row.email ?? '—'],
            ['Account', row.patientId ? 'Has a consumer account' : row.physioId ? 'Has a physio account' : row.phone ? 'No account yet' : 'Anonymous'],
            ...Object.entries(row.data)
              .filter(([k, v]) => v != null && v !== '' && typeof v !== 'object' && !['name', 'title', 'date', 'kind'].includes(k))
              .slice(0, 10)
              .map(([k, v]) => [k[0].toUpperCase() + k.slice(1), String(v).slice(0, 300)] as [string, React.ReactNode]),
          ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="anim-fade absolute inset-0 bg-scrim/45" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={title} className="relative flex h-full w-full max-w-[480px] flex-col overflow-y-auto bg-bg shadow-float">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-bg px-5 py-4">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-faint">{type === 'patient' ? 'Consumer' : type === 'physio' ? 'Physio' : 'Website submission'}</div>
            <h2 className="truncate font-display text-[22px] font-bold">{title}</h2>
            <div className="text-[13px] text-muted">
              {row.phone ? fmtPhone(row.phone) : 'No phone number'}
              {type === 'patient' && row.city ? ` · ${row.city}` : ''}
              {type === 'physio' && row.place ? ` · ${row.place}` : ''}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted cursor-pointer hover:text-brand">
            <X size={17} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            {type !== 'lead' && <HealthBadge h={row.health} />}
            {row.phone && (
              <a href={`https://wa.me/91${row.phone}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-[13px] font-semibold text-brand">
                WhatsApp <ArrowUpRight size={13} />
              </a>
            )}
            {type === 'physio' && row.listing && (
              <a href={row.listing.url} target="_blank" rel="noopener" className="flex items-center gap-1 text-[13px] font-semibold text-brand">
                Directory profile{row.listing.status === 'hidden' ? ' (hidden)' : ''} <ArrowUpRight size={13} />
              </a>
            )}
          </div>

          <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-2 text-[14px]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-faint">Follow-up tags</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(tl?.tags ?? row.tags).map((t) => (
                <span key={t} className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-soft pl-3 pr-1.5 text-[13px] font-semibold text-brand">
                  {t}
                  <button aria-label={`Remove tag ${t}`} disabled={busy || !tl} onClick={() => setTags(tl!.tags.filter((x) => x !== t))} className="grid h-5 w-5 place-items-center rounded-full cursor-pointer hover:bg-brand-line">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {SUGGESTED_TAGS.filter((t) => !(tl?.tags ?? row.tags).includes(t)).map((t) => (
                <button key={t} disabled={busy || !tl} onClick={() => addTag(t)} className="h-7 rounded-full border border-dashed border-line px-3 text-[13px] text-muted cursor-pointer hover:border-brand hover:text-brand">
                  + {t}
                </button>
              ))}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addTag(tag)
              }}
            >
              <input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={30} placeholder="Your own tag" aria-label="New tag" className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[14px] outline-none focus:border-brand" />
              <Button size="sm" variant="secondary" type="submit" disabled={busy || !tl || !tag.trim()}>
                Add
              </Button>
            </form>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-faint">Internal notes</h3>
            <p className="mt-0.5 text-[12px] text-faint">Only admins see these.</p>
            <form
              className="mt-2 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!note.trim()) return
                act(() => api('/admin/notes', { token, body: { subjectType: type, subjectId: row.id, text: note.trim() } })).then(() => setNote(''))
              }}
            >
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} placeholder="What happened, what to do next" aria-label="New note" />
              <Button size="sm" type="submit" disabled={busy || !note.trim()} className="self-start">
                Add note
              </Button>
            </form>
            <div className="mt-3 flex flex-col gap-2">
              {tl?.notes.map((n) => (
                <div key={n.id} className="rounded-xl bg-surface px-3 py-2.5 text-[14px] shadow-card">
                  <div className="whitespace-pre-wrap">{n.text}</div>
                  <div className="mt-1 flex items-center justify-between text-[12px] text-faint">
                    <span>
                      {fmtPhone(n.author)} · {day(n.createdAt)}
                    </span>
                    <button aria-label="Delete note" disabled={busy} onClick={() => act(() => api(`/admin/notes/${n.id}`, { method: 'DELETE', token }))} className="cursor-pointer hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-faint">Timeline</h3>
            {!tl ? (
              <p className="mt-2 text-[13px] text-muted">Loading…</p>
            ) : tl.events.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">Nothing recorded yet.</p>
            ) : (
              <ol className="mt-3 border-l-2 border-line pl-4">
                {tl.events.map((e, i) => (
                  <li key={i} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-bg" />
                    <div className="text-[12px] text-faint">
                      {day(e.at)} {new Date(e.at).getFullYear()}
                    </div>
                    <div className="text-[14px] font-semibold">{e.title}</div>
                    {e.detail && <div className="break-words text-[13px] text-muted">{e.detail}</div>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}

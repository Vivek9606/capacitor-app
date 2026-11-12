import { ArrowDownRight, ArrowUpRight, Info, Lightbulb, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { cx } from '../../components/ui'

/**
 * Building blocks for the admin dashboard: panels, KPI cards with period-over-period change, a trend chart,
 * a funnel, a cohort grid and an insight list. One hue (the brand plum) carries every measure; green, amber
 * and red are kept for good / watch / bad and always come with a label.
 */

// ---------- numbers ----------
export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-IN')
export const fmtPct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`
export const fmtRupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** 'YYYY-MM-DD' or an ISO timestamp → "6 Nov". */
export const fmtDay = (s?: string) => {
  if (!s) return '—'
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const median = (xs: number[]) => {
  if (!xs.length) return undefined
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// ---------- periods ----------
export type Period = '7' | '28' | '90'
export const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7D' },
  { value: '28', label: '28D' },
  { value: '90', label: '90D' },
]
export const periodWords = (p: Period) => `last ${p} days`
/** Sum of the last `days` values, and of the `days` before those. */
export function curPrev(values: number[], days: number) {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  return { cur: sum(values.slice(-days)), prev: sum(values.slice(-2 * days, -days)) }
}

export interface DeltaInfo {
  text: string
  tone: 'good' | 'bad' | 'flat'
  value?: number
}
/** Change against the previous period. `invert` when lower is better. */
export function delta(cur: number, prev: number, invert = false): DeltaInfo {
  if (!prev) return cur ? { text: 'new', tone: invert ? 'bad' : 'good' } : { text: '0%', tone: 'flat' }
  const v = (cur - prev) / prev
  if (Math.abs(v) < 0.005) return { text: '0%', tone: 'flat', value: 0 }
  const up = v > 0
  return { text: `${up ? '+' : '−'}${Math.abs(v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0)}%`, tone: up !== invert ? 'good' : 'bad', value: v }
}

// ---------- layout ----------
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-xl border border-line bg-surface', className)}>{children}</section>
}
export function PanelHead({ title, desc, right }: { title: ReactNode; desc?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-tight tracking-tight text-ink">{title}</h3>
        {desc && <p className="mt-1 text-[13px] text-muted">{desc}</p>}
      </div>
      {right}
    </div>
  )
}
export function PageHeading({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-muted">{children}</p>
      </div>
      {actions}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-8 items-center rounded-md bg-track p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx('h-7 whitespace-nowrap rounded-[5px] px-2.5 text-[12px] font-medium cursor-pointer', o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Small hover/focus hint. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={text} className="text-faint hover:text-ink">
        <Info size={14} />
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-52 -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-2 text-[12px] font-normal leading-snug text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  )
}

export function DeltaBadge({ d, className }: { d: DeltaInfo; className?: string }) {
  const Icon = d.tone === 'good' ? ArrowUpRight : d.tone === 'bad' ? ArrowDownRight : Minus
  return (
    <span className={cx('inline-flex h-5 items-center gap-0.5 rounded px-1.5 text-[12px] font-medium tabular-nums', d.tone === 'good' ? 'bg-ok-soft text-ok' : d.tone === 'bad' ? 'bg-accent-soft text-danger' : 'bg-track text-muted', className)}>
      <Icon size={12} strokeWidth={2.5} aria-hidden />
      {d.text}
    </span>
  )
}

// ---------- sparkline ----------
export function Sparkline({ values, height = 40 }: { values: number[]; height?: number }) {
  const id = useId().replace(/:/g, '')
  if (values.length < 2) return <div style={{ height }} />
  const max = Math.max(...values, 1)
  const W = 100
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, height - 3 - (v / max) * (height - 6)] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

// ---------- KPI card ----------
export function Kpi({ label, info, icon, value, cur, prev, prevText, invert, spark }: { label: string; info: string; icon: ReactNode; value: string; cur: number; prev: number; prevText: string; invert?: boolean; spark?: number[] }) {
  return (
    <Panel className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          {label}
          <InfoTip text={info} />
        </div>
        <div className="hidden h-7 w-7 items-center justify-center rounded-md bg-track text-muted sm:flex">{icon}</div>
      </div>
      <div className="px-4 pt-1 sm:px-5">
        <div className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums text-ink">{value}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          <DeltaBadge d={delta(cur, prev, invert)} />
          <span>from {prevText}</span>
        </div>
      </div>
      <div className="mt-auto px-1 pb-1 pt-3">{spark ? <Sparkline values={spark} /> : <div className="h-2" />}</div>
    </Panel>
  )
}

/** A plain number with a note, for secondary stats. */
export function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'good' | 'bad' }) {
  return (
    <Panel className="px-4 py-3.5 sm:px-5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className={cx('mt-0.5 text-[22px] font-semibold leading-tight tabular-nums', tone === 'good' ? 'text-ok' : tone === 'bad' ? 'text-danger' : 'text-ink')}>{value}</div>
      {note && <div className="mt-0.5 text-[12px] text-muted">{note}</div>}
    </Panel>
  )
}

// ---------- ranked list with proportional bars ----------
export function BarList({ rows, total, empty = 'Nothing yet.', fmt = fmtInt }: { rows: [string, number][]; total?: number; empty?: string; fmt?: (n: number) => string }) {
  if (!rows.length) return <p className="py-4 text-[13px] text-muted">{empty}</p>
  const max = Math.max(...rows.map((r) => r[1]), 1)
  const sum = total ?? rows.reduce((a, r) => a + r[1], 0)
  return (
    <ul className="space-y-1.5">
      {rows.map(([name, value]) => (
        <li key={name} className="relative flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[14px]">
          <span className="absolute inset-y-0 left-0 rounded-md bg-brand opacity-[0.12]" style={{ width: `${(value / max) * 100}%` }} />
          <span className="relative truncate text-ink">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
          <span className="relative flex shrink-0 items-baseline gap-2 text-[13px] tabular-nums text-ink">
            {fmt(value)}
            {sum > 0 && <span className="w-9 text-right text-[11px] text-muted">{fmtPct(value / sum)}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
export const countBy = <T,>(items: T[], key: (x: T) => string | undefined, top = 8): [string, number][] => {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = key(it)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)
}

// ---------- funnel ----------
export interface FunnelStep {
  label: string
  n: number
  hint?: string
  /** True when this step can only happen after the one above, so "of previous step" means something. */
  follows?: boolean
}
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const total = Math.max(steps[0]?.n ?? 0, 1)
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => {
        const prev = steps[i - 1]
        const conv = s.follows && prev && prev.n > 0 ? s.n / prev.n : undefined
        return (
          <div key={s.label} title={s.hint} className="grid grid-cols-[minmax(110px,170px)_1fr_auto] items-center gap-3 text-[13px]">
            <span className="truncate text-ink">{s.label}</span>
            <div className="h-6 rounded-[4px] bg-track">
              <div className="flex h-full items-center rounded-[4px] bg-brand" style={{ width: `${(s.n / total) * 100}%`, minWidth: s.n ? 4 : 0 }} />
            </div>
            <span className="flex w-[176px] items-baseline justify-end gap-2 whitespace-nowrap tabular-nums">
              <b className="text-ink">{fmtInt(s.n)}</b>
              <span className="w-10 text-right text-muted">{i === 0 ? '' : fmtPct(s.n / total)}</span>
              <span className={cx('w-[84px] text-right text-[11px]', conv === undefined ? 'text-transparent' : conv < 0.5 ? 'font-semibold text-danger' : 'text-muted')}>{conv === undefined ? '·' : `${fmtPct(conv)} of previous`}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- cohort retention grid ----------
export interface Cohort {
  cohort: string
  size: number
  weeks: number[]
}
/** One row per weekly cohort; cells shade from light to dark by the share still exercising. */
export function CohortGrid({ cohorts }: { cohorts: Cohort[] }) {
  if (!cohorts.length) return <p className="py-4 text-[13px] text-muted">No care plans sent in the last 12 weeks.</p>
  const today = Date.now()
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-separate border-spacing-1 text-[12px]">
        <thead>
          <tr className="text-muted">
            <th className="w-[1%] whitespace-nowrap px-1 pr-6 text-left font-medium">Plan sent in week of</th>
            <th className="w-[1%] px-1 pr-4 text-right font-medium">Consumers</th>
            {Array.from({ length: 8 }, (_, i) => (
              <th key={i} className="font-medium">
                Week {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.cohort}>
              <td className="whitespace-nowrap px-1 text-ink">{fmtDay(c.cohort)}</td>
              <td className="px-1 pr-4 text-right tabular-nums text-ink">{c.size}</td>
              {c.weeks.map((n, i) => {
                // A week that hasn't started for this cohort yet stays blank.
                const reached = new Date(`${c.cohort}T00:00:00`).getTime() + i * 7 * 86_400_000 <= today
                const share = c.size ? n / c.size : 0
                return (
                  <td key={i} className="h-8 rounded-[4px] text-center tabular-nums" title={reached ? `${n} of ${c.size} did a session in week ${i + 1}` : 'Not reached yet'} style={reached ? { background: `color-mix(in srgb, var(--color-brand) ${Math.round(share * 85)}%, var(--color-track))`, color: share > 0.45 ? '#fff' : 'var(--color-ink)' } : undefined}>
                    {reached ? fmtPct(share) : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- insights ----------
export interface Insight {
  tone: 'good' | 'bad' | 'opportunity'
  title: string
  detail: string
  go?: () => void
  goLabel?: string
}
const TONE = {
  good: { icon: TrendingUp, label: 'Win', box: 'bg-ok-soft text-ok' },
  bad: { icon: TrendingDown, label: 'Watch', box: 'bg-accent-soft text-danger' },
  opportunity: { icon: Lightbulb, label: 'Opportunity', box: 'bg-warn-soft text-warn' },
} as const
export function Insights({ title, desc, items }: { title: string; desc: string; items: Insight[] }) {
  return (
    <Panel>
      <PanelHead title={title} desc={desc} />
      <ul className="grid gap-x-8 px-5 pb-4 pt-2 lg:grid-cols-2">
        {items.length === 0 && <li className="py-4 text-[13px] text-muted">Not enough activity yet to point at anything.</li>}
        {items.map((it) => {
          const t = TONE[it.tone]
          return (
            <li key={it.title} className="flex gap-3 border-b border-line py-3.5 last:border-b-0 lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
              <div className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md', t.box)}>
                <t.icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.label}</div>
                <p className="text-[14px] font-medium leading-snug text-ink">{it.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{it.detail}</p>
                {it.go && (
                  <button onClick={it.go} className="mt-1 text-[13px] font-semibold text-brand cursor-pointer hover:underline">
                    {it.goLabel ?? 'See who'} →
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

// ---------- trend chart ----------
export interface TrendMetric {
  key: string
  label: string
  values: number[] // one per day, oldest first
  fmt?: (n: number) => string
}
type Range = '28' | '90' | '180'
const RANGES: { value: Range; label: string }[] = [
  { value: '28', label: '28D' },
  { value: '90', label: '90D' },
  { value: '180', label: '6M' },
]
const niceMax = (v: number) => {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  const m = v / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 4 ? 4 : m <= 5 ? 5 : m <= 8 ? 8 : 10) * p
}

/** One measure over time. Pick the measure and the range; hover for the value on a day (or week, on 6M). */
export function TrendChart({ title, days, metrics }: { title: string; days: string[]; metrics: TrendMetric[] }) {
  const [key, setKey] = useState(metrics[0].key)
  const [range, setRange] = useState<Range>('90')
  const [hover, setHover] = useState<number>()
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(800)
  const id = useId().replace(/:/g, '')
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const M = metrics.find((m) => m.key === key) ?? metrics[0]
  const fmt = M.fmt ?? fmtInt
  const weekly = range === '180'
  // 6M shows weekly totals: 7-day buckets ending today.
  const pts: { label: string; tick: string; v: number }[] = []
  if (weekly) {
    for (let end = days.length; end - 7 >= 0 && pts.length < 26; end -= 7) {
      const v = M.values.slice(end - 7, end).reduce((a, b) => a + b, 0)
      pts.unshift({ label: `Week of ${fmtDay(days[end - 7])}`, tick: fmtDay(days[end - 7]), v })
    }
  } else {
    const n = Number(range)
    days.slice(-n).forEach((d, i) => pts.push({ label: fmtDay(d), tick: fmtDay(d), v: M.values.slice(-n)[i] ?? 0 }))
  }

  const H = 280
  const m = { l: 44, r: 12, t: 10, b: 26 }
  const iw = Math.max(w - m.l - m.r, 50)
  const ih = H - m.t - m.b
  const max = niceMax(Math.max(...pts.map((p) => p.v), 1))
  const x = (i: number) => m.l + (pts.length > 1 ? (i / (pts.length - 1)) * iw : iw / 2)
  const y = (v: number) => m.t + ih - (v / max) * ih
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const every = Math.max(1, Math.ceil(pts.length / Math.max(Math.floor(iw / 80), 2)))
  const h = hover !== undefined && pts[hover] ? hover : undefined
  const total = pts.reduce((a, p) => a + p.v, 0)

  return (
    <Panel>
      <PanelHead
        title={title}
        desc={`${weekly ? 'Weekly totals' : 'Daily values'} · ${fmt(total)} ${M.label.toLowerCase()} in this range`}
        right={
          <div className="flex flex-wrap gap-2">
            <Segmented label="Measure" value={key} onChange={setKey} options={metrics.map((x) => ({ value: x.key, label: x.label }))} />
            <Segmented label="Range" value={range} onChange={setRange} options={RANGES} />
          </div>
        }
      />
      <div ref={box} className="relative px-2 pb-3 pt-4">
        <svg
          width={w}
          height={H}
          role="img"
          aria-label={`${M.label}, ${weekly ? 'weekly' : 'daily'}, ${pts[0]?.label} to ${pts[pts.length - 1]?.label}. Total ${fmt(total)}.`}
          onMouseLeave={() => setHover(undefined)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const i = Math.round(((e.clientX - r.left - m.l) / iw) * (pts.length - 1))
            setHover(Math.max(0, Math.min(pts.length - 1, i)))
          }}
        >
          <defs>
            <linearGradient id={`tr-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={m.l} x2={m.l + iw} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-line)" strokeDasharray={f ? '3 3' : undefined} />
              <text x={m.l - 8} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
                {fmt(max * f)}
              </text>
            </g>
          ))}
          {pts.map((p, i) =>
            i % every === 0 ? (
              <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : 'middle'} fontSize="11" fill="var(--color-muted)">
                {p.tick}
              </text>
            ) : null,
          )}
          {pts.length > 1 && <path d={`${line} L${x(pts.length - 1)},${m.t + ih} L${x(0)},${m.t + ih} Z`} fill={`url(#tr-${id})`} />}
          <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinejoin="round" />
          {h !== undefined && (
            <>
              <line x1={x(h)} x2={x(h)} y1={m.t} y2={m.t + ih} stroke="var(--color-muted)" strokeOpacity="0.4" />
              <circle cx={x(h)} cy={y(pts[h].v)} r="4" fill="var(--color-brand)" stroke="var(--color-surface)" strokeWidth="2" />
            </>
          )}
        </svg>
        {h !== undefined && (
          <div className="pointer-events-none absolute top-3 z-10 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] shadow-lg" style={{ left: Math.min(Math.max(x(h) - 50, 8), w - 130) }}>
            <div className="text-muted">{pts[h].label}</div>
            <div className="font-semibold tabular-nums text-ink">
              {fmt(pts[h].v)} <span className="font-normal text-muted">{M.label.toLowerCase()}</span>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

/** A split of one total into labelled states (good / watch / bad), as one bar with a legend. */
export function StateBar({ parts }: { parts: { label: string; n: number; tone: 'good' | 'warn' | 'bad' | 'muted' }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0)
  const bg = { good: 'bg-ok', warn: 'bg-sun', bad: 'bg-danger', muted: 'bg-faint' } as const
  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {total === 0 && <div className="h-full w-full bg-track" />}
        {parts.filter((p) => p.n > 0).map((p) => (
          <div key={p.label} className={cx('h-full', bg[p.tone])} style={{ width: `${(p.n / total) * 100}%` }} title={`${p.label}: ${p.n}`} />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className={cx('h-2.5 w-2.5 rounded-sm', bg[p.tone])} />
            <span className="text-muted">{p.label}</span>
            <b className="tabular-nums text-ink">{fmtInt(p.n)}</b>
            {total > 0 && <span className="text-[11px] text-muted">{fmtPct(p.n / total)}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

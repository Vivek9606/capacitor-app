import { AlertTriangle, ChevronRight, Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../components/ui'
import { InfoTip } from './kit'
import { ACTIVITY, activity, furthest, type Person, STEP_KEYS, STEPS, stepsDone } from './model'

/**
 * Shared pieces for the admin screens. One look everywhere: text at 12 / 14 / 16 / 24 / 28 px, the same pill, the
 * same table, the same step dots. Colour only carries meaning (green good, amber watch, red act, grey neutral).
 */

const PILL = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-accent-soft text-danger',
  brand: 'bg-brand-soft text-brand',
  muted: 'bg-track text-muted',
} as const
export type PillTone = keyof typeof PILL
export function Pill({ tone = 'muted', children, title }: { tone?: PillTone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium', PILL[tone])}>
      {children}
    </span>
  )
}

/** Account vs website-only, test, and "also a physio": the badges that say what kind of record this is. */
export function PersonBadges({ p }: { p: Pick<Person, 'kind' | 'test' | 'alsoPhysio'> }) {
  return (
    <>
      {p.kind === 'website' ? (
        <Pill tone="warn" title="Gave their details on the website and never verified their number, so there is no account.">
          Website only
        </Pill>
      ) : (
        <Pill tone="brand" title="Verified their number with a WhatsApp code, or was added by their physio.">
          Account
        </Pill>
      )}
      {p.test && <Pill title="A team test number: left out of every count unless “Show test accounts” is on.">Test</Pill>}
      {p.alsoPhysio && <Pill title="This number also has a physio account.">Also a physio</Pill>}
    </>
  )
}

export function ActivityPill({ p }: { p: Pick<Person, 'lastActiveAt' | 'dischargedAt'> }) {
  const a = ACTIVITY[activity(p.lastActiveAt, p.dischargedAt)]
  return (
    <Pill tone={a.tone} title={a.info}>
      {a.label}
    </Pill>
  )
}

/** The eight steps as dots, filled where reached, with the furthest step named. */
export function StepDots({ p, withLabel = true }: { p: Person; withLabel?: boolean }) {
  const top = furthest(p)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-1" aria-label={`Reached ${stepsDone(p)} of 8 steps`}>
        {STEP_KEYS.map((k) => (
          <span
            key={k}
            title={`${STEPS[k].label}${p.steps[k] ? ` · ${new Date(p.steps[k]!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ' · not yet'}`}
            className={cx('h-2 w-5 rounded-full', p.steps[k] ? 'bg-brand' : 'bg-track')}
          />
        ))}
      </div>
      {withLabel && <span className="truncate text-[12px] text-muted">{STEPS[top].label}</span>}
    </div>
  )
}

export function StepLegend() {
  return (
    <p className="text-[12px] leading-relaxed text-muted">
      The bars are the 8 steps, left to right: {STEP_KEYS.map((k) => STEPS[k].label.toLowerCase()).join(' → ')}. Hover a bar for its date.
    </p>
  )
}

export function RedFlag({ reasons }: { reasons?: string[] }) {
  return (
    <Pill tone="bad" title={reasons?.length ? reasons.join('\n') : 'Answers that need a doctor first'}>
      <AlertTriangle size={12} /> Critical advisory
    </Pill>
  )
}

/** A standard table: header row, rows that open something, an empty state. */
export function Table<T>({
  rows,
  cols,
  onOpen,
  empty,
  rowKey,
}: {
  rows: T[]
  cols: { head: ReactNode; cell: (r: T) => ReactNode; className?: string; info?: string }[]
  onOpen?: (r: T) => void
  empty: string
  rowKey: (r: T) => string
}) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-[14px] text-muted">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-[14px]">
        <thead className="border-b border-line bg-track/40 text-[12px] font-medium text-muted">
          <tr>
            {cols.map((c, i) => (
              <th key={i} className={cx('px-4 py-2.5 font-medium', c.className)}>
                <span className="inline-flex items-center gap-1">
                  {c.head}
                  {c.info && <InfoTip text={c.info} />}
                </span>
              </th>
            ))}
            {onOpen && <th className="w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onOpen ? () => onOpen(r) : undefined}
              onKeyDown={onOpen ? (e) => e.key === 'Enter' && onOpen(r) : undefined}
              tabIndex={onOpen ? 0 : undefined}
              className={cx('align-middle', onOpen && 'cursor-pointer hover:bg-track/50 focus-visible:bg-track/50 focus-visible:outline-none')}
            >
              {cols.map((c, i) => (
                <td key={i} className={cx('px-4 py-3', c.className)}>
                  {c.cell(r)}
                </td>
              ))}
              {onOpen && (
                <td className="pr-3 text-faint">
                  <ChevronRight size={16} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PersonCell({ p }: { p: Person }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold text-ink">{p.name}</span>
        <PersonBadges p={p} />
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{[p.phone && `+91 ${p.phone.slice(0, 5)} ${p.phone.slice(5)}`, p.city].filter(Boolean).join(' · ')}</div>
    </div>
  )
}

/** Toggle chips that filter a list, each with its count. */
export function Chips<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; n?: number; info?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          title={o.info}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[14px] cursor-pointer',
            value === o.value ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-ink',
          )}
        >
          {o.label}
          {o.n !== undefined && <span className={cx('tabular-nums text-[12px]', value === o.value ? 'text-white/80' : 'text-faint')}>{o.n}</span>}
        </button>
      ))}
    </div>
  )
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[14px] text-ink cursor-pointer hover:bg-track/60">
      <Download size={14} /> Export CSV
    </button>
  )
}

/** A label and a value, for fact lists on profiles. */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(120px,40%)_1fr] gap-x-3 gap-y-2.5 text-[14px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Admin button: default, primary, danger or ghost. */
export function Btn({ children, onClick, tone = 'default', disabled, title, type = 'button' }: { children: ReactNode; onClick?: () => void; tone?: 'default' | 'primary' | 'danger' | 'ghost'; disabled?: boolean; title?: string; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[14px] font-medium cursor-pointer disabled:cursor-default disabled:opacity-40',
        tone === 'primary' && 'bg-brand text-white hover:bg-brand-ink',
        tone === 'default' && 'border border-line bg-surface text-ink hover:bg-track/60',
        tone === 'danger' && 'border border-line bg-surface text-danger hover:bg-accent-soft',
        tone === 'ghost' && 'text-muted hover:bg-track/60 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

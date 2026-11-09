import { ChevronLeft, ChevronRight, Globe } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addDays, fmtDay, fmtMonthLong, fmtTime, iso, parseISO, today } from '../lib/dates'
import { effectiveAvailability, isDayBlocked, openSlots, type Calendar, type SlotOptions } from '../lib/slots'
import type { Physio } from '../lib/types'
import { cx, IconButton } from './ui'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function monthGrid(month: string): (string | undefined)[] {
  const first = parseISO(month)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (string | undefined)[] = Array.from({ length: lead }, () => undefined)
  for (let d = 1; d <= days; d++) cells.push(iso(new Date(first.getFullYear(), first.getMonth(), d)))
  while (cells.length % 7) cells.push(undefined)
  return cells
}

const monthOf = (d: string) => `${d.slice(0, 7)}-01`
const shiftMonth = (m: string, n: number) => {
  const d = parseISO(m)
  return iso(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

/**
 * Calendly-style picker: month calendar with bookable days highlighted, then the open times.
 * Used on the public booking page, in the patient app and when the physio books.
 */
export function SlotPicker({
  physio,
  cal,
  opts,
  date,
  time,
  onDate,
  onTime,
  layout = 'split',
}: {
  physio: Physio
  cal: Calendar
  opts: SlotOptions
  date?: string
  time?: string
  onDate: (d: string) => void
  onTime: (t: string) => void
  layout?: 'split' | 'stacked'
}) {
  const t = today()
  const [month, setMonth] = useState(monthOf(date ?? t))
  const a = effectiveAvailability(physio)
  const lastDay = opts.forPatient ? addDays(t, a.maxDaysAhead) : addDays(t, 180)
  const cells = useMemo(() => monthGrid(month), [month])
  const openByDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of cells) if (d && d >= t && d <= lastDay) m.set(d, openSlots(physio, cal, d, opts).length)
    return m
  }, [cells, physio, cal, opts, t, lastDay])
  const slots = date ? openSlots(physio, cal, date, opts) : []
  const canPrev = month > monthOf(t)
  const canNext = shiftMonth(month, 1) <= lastDay

  return (
    <div className={cx(layout === 'split' && 'md:grid md:grid-cols-[minmax(0,1fr)_200px] md:gap-6')}>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[16px] font-semibold">{fmtMonthLong(month)}</div>
          <div className="flex gap-2">
            <IconButton aria-label="Previous month" className="h-9 w-9" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft size={18} />
            </IconButton>
            <IconButton aria-label="Next month" className="h-9 w-9" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))}>
              <ChevronRight size={18} />
            </IconButton>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DOW.map((d, i) => (
            <div key={i} className="pb-1 text-[12px] font-medium text-muted">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const n = openByDay.get(d) ?? 0
            const sel = d === date
            const blocked = isDayBlocked(cal.blocks, physio.id, d)
            return (
              <button
                key={d}
                type="button"
                disabled={!n}
                onClick={() => onDate(d)}
                aria-label={`${fmtDay(d)}${n ? `, ${n} open times` : ', unavailable'}`}
                aria-pressed={sel}
                className={cx(
                  'relative mx-auto grid aspect-square w-full max-w-[44px] place-items-center rounded-full text-[15px] transition-colors',
                  sel ? 'bg-brand font-semibold text-white' : n ? 'bg-brand-soft font-semibold text-brand hover:bg-brand-soft/70 cursor-pointer' : 'text-faint',
                  blocked && !sel && 'line-through',
                )}
              >
                {parseISO(d).getDate()}
                {d === t && <span className={cx('absolute bottom-1 h-1 w-1 rounded-full', sel ? 'bg-white' : 'bg-brand')} />}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
          <Globe size={13} /> India Standard Time (IST)
        </div>
      </div>

      <div className={cx('mt-5', layout === 'split' && 'md:mt-0')}>
        {date ? (
          <>
            <div className="mb-3 text-[15px] font-semibold">{fmtDay(date)}</div>
            {slots.length === 0 ? (
              <p className="text-[14px] text-muted">No open times on this day.</p>
            ) : (
              <div className={cx('grid grid-cols-3 gap-2 sm:grid-cols-4', layout === 'split' && 'md:max-h-[340px] md:grid-cols-1 md:overflow-y-auto md:pr-1')}>
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onTime(s)}
                    className={cx(
                      'h-11 rounded-xl border text-[14px] font-semibold transition-colors cursor-pointer',
                      time === s ? 'border-brand bg-brand text-white' : 'border-brand-line bg-surface text-brand hover:border-brand',
                    )}
                  >
                    {fmtTime(s)}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-[14px] text-muted">Pick a highlighted day to see open times.</p>
        )}
      </div>
    </div>
  )
}

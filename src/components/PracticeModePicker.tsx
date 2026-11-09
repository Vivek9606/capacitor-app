import { Briefcase, Building2, Check, House } from 'lucide-react'
import { PRACTICE_MODES } from '../lib/practice'
import type { PracticeMode } from '../lib/types'
import { cx } from './ui'

const ICON: Record<PracticeMode, React.ReactNode> = {
  clinic: <Building2 size={19} />,
  home: <House size={19} />,
  individual: <Briefcase size={19} />,
}

/** Multi-select: a physio can run a clinic, do home visits and consult elsewhere. */
export function PracticeModePicker({ value, onChange }: { value: PracticeMode[]; onChange: (v: PracticeMode[]) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {PRACTICE_MODES.map((m) => {
        const on = value.includes(m.id)
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id])}
            className={cx(
              'flex items-center gap-3 rounded-2xl border bg-surface p-3.5 text-left transition-colors cursor-pointer',
              on ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-brand-line',
            )}
          >
            <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', on ? 'bg-brand text-white' : 'bg-brand-soft text-brand')}>{ICON[m.id]}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{m.title}</span>
              <span className="block text-[13px] leading-snug text-muted">{m.sub}</span>
            </span>
            <span className={cx('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border', on ? 'border-brand bg-brand text-white' : 'border-[#cfcfc8]')}>
              {on && <Check size={15} strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

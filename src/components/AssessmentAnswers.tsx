import { AlertTriangle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Assessment } from '../lib/types'
import { cx } from './ui'

type Detail = Pick<Assessment, 'answers' | 'painScore' | 'advisoryReasons'>

/** Pain score as a small coloured pill: green → amber → red. */
export function PainPill({ score }: { score: number }) {
  const tone = score >= 7 ? 'bg-accent-soft text-danger' : score >= 4 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'
  return <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-semibold', tone)}>Pain {score}/10</span>
}

/**
 * What the person answered in an assessment: the pain score, why the critical advisory showed, and every question with
 * their answer. Collapsed to the essentials until opened. Results saved before 2026-11-18 have no answers.
 */
export function AssessmentAnswers({ a, open: startOpen = false }: { a: Detail; open?: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const answers = a.answers ?? []
  if (!answers.length && a.painScore == null && !a.advisoryReasons?.length) return null
  return (
    <div className="mt-2 flex flex-col gap-2">
      {(a.painScore != null || a.advisoryReasons?.length) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {a.painScore != null && <PainPill score={a.painScore} />}
          {a.advisoryReasons?.length ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-danger">
              <AlertTriangle size={12} /> Critical advisory
            </span>
          ) : null}
        </div>
      )}
      {a.advisoryReasons?.length ? (
        <ul className="rounded-xl bg-accent-soft px-3 py-2 text-[12.5px] leading-snug text-ink">
          {a.advisoryReasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      ) : null}
      {answers.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 self-start text-[13px] font-semibold text-brand cursor-pointer">
            {open ? 'Hide answers' : `See all ${answers.length} answers`}
            <ChevronDown size={14} className={cx('transition-transform duration-300 ease-in-out', open && 'rotate-180')} />
          </button>
          {open && (
            <dl className="flex flex-col gap-2 rounded-xl bg-track p-3">
              {answers.map((x, i) => (
                <div key={i}>
                  <dt className="text-[12px] text-muted">{x.q}</dt>
                  <dd className="text-[13.5px] font-medium leading-snug">{Array.isArray(x.a) ? x.a.join(', ') : x.a}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  )
}

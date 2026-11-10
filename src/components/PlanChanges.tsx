import { History } from 'lucide-react'
import { fmtShort, timeAgo } from '../lib/dates'
import type { Plan } from '../lib/types'
import { Card } from './ui'

/** The plan's change log: each adjustment with the physio's reason, newest first. */
export function PlanChanges({ plan, forPatient, physioName }: { plan: Plan; forPatient?: boolean; physioName?: string }) {
  const changes = [...(plan.changes ?? [])].reverse()
  if (!changes.length) return null
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-[16px] font-semibold">
        <History size={17} className="text-brand" /> {forPatient ? 'Changes to your plan' : 'Plan changes'}
      </div>
      <ol className="relative flex flex-col gap-4 border-l-2 border-brand-soft pl-4">
        {changes.map((c, i) => (
          <li key={c.at + i} className="relative">
            <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-brand" />
            <div className="text-[12px] font-semibold text-muted">
              {fmtShort(c.at.slice(0, 10))} · {timeAgo(c.at)}
              {forPatient && physioName ? ` · ${physioName}` : ''}
            </div>
            <div className="mt-0.5 text-[14px] font-medium">“{c.reason}”</div>
            {c.summary.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5 text-[13px] text-muted">
                {c.summary.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </Card>
  )
}

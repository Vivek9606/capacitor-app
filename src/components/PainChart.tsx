import { cx } from './ui'

/** Bar chart of self-reported pain (0–10). Last bar highlighted. */
export function PainChart({ points, max = 7 }: { points: { day: number; pain: number }[]; max?: number }) {
  const shown = points.slice(-max)
  if (!shown.length) return <div className="py-6 text-center text-[14px] text-muted">No pain scores logged yet.</div>
  return (
    <div className="flex h-[132px] items-end justify-between gap-2" role="img" aria-label={`Pain scores: ${shown.map((p) => `day ${p.day}: ${p.pain}`).join(', ')}`}>
      {shown.map((p, i) => {
        const last = i === shown.length - 1
        return (
          <div key={`${p.day}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[12px] font-semibold text-ink">{p.pain}</span>
            <div className={cx('w-full max-w-[34px] rounded-md', last ? 'bg-brand' : 'bg-brand-soft')} style={{ height: `${Math.max(6, (p.pain / 10) * 84)}px` }} />
            <span className="text-[11px] text-muted">D{p.day}</span>
          </div>
        )
      })}
    </div>
  )
}

import type { Exercise, Plan, PlanDraft, PlanItem } from './types'

const dose = (i: PlanItem) => `${i.sets}×${i.reps}${i.holdSec ? `, ${i.holdSec}s hold` : ''}${i.perSide ? ' each side' : ''}`

/** Plain-language list of what changed between the active plan and the edited draft (logged with the reason). */
export function planDiff(plan: Plan, draft: PlanDraft, exercises: Exercise[]): string[] {
  const name = (id: string) => exercises.find((e) => e.id === id)?.name ?? 'Exercise'
  const out: string[] = []
  const before = new Map(plan.items.map((i) => [i.exerciseId, i]))
  const after = new Map(draft.items.map((i) => [i.exerciseId, i]))
  for (const i of draft.items) if (!before.has(i.exerciseId)) out.push(`Added ${name(i.exerciseId)} (${dose(i)})`)
  for (const i of plan.items) if (!after.has(i.exerciseId)) out.push(`Removed ${name(i.exerciseId)}`)
  for (const i of draft.items) {
    const b = before.get(i.exerciseId)
    if (b && dose(b) !== dose(i)) out.push(`${name(i.exerciseId)}: ${dose(b)} → ${dose(i)}`)
    if (b && (b.note ?? '') !== (i.note ?? '')) out.push(`${name(i.exerciseId)}: note updated`)
  }
  if (plan.daysPerWeek !== draft.daysPerWeek) out.push(`Days a week: ${plan.daysPerWeek} → ${draft.daysPerWeek}`)
  if (plan.weeks !== draft.weeks) out.push(`Length: ${plan.weeks} → ${draft.weeks} weeks`)
  if ((draft.title || plan.title) !== plan.title) out.push(`Renamed to “${draft.title}”`)
  const rxB = plan.rx, rxA = draft.rx
  if (rxB || rxA.diagnosis || rxA.advice || rxA.modalities.length) {
    if ((rxB?.diagnosis ?? '') !== rxA.diagnosis) out.push('Diagnosis updated')
    if ((rxB?.advice ?? '') !== rxA.advice) out.push('Advice updated')
    if ((rxB?.modalities ?? []).join() !== rxA.modalities.join()) out.push('Treatment modalities updated')
  }
  if (plan.items.map((i) => i.exerciseId).join() !== draft.items.map((i) => i.exerciseId).join() && !out.some((s) => /^(Added|Removed)/.test(s)))
    out.push('Exercise order changed')
  return out
}

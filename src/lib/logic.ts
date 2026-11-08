import { addDays, diffDays, parseISO, today, weekDays } from './dates'
import type { Physio, Plan, SessionLog } from './types'

// Which weekdays (0=Mon..6=Sun) a plan with N days/week is scheduled on.
const PATTERNS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
}

export function planEnd(plan: Plan): string {
  return addDays(plan.startDate, plan.weeks * 7 - 1)
}

export function isScheduled(plan: Plan, date: string): boolean {
  if (date < plan.startDate || date > planEnd(plan)) return false
  if (date === plan.startDate) return true // first session is always the day the plan arrives
  const dow = (parseISO(date).getDay() + 6) % 7
  return (PATTERNS[plan.daysPerWeek] ?? PATTERNS[5]).includes(dow)
}

export function scheduledDates(plan: Plan): string[] {
  const out: string[] = []
  const end = planEnd(plan)
  for (let d = plan.startDate; d <= end; d = addDays(d, 1)) if (isScheduled(plan, d)) out.push(d)
  return out
}

export function planWeek(plan: Plan, on = today()): number {
  return Math.min(plan.weeks, Math.max(1, Math.floor(diffDays(on, plan.startDate) / 7) + 1))
}

export function logsFor(planId: string, sessions: SessionLog[]): SessionLog[] {
  return sessions.filter((s) => s.planId === planId).sort((a, b) => a.date.localeCompare(b.date))
}

export interface Adherence {
  done: number
  due: number
  pct: number
}

/** Sessions done vs sessions due up to and including today. */
export function adherence(plan: Plan, sessions: SessionLog[], on = today()): Adherence {
  const due = scheduledDates(plan).filter((d) => d <= on)
  const logs = logsFor(plan.id, sessions)
  // Extra sessions on rest days are welcome but don't cancel out a missed scheduled day.
  const done = logs.filter((l) => l.status === 'done' && l.date <= on && isScheduled(plan, l.date)).length
  // Don't penalise today until it's over.
  const dueCount = due.filter((d) => d < on || logs.some((l) => l.date === d)).length
  return { done, due: dueCount, pct: dueCount ? Math.round((done / dueCount) * 100) : 0 }
}

export type DotState = 'done' | 'missed' | 'today' | 'upcoming' | 'rest' | 'today_done'

export interface Dot {
  date: string
  label: string
  state: DotState
}

export function weekDots(plan: Plan, sessions: SessionLog[], on = today()): Dot[] {
  const logs = logsFor(plan.id, sessions)
  return weekDays(on).map((d) => {
    const label = 'MTWTFSS'[(parseISO(d).getDay() + 6) % 7]
    const log = logs.find((l) => l.date === d)
    if (!isScheduled(plan, d)) return { date: d, label, state: log?.status === 'done' ? 'done' : 'rest' }
    if (log?.status === 'done') return { date: d, label, state: d === on ? 'today_done' : 'done' }
    if (d === on) return { date: d, label, state: 'today' }
    if (d < on) return { date: d, label, state: 'missed' }
    return { date: d, label, state: 'upcoming' }
  })
}

export function painSeries(plan: Plan, sessions: SessionLog[]): { day: number; pain: number; date: string }[] {
  return logsFor(plan.id, sessions)
    .filter((l) => l.pain !== undefined)
    .map((l) => ({ day: diffDays(l.date, plan.startDate) + 1, pain: l.pain as number, date: l.date }))
}

export function painTrend(plan: Plan, sessions: SessionLog[]): { first: number; last: number } | undefined {
  const s = painSeries(plan, sessions)
  if (!s.length) return undefined
  return { first: s[0].pain, last: s[s.length - 1].pain }
}

export interface ProfileStep {
  key: string
  label: string
  done: boolean
  to: string
  nudge: string
  cta: string
}

export function profileSteps(p: Physio): ProfileStep[] {
  return [
    { key: 'basic', label: 'Basic details', done: !!p.name, to: '/app/profile/edit', nudge: 'Add your name so patients recognise you.', cta: 'Add details' },
    { key: 'focus', label: 'Focus areas', done: p.focusAreas.length > 0, to: '/app/profile/edit', nudge: 'Pick your focus areas.', cta: 'Pick areas' },
    {
      key: 'qual',
      label: 'Qualifications & council reg. no.',
      done: !!p.qualification && !!p.councilRegNo,
      to: '/app/profile/edit',
      nudge: 'Add your qualification and council registration to get verified.',
      cta: 'Get verified',
    },
    {
      key: 'clinic',
      label: 'Clinic location & map tag',
      done: !!p.clinic?.address,
      to: '/app/profile/clinic',
      nudge: 'Add your clinic location so patients near you can find and book you.',
      cta: 'Add location',
    },
    {
      key: 'hours',
      label: 'Consult hours & fees',
      done: !!p.hours,
      to: '/app/profile/clinic',
      nudge: 'Set your consult hours and fees so patients can book open slots.',
      cta: 'Set hours',
    },
  ]
}

export function profileCompletion(p: Physio) {
  const steps = profileSteps(p)
  const done = steps.filter((s) => s.done).length
  return { steps, done, total: steps.length, pct: Math.round((done / steps.length) * 100), next: steps.find((s) => !s.done) }
}

export function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function firstName(name: string): string {
  const parts = name.replace(/^Dr\.?\s+/i, '').split(/\s+/)
  return parts[0] ?? name
}

export function fmtPhone(p: string): string {
  const d = p.replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/^dr\.?\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`
}


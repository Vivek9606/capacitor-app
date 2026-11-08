import { addDays, diffDays, today } from './dates'
import { adherence, isScheduled, logsFor, planEnd, planWeek, weekDots } from './logic'
import type { DB, Patient } from './types'

/** Everything the patient app needs, derived from the DB. */
export function patientView(db: DB, patient: Patient) {
  const t = today()
  const physio = db.physios.find((p) => p.id === patient.physioId)!
  const plan = db.plans.find((p) => p.patientId === patient.id && p.status === 'active')
  const pastPlans = db.plans.filter((p) => p.patientId === patient.id && p.status !== 'active' && p.items.length > 0)
  const rxPlans = db.plans.filter((p) => p.patientId === patient.id && p.rx).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  const logs = plan ? logsFor(plan.id, db.sessions) : []
  const todayLog = logs.find((l) => l.date === t)
  const scheduledToday = !!plan && isScheduled(plan, t)
  let nextSession: string | undefined
  if (plan) {
    for (let d = addDays(t, 1); d <= planEnd(plan); d = addDays(d, 1))
      if (isScheduled(plan, d)) {
        nextSession = d
        break
      }
  }
  const bookings = db.bookings
    .filter((b) => (b.patientId === patient.id || b.patientPhone === patient.phone) && b.physioId === physio.id && b.status !== 'cancelled')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const upcoming = bookings.filter((b) => b.date >= t && b.status !== 'done')
  const past = bookings.filter((b) => b.date < t || b.status === 'done').reverse()
  const messages = db.messages.filter((m) => m.patientId === patient.id).sort((a, b) => a.at.localeCompare(b.at))
  const unreadFromPhysio = messages.filter((m) => m.from === 'physio' && !m.read).length

  return {
    physio,
    plan,
    pastPlans,
    rxPlans,
    logs,
    todayLog,
    scheduledToday,
    nextSession,
    week: plan ? planWeek(plan) : 0,
    dayNo: plan ? Math.max(1, diffDays(t, plan.startDate) + 1) : 0,
    dots: plan ? weekDots(plan, db.sessions) : [],
    adherence: plan ? adherence(plan, db.sessions) : undefined,
    upcoming,
    past,
    messages,
    unreadFromPhysio,
    hasDoneAnySession: logs.some((l) => l.status === 'done'),
  }
}

/** Rough session length: ~40s per set incl. rest. */
export function estMinutes(items: { sets: number }[]): number {
  return Math.max(5, Math.round((items.reduce((s, i) => s + i.sets, 0) * 40) / 60))
}

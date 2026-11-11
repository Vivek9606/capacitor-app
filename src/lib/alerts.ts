import { diffDays, fmtDay, fmtTime, timeAgo, today } from './dates'
import { firstName, logsFor } from './logic'
import type { DB } from './types'

export type AlertKind = 'request' | 'reschedule' | 'message' | 'unopened' | 'missed'

export interface Alert {
  id: string
  kind: AlertKind
  title: string
  sub: string
  patientId?: string
  bookingId?: string
  planId?: string
  phone?: string
  name: string
}

/** Everything that needs the physio's attention, most urgent first. */
export function physioAlerts(db: DB, physioId: string): Alert[] {
  const out: Alert[] = []
  const t = today()
  const patients = db.patients.filter((p) => p.physioId === physioId && !p.dischargedAt)

  for (const b of db.bookings.filter((b) => b.physioId === physioId && b.date >= t)) {
    if (b.status === 'requested')
      out.push({
        id: `req-${b.id}`,
        kind: 'request',
        title: `${b.patientName} wants to book ${fmtDay(b.date)}, ${fmtTime(b.time)}`,
        sub: b.reason ? `“${b.reason}” · from your public profile` : 'From your public profile',
        bookingId: b.id,
        phone: b.patientPhone,
        name: b.patientName,
      })
    if (b.status === 'reschedule')
      out.push({
        id: `rs-${b.id}`,
        kind: 'reschedule',
        title: `${firstName(b.patientName)} asked to reschedule`,
        sub: `${fmtDay(b.date)}, ${fmtTime(b.time)} · tapped Reschedule on WhatsApp`,
        bookingId: b.id,
        patientId: b.patientId,
        phone: b.patientPhone,
        name: b.patientName,
      })
  }

  for (const p of patients) {
    const unread = db.messages.filter((m) => m.patientId === p.id && m.from === 'patient' && !m.read)
    const plan = db.plans.find((pl) => pl.patientId === p.id && pl.status === 'active')
    if (unread.length) {
      const last = unread[unread.length - 1]
      out.push({
        id: `msg-${p.id}`,
        kind: 'message',
        title: `${firstName(p.name)}: “${last.text}”`,
        sub: `Question · ${timeAgo(last.at)}`,
        patientId: p.id,
        planId: plan?.id,
        phone: p.phone,
        name: p.name,
      })
    }
    if (plan && !plan.openedAt) {
      const days = diffDays(t, plan.sentAt.slice(0, 10))
      if (days >= 2)
        out.push({
          id: `unopened-${plan.id}`,
          kind: 'unopened',
          title: `${firstName(p.name)} hasn’t opened the plan in ${days} days`,
          sub: 'Nudge on WhatsApp →',
          patientId: p.id,
          planId: plan.id,
          phone: p.phone,
          name: p.name,
        })
    } else if (plan) {
      const recent = logsFor(plan.id, db.sessions).filter((l) => l.date < t)
      const lastDone = [...recent].reverse().find((l) => l.status === 'done')
      const since = lastDone ? diffDays(t, lastDone.date) : diffDays(t, plan.startDate)
      if (since >= 3)
        out.push({
          id: `missed-${plan.id}`,
          kind: 'missed',
          title: `${firstName(p.name)} hasn’t logged a session in ${since} days`,
          sub: 'Send a nudge →',
          patientId: p.id,
          planId: plan.id,
          phone: p.phone,
          name: p.name,
        })
    }
  }
  const order: AlertKind[] = ['request', 'reschedule', 'message', 'unopened', 'missed']
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}

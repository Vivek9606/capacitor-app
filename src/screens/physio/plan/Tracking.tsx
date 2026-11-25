import { CircleAlert, CircleCheck, MessageSquare } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ExerciseMedia } from '../../../components/ExerciseMedia'
import { PainChart } from '../../../components/PainChart'
import { Page } from '../../../components/Shell'
import { Button, Card, cx, PageHeader, WeekDots } from '../../../components/ui'
import { doseLabel } from '../../../lib/exercises'
import { fmtShort, fmtTime, timeAgo, today } from '../../../lib/dates'
import { PlanChanges } from '../../../components/PlanChanges'
import { firstName, logsFor, painSeries, painTrend, weekDots } from '../../../lib/logic'
import { openWhatsApp, publicUrl } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'
import { MessageThread } from '../MessageThread'

// R5 · Plan sent & tracking
export default function Tracking() {
  const { id } = useParams()
  const store = useStore()
  const { db } = store
  const { physio } = useMe()
  const nav = useNavigate()
  const plan = db.plans.find((p) => p.id === id)
  const patient = plan && db.patients.find((p) => p.id === plan.patientId)

  if (!plan || !patient || !physio) return <Navigate to="/physio-dashboard/patients" replace />
  const dots = weekDots(plan, db.sessions)
  const scheduledThisWeek = dots.filter((d) => d.state !== 'rest').length
  const doneThisWeek = dots.filter((d) => d.state === 'done' || d.state === 'today_done').length
  const pain = painTrend(plan, db.sessions)
  const notes = logsFor(plan.id, db.sessions).filter((l) => l.note)
  const sent = new Date(plan.sentAt)
  const name = firstName(patient.name)

  const nudge = () =>
    openWhatsApp(
      patient.phone,
      `Hi ${name}, this is ${physio.name}. Don’t forget today’s session: it takes about 15 minutes: ${publicUrl(`/plan/${patient.linkToken}`)}`,
    )

  const adjust = () => {
    store.startDraft(patient.id, { items: plan.items, daysPerWeek: plan.daysPerWeek, weeks: plan.weeks, title: plan.title, ...(plan.rx ? { rx: plan.rx } : {}), editPlanId: plan.status === 'active' ? plan.id : undefined, mode: 'plan' })
    nav('/physio-dashboard/plan/build')
  }

  return (
    <Page wide>
      <PageHeader
        title={`${name} · ${plan.title}`}
        subtitle={`Sent ${fmtShort(plan.sentAt.slice(0, 10))} · ${fmtTime(`${sent.getHours()}:${sent.getMinutes()}`)}`}
        onBack={() => nav(`/physio-dashboard/patients/${patient.id}`)}
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          {plan.openedAt ? (
            <div className="flex items-center gap-3 rounded-2xl bg-lime p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ok text-white">
                <CircleCheck size={20} />
              </div>
              <div>
                <div className="text-[16px] font-semibold">Delivered & opened</div>
                <div className="text-[13px] text-muted">{patient.consentAt ? `${name} consented and joined Betterhood` : `Opened ${timeAgo(plan.openedAt)}`}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white">
                <CircleAlert size={20} />
              </div>
              <div className="flex-1">
                <div className="text-[16px] font-semibold">Delivered · not opened yet</div>
                <div className="text-[13px] text-muted">Sent {timeAgo(plan.sentAt)}</div>
              </div>
              <Button size="sm" variant="whatsapp" onClick={nudge}>
                Nudge
              </Button>
            </div>
          )}

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[16px] font-semibold">This week</div>
              <div className="text-[14px] font-semibold text-brand">
                {doneThisWeek} of {scheduledThisWeek} sessions
              </div>
            </div>
            <WeekDots dots={dots} />
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[16px] font-semibold">Pain score (self-reported)</div>
              {pain && (
                <div className={cx('text-[14px] font-semibold', pain.last <= pain.first ? 'text-ok' : 'text-accent')}>
                  {pain.first} → {pain.last}
                </div>
              )}
            </div>
            <PainChart points={painSeries(plan, db.sessions)} />
          </Card>

          <div className="hidden gap-3 lg:flex">
            <Button variant="secondary" className="flex-1" onClick={nudge}>
              Send nudge
            </Button>
            <Button className="flex-1" onClick={adjust}>
              Adjust plan
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:mt-0">
          <PlanChanges plan={plan} />
          <div>
            <div className="mb-2 text-[16px] font-semibold">Questions & notes</div>
            <MessageThread
              patient={patient}
              extra={notes.map((n) => (
                <div key={n.id} className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">“{n.note}”</div>
                    <div className="text-[12px] text-muted">Session note · {n.date === today() ? 'today' : fmtShort(n.date)}</div>
                  </div>
                </div>
              ))}
            />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[16px] font-semibold">Exercises</div>
              <div className="text-[13px] text-muted">
                {plan.daysPerWeek} days/wk · {plan.weeks} weeks
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {plan.items.map((it) => {
                const ex = db.exercises.find((e) => e.id === it.exerciseId)
                return (
                  <div key={it.exerciseId} className="flex items-center gap-3">
                    <ExerciseMedia region={ex?.region} size="sm" className="h-10 w-10 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold">{ex?.name}</div>
                      <div className="text-[12px] text-muted">{doseLabel(it)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 flex gap-3 pb-6 lg:hidden">
        <Button variant="secondary" className="flex-1" onClick={nudge}>
          Send nudge
        </Button>
        <Button className="flex-1" onClick={adjust}>
          Adjust plan
        </Button>
      </div>
    </Page>
  )
}

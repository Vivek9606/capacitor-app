import { CircleAlert, CircleCheck, MessageSquare, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ExerciseMedia } from '../../../components/ExerciseMedia'
import { PainChart } from '../../../components/PainChart'
import { Page } from '../../../components/Shell'
import { Button, Card, cx, PageHeader, WeekDots } from '../../../components/ui'
import { doseLabel } from '../../../lib/exercises'
import { fmtShort, fmtTime, timeAgo, today } from '../../../lib/dates'
import { PlanChanges } from '../../../components/PlanChanges'
import { firstName, logsFor, painSeries, painTrend, weekDots } from '../../../lib/logic'
import { openWhatsApp, publicUrl, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

// R5 · Plan sent & tracking
export default function Tracking() {
  const { id } = useParams()
  const store = useStore()
  const { db } = store
  const { physio } = useMe()
  const nav = useNavigate()
  const [reply, setReply] = useState('')
  const plan = db.plans.find((p) => p.id === id)
  const patient = plan && db.patients.find((p) => p.id === plan.patientId)
  const hasUnread = !!patient && db.messages.some((m) => m.patientId === patient.id && m.from === 'patient' && !m.read)

  useEffect(() => {
    if (patient && hasUnread) store.markRead(patient.id, 'physio')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, hasUnread])

  if (!plan || !patient || !physio) return <Navigate to="/app/patients" replace />
  const dots = weekDots(plan, db.sessions)
  const scheduledThisWeek = dots.filter((d) => d.state !== 'rest').length
  const doneThisWeek = dots.filter((d) => d.state === 'done' || d.state === 'today_done').length
  const pain = painTrend(plan, db.sessions)
  const messages = db.messages.filter((m) => m.patientId === patient.id).sort((a, b) => a.at.localeCompare(b.at))
  const notes = logsFor(plan.id, db.sessions).filter((l) => l.note)
  const sent = new Date(plan.sentAt)
  const name = firstName(patient.name)

  const nudge = () =>
    openWhatsApp(
      patient.phone,
      `Hi ${name}, this is ${physio.name}. Don’t forget today’s session — it takes about 15 minutes: ${publicUrl(`/plan/${patient.linkToken}`)}`,
    )

  const adjust = () => {
    store.startDraft(patient.id, { items: plan.items, daysPerWeek: plan.daysPerWeek, weeks: plan.weeks, title: plan.title, ...(plan.rx ? { rx: plan.rx } : {}), editPlanId: plan.status === 'active' ? plan.id : undefined, mode: 'plan' })
    nav('/app/plan/build')
  }

  const sendReply = () => {
    if (!reply.trim()) return
    // Phase 2: physio_reply WhatsApp template so the patient sees it outside the app too.
    store.sendMessage(physio.id, patient.id, 'physio', reply.trim())
    setReply('')
    toast(`Reply sent to ${name} on WhatsApp`)
  }

  return (
    <Page wide>
      <PageHeader
        title={`${name} · ${plan.title}`}
        subtitle={`Sent ${fmtShort(plan.sentAt.slice(0, 10))} · ${fmtTime(`${sent.getHours()}:${sent.getMinutes()}`)}`}
        onBack={() => nav(`/app/patients/${patient.id}`)}
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
          {(messages.length > 0 || notes.length > 0) && (
            <Card className="p-4">
              <div className="mb-3 text-[16px] font-semibold">Questions & notes</div>
              <div className="flex flex-col gap-2.5">
                {notes.map((n) => (
                  <div key={n.id} className="flex gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <div className="text-[14px] font-medium">“{n.note}”</div>
                      <div className="text-[12px] text-muted">
                        Session note · {n.date === today() ? 'today' : fmtShort(n.date)}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.map((m) => (
                  <div key={m.id} className={cx('flex', m.from === 'physio' && 'justify-end')}>
                    <div className={cx('max-w-[85%] rounded-2xl px-3.5 py-2.5', m.from === 'physio' ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm bg-accent-soft')}>
                      <div className="text-[14px]">{m.text}</div>
                      <div className={cx('mt-0.5 text-[11px]', m.from === 'physio' ? 'text-white/70' : 'text-muted')}>
                        {m.from === 'patient' ? name : 'You'} · {timeAgo(m.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form
                className="mt-3 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  sendReply()
                }}
              >
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Reply to ${name}…`}
                  className="h-11 flex-1 rounded-full border border-line bg-bg px-4 text-[15px] outline-none focus:border-brand"
                />
                <button aria-label="Send reply" disabled={!reply.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white disabled:opacity-40 cursor-pointer">
                  <Send size={17} />
                </button>
              </form>
            </Card>
          )}

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

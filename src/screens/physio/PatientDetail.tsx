import { CalendarDays, ChevronRight, ClipboardList, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { bookingLine, BookingBadge } from '../../components/bits'
import { Page } from '../../components/Shell'
import { Badge, Button, Card, cx, Empty, Footer, IconButton, IconTile, PageHeader, Progress, WeekDots } from '../../components/ui'
import { fmtDay, fmtMonthYear, fmtShort, fmtTime } from '../../lib/dates'
import { adherence, fmtPhone, painTrend, planWeek, weekDots } from '../../lib/logic'
import { openWhatsApp } from '../../lib/platform'
import { useStore } from '../../lib/store'
import type { Plan } from '../../lib/types'
import { useStartPlan } from './Patients'

const TABS = ['Overview', 'Plans', 'Rx', 'Visits'] as const

// R1 · Patient
export default function PatientDetail() {
  const { id } = useParams()
  const { db } = useStore()
  const nav = useNavigate()
  const startPlan = useStartPlan()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const p = db.patients.find((x) => x.id === id)
  if (!p) return <Navigate to="/app/patients" replace />

  const plans = db.plans.filter((pl) => pl.patientId === p.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  const active = plans.find((pl) => pl.status === 'active')
  const lastRx = plans.find((pl) => pl.rx)
  const visits = db.bookings.filter((b) => b.patientId === p.id && b.status !== 'cancelled').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const meta = [p.age, p.sex, fmtPhone(p.phone)].filter(Boolean).join(' · ')

  return (
    <Page wide>
      <PageHeader
        title={p.name}
        subtitle={meta}
        right={
          <IconButton aria-label="Message on WhatsApp" onClick={() => openWhatsApp(p.phone, `Hi ${p.name.split(' ')[0]}, `)}>
            <MessageCircle size={19} className="text-wa" />
          </IconButton>
        }
      />
      <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
        <div>
          <Card className="p-4">
            <div className="text-[18px] font-semibold">{p.condition ?? 'No diagnosis yet'}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.since && <span className="rounded-full border border-line px-3 py-1.5 text-[13px]">Since {fmtMonthYear(p.since)}</span>}
              <span className="rounded-full border border-line px-3 py-1.5 text-[13px]">
                {p.visits} visit{p.visits === 1 ? '' : 's'}
              </span>
              {p.tags.map((t) => (
                <span key={t} className="rounded-full border border-line px-3 py-1.5 text-[13px]">
                  {t}
                </span>
              ))}
            </div>
          </Card>
          <div className="hidden lg:mt-4 lg:flex lg:flex-col lg:gap-3">
            <Button block onClick={() => startPlan(p.id, 'plan')}>
              {active ? 'Start new care plan' : 'Build care plan'}
            </Button>
            <Button block variant="secondary" onClick={() => startPlan(p.id, 'rx')}>
              Prescription only
            </Button>
            <Button block variant="secondary" onClick={() => nav('/app/bookings/new', { state: { patientId: p.id } })}>
              Book a visit
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-4 mt-5 flex gap-6 border-b border-line lg:mt-0">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx('-mb-px border-b-2 pb-2.5 text-[15px] cursor-pointer', tab === t ? 'border-brand font-semibold text-brand' : 'border-transparent text-muted')}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="flex flex-col gap-3">
              {active ? (
                <PlanCard plan={active} />
              ) : (
                <Card>
                  <Empty icon={<ClipboardList size={20} />} title="No active care plan" body="Build one in about two minutes and send it on WhatsApp." />
                </Card>
              )}
              {lastRx?.rx && (
                <Card className="flex items-center gap-3 p-4" onClick={() => setTab('Rx')}>
                  <IconTile tone="accent">
                    <ClipboardList size={19} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">Last Rx · {fmtShort(lastRx.sentAt.slice(0, 10))}</div>
                    <div className="truncate text-[13px] text-muted">{lastRx.rx.advice || lastRx.rx.diagnosis}</div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </Card>
              )}
            </div>
          )}

          {tab === 'Plans' && (
            <div className="flex flex-col gap-3">
              {plans.filter((pl) => pl.items.length).length === 0 && (
                <Card>
                  <Empty icon={<ClipboardList size={20} />} title="No plans yet" />
                </Card>
              )}
              {plans
                .filter((pl) => pl.items.length)
                .map((pl) => (
                  <PlanCard key={pl.id} plan={pl} compact />
                ))}
            </div>
          )}

          {tab === 'Rx' && (
            <div className="flex flex-col gap-3">
              {plans.filter((pl) => pl.rx).length === 0 && (
                <Card>
                  <Empty icon={<ClipboardList size={20} />} title="No prescriptions yet" />
                </Card>
              )}
              {plans
                .filter((pl) => pl.rx)
                .map((pl) => (
                  <Card key={pl.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] font-semibold">{pl.rx!.diagnosis || 'Prescription'}</div>
                      <span className="text-[13px] text-muted">{fmtShort(pl.sentAt.slice(0, 10))}</span>
                    </div>
                    {pl.rx!.advice && <p className="mt-2 text-[14px] leading-relaxed text-muted">{pl.rx!.advice}</p>}
                    {pl.rx!.modalities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {pl.rx!.modalities.map((m) => (
                          <Badge key={m} tone="brand">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          )}

          {tab === 'Visits' && (
            <div className="flex flex-col gap-3">
              {visits.length === 0 && (
                <Card>
                  <Empty icon={<CalendarDays size={20} />} title="No visits booked" />
                </Card>
              )}
              {visits.map((b) => (
                <Card key={b.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">
                      {fmtDay(b.date)} · {fmtTime(b.time)}
                    </div>
                    <div className="truncate text-[13px] text-muted">{bookingLine(b)}</div>
                  </div>
                  <BookingBadge status={b.status} />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer className="lg:hidden">
        <Button block onClick={() => startPlan(p.id, 'plan')}>
          {active ? 'Start new care plan' : 'Build care plan'}
        </Button>
      </Footer>
    </Page>
  )
}

function PlanCard({ plan, compact }: { plan: Plan; compact?: boolean }) {
  const { db } = useStore()
  const nav = useNavigate()
  const adh = adherence(plan, db.sessions)
  const pain = painTrend(plan, db.sessions)
  const status = plan.status === 'active' ? (plan.openedAt ? 'Active' : 'Not opened') : plan.status === 'completed' ? 'Completed' : 'Replaced'
  return (
    <Card className="p-4" onClick={() => nav(`/app/plans/${plan.id}`)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[17px] font-semibold">{plan.title} plan</div>
          <div className="text-[13px] text-muted">
            {plan.status === 'active' ? `Week ${planWeek(plan)} of ${plan.weeks}` : `${plan.weeks} weeks`} · {plan.items.length} exercises
          </div>
        </div>
        <Badge tone={status === 'Active' ? 'brand' : status === 'Not opened' ? 'accent' : 'muted'}>{status}</Badge>
      </div>
      {!compact && plan.status === 'active' && (
        <div className="mt-4">
          <WeekDots dots={weekDots(plan, db.sessions)} />
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-[14px]">
        <span className="text-muted">Adherence</span>
        <span className="font-semibold text-brand">
          {adh.pct}% · {adh.done} of {adh.due}
        </span>
      </div>
      <Progress value={adh.pct} className="mt-2" />
      {pain && (
        <div className="mt-3 flex items-center justify-between text-[14px]">
          <span className="text-muted">Pain score</span>
          <span className={cx('font-semibold', pain.last <= pain.first ? 'text-ok' : 'text-accent')}>
            {pain.first} → {pain.last} / 10
          </span>
        </div>
      )}
    </Card>
  )
}

import { CalendarDays, Check, ChevronRight, ClipboardList, Clock, FileSignature, MessageCircle, ReceiptIndianRupee } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { attendanceMarked, bookingLine, BookingBadge, canMarkAttendance } from '../../components/bits'
import { Page } from '../../components/Shell'
import { Badge, Button, Card, cx, Empty, Footer, IconButton, IconTile, PageHeader, Progress, WeekDots } from '../../components/ui'
import { fmtDay, fmtMonthYear, fmtShort, fmtTime, today } from '../../lib/dates'
import { hasConsent } from '../../lib/consents'
import { inr } from '../../lib/invoices'
import { adherence, fmtPhone, painTrend, planWeek, weekDots } from '../../lib/logic'
import { openWhatsApp, toast } from '../../lib/platform'
import { useStore } from '../../lib/store'
import type { Plan } from '../../lib/types'
import { useStartPlan } from './Patients'

const TABS = ['Overview', 'Plans', 'Treatment', 'Visits', 'Consents', 'Bills'] as const
type Tab = (typeof TABS)[number]

// R1 · Patient
export default function PatientDetail() {
  const { id } = useParams()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const startPlan = useStartPlan()
  const initial = (useLocation().state as { tab?: Tab } | null)?.tab
  const [tab, setTab] = useState<Tab>(initial && TABS.includes(initial) ? initial : 'Overview')
  const p = db.patients.find((x) => x.id === id)
  if (!p) return <Navigate to="/app/patients" replace />

  const plans = db.plans.filter((pl) => pl.patientId === p.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  const active = plans.find((pl) => pl.status === 'active')
  const lastRx = plans.find((pl) => pl.rx)
  const visits = db.bookings.filter((b) => b.patientId === p.id && b.status !== 'cancelled').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const meta = [p.age, p.sex, fmtPhone(p.phone)].filter(Boolean).join(' · ')
  const attended = visits.filter((b) => b.status === 'done').length
  const noShows = visits.filter((b) => b.status === 'no_show').length
  const consents = db.consents.filter((c) => c.patientId === p.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
  const invoices = db.invoices.filter((i) => i.patientId === p.id && i.status !== 'void').sort((a, b) => b.date.localeCompare(a.date))
  const due = invoices.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.total, 0)
  const needsGeneral = !hasConsent(db.consents, p.id, 'general')

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
            <div className="font-display text-[18px] font-bold">{p.condition ?? 'No diagnosis yet'}</div>
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
              Treatment plan only
            </Button>
            <Button block variant="secondary" onClick={() => nav('/app/bookings/new', { state: { patientId: p.id } })}>
              Book a visit
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" size="md" onClick={() => nav(`/app/patients/${p.id}/consent`)}>
                <FileSignature size={16} /> Consent
              </Button>
              <Button variant="secondary" size="md" onClick={() => nav('/app/invoices/new', { state: { patientId: p.id } })}>
                <ReceiptIndianRupee size={16} /> Invoice
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="no-scrollbar -mx-5 mb-4 mt-5 flex gap-6 overflow-x-auto border-b border-line px-5 lg:mx-0 lg:mt-0 lg:px-0">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx('-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 text-[15px] cursor-pointer', tab === t ? 'border-brand font-semibold text-brand' : 'border-transparent text-muted')}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="flex flex-col gap-3">
              {needsGeneral && (
                <div className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
                  <FileSignature size={19} className="shrink-0 text-accent" />
                  <div className="min-w-0 flex-1 text-[14px]">
                    <div className="font-medium">No signed treatment consent yet</div>
                    <div className="text-[13px] text-muted">Take it before the first treatment.</div>
                  </div>
                  <Button size="sm" onClick={() => nav(`/app/patients/${p.id}/consent`, { state: { formId: 'general' } })}>
                    Take consent
                  </Button>
                </div>
              )}
              {due > 0 && (
                <Card className="flex items-center gap-3 p-4" onClick={() => setTab('Bills')}>
                  <IconTile tone="accent">
                    <ReceiptIndianRupee size={19} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{inr(due)} due</div>
                    <div className="text-[13px] text-muted">{invoices.filter((i) => i.status === 'unpaid').length} unpaid invoice(s)</div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </Card>
              )}
              {active ? (
                <PlanCard plan={active} />
              ) : (
                <Card>
                  <Empty icon={<ClipboardList size={20} />} title="No active care plan" body="Build one in about two minutes and send it on WhatsApp." />
                </Card>
              )}
              {lastRx?.rx && (
                <Card className="flex items-center gap-3 p-4" onClick={() => setTab('Treatment')}>
                  <IconTile tone="accent">
                    <ClipboardList size={19} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">Last treatment plan · {fmtShort(lastRx.sentAt.slice(0, 10))}</div>
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

          {tab === 'Treatment' && (
            <div className="flex flex-col gap-3">
              {plans.filter((pl) => pl.rx).length === 0 && (
                <Card>
                  <Empty icon={<ClipboardList size={20} />} title="No treatment plans yet" />
                </Card>
              )}
              {plans
                .filter((pl) => pl.rx)
                .map((pl) => (
                  <Card key={pl.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] font-semibold">{pl.rx!.diagnosis || 'Treatment plan'}</div>
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
              {visits.length > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Attended" value={attended} />
                  <Stat label="No-shows" value={noShows} warn={noShows > 0} />
                  <Stat label="Show rate" value={attended + noShows ? `${Math.round((attended / (attended + noShows)) * 100)}%` : '—'} />
                </div>
              )}
              {visits.length === 0 && (
                <Card>
                  <Empty icon={<CalendarDays size={20} />} title="No visits booked" />
                </Card>
              )}
              {visits.map((b) => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold">
                        {fmtDay(b.date)} · {fmtTime(b.time)}
                      </div>
                      <div className="truncate text-[13px] text-muted">{bookingLine(b)}</div>
                    </div>
                    <BookingBadge status={b.status} />
                  </div>
                  {attendanceMarked(b, today()) && (
                    <button
                      className="mt-2 text-[13px] font-semibold text-brand cursor-pointer"
                      onClick={() => {
                        const status = b.status === 'no_show' ? 'done' : 'no_show'
                        store.updateBooking(b.id, { status })
                        toast(status === 'done' ? 'Changed to showed up' : 'Changed to no-show')
                      }}
                    >
                      {b.status === 'no_show' ? 'Change to showed up' : 'Change to no-show'}
                    </button>
                  )}
                  {canMarkAttendance(b) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          store.updateBooking(b.id, { status: 'done' })
                          toast('Marked as attended')
                        }}
                      >
                        <Check size={14} /> Showed up
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          store.updateBooking(b.id, { status: 'no_show' })
                          toast('Marked as no-show')
                        }}
                      >
                        No-show
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {tab === 'Consents' && (
            <div className="flex flex-col gap-3">
              <Button variant="soft" size="md" className="self-start" onClick={() => nav(`/app/patients/${p.id}/consent`)}>
                <FileSignature size={16} /> Take a consent
              </Button>
              {consents.length === 0 && (
                <Card>
                  <Empty icon={<FileSignature size={20} />} title="No consent forms yet" body="Take a general treatment consent at the first visit, and separate ones for dry needling or manipulation." />
                </Card>
              )}
              {consents.map((c) => (
                <Card key={c.id} className="flex items-center gap-3 p-4" onClick={() => nav(`/app/consents/${c.id}`)}>
                  <IconTile tone={c.status === 'signed' ? 'brand' : 'accent'}>{c.status === 'signed' ? <Check size={18} /> : <Clock size={18} />}</IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{c.title}</div>
                    <div className="text-[13px] text-muted">
                      {c.status === 'signed'
                        ? `Signed ${fmtShort((c.signedAt ?? c.requestedAt).slice(0, 10))} · ${c.method === 'in_clinic' ? 'in clinic' : 'on phone'}${c.guardian ? ' · by guardian' : ''}`
                        : c.status === 'pending'
                          ? `Sent ${fmtShort(c.requestedAt.slice(0, 10))} · awaiting signature`
                          : c.status === 'declined'
                            ? 'Declined'
                            : 'Withdrawn'}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </Card>
              ))}
            </div>
          )}

          {tab === 'Bills' && (
            <div className="flex flex-col gap-3">
              <Button variant="soft" size="md" className="self-start" onClick={() => nav('/app/invoices/new', { state: { patientId: p.id } })}>
                <ReceiptIndianRupee size={16} /> New invoice
              </Button>
              {invoices.length === 0 && (
                <Card>
                  <Empty icon={<ReceiptIndianRupee size={20} />} title="No invoices yet" />
                </Card>
              )}
              {invoices.map((i) => (
                <Card key={i.id} className="flex items-center gap-3 p-4" onClick={() => nav(`/app/invoices/${i.id}`)}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">
                      {i.number} · {inr(i.total)}
                    </div>
                    <div className="truncate text-[13px] text-muted">
                      {fmtShort(i.date)} · {i.items.map((x) => x.description).join(', ')}
                    </div>
                  </div>
                  <Badge tone={i.status === 'paid' ? 'ok' : 'accent'}>{i.status === 'paid' ? 'Paid' : 'Unpaid'}</Badge>
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

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3">
      <div className={cx('font-display text-[20px] font-bold', warn ? 'text-warn' : 'text-ink')}>{value}</div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
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

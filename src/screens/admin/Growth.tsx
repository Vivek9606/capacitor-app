import { Activity, ArrowRight, ArrowUpRight, CalendarCheck, ClipboardList, Dumbbell, Globe, IndianRupee, Stethoscope, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fmtPhone } from '../../lib/logic'
import { ago, ConsumersTab, formName, type ConsumerRow, type Daily, type Journeys, PhysioJourneyTab, type PhysioRow, type Subject, WebsiteTab } from './Journeys'
import { BarList, CohortGrid, countBy, curPrev, delta, DeltaBadge, fmtDay, fmtInt, fmtPct, fmtRupees, Funnel, type FunnelStep, type Insight, Insights, Kpi, median, PageHeading, Panel, PanelHead, type Period, periodWords, Segmented, Sparkline, StateBar, Tile, TrendChart } from './kit'

/**
 * The growth pages of the admin dashboard: an overview a founder can read top to bottom, then one page each
 * for consumers, physios and the website. Everything is computed from GET /admin/journeys.
 */

export type GrowthPage = 'overview' | 'consumers' | 'physios' | 'website'
interface Ctx {
  j: Journeys
  period: Period
  q: string
  go: (p: GrowthPage) => void
  open: (s: Subject) => void
}

const DAY = 86_400_000
const daysBetween = (a?: string, b?: string) => (a && b ? (new Date(b).getTime() - new Date(a).getTime()) / DAY : undefined)
const medianDays = <T,>(rows: T[], from: (r: T) => string | undefined, to: (r: T) => string | undefined) => {
  // Session dates have no time of day (they count as midday), so a session on the day the plan was sent can come out slightly negative.
  const xs = rows
    .map((r) => daysBetween(from(r), to(r)))
    .filter((x): x is number => x !== undefined && x > -1)
    .map((x) => Math.max(x, 0))
  return { value: median(xs), n: xs.length }
}
const fmtDays = (d?: number) => (d === undefined ? '—' : d < 1 ? 'same day' : `${d < 10 ? d.toFixed(1) : Math.round(d)} days`)
const share = (n: number, of: number) => (of > 0 ? n / of : 0)

/** Period-over-period numbers shared by every page. */
function useNumbers(j: Journeys, period: Period) {
  return useMemo(() => {
    const N = Number(period)
    const days = j.daily.map((d) => d.day)
    const col = (k: keyof Omit<Daily, 'day'>) => j.daily.map((d) => d[k])
    const cp = (k: keyof Omit<Daily, 'day'>) => ({ ...curPrev(col(k), N), spark: col(k).slice(-Math.max(N, 28)) })
    const curStart = days[days.length - N] ?? ''
    const prevStart = days[days.length - 2 * N] ?? ''
    const distinct = (idx: 1 | 2, from: string, to?: string) => new Set(j.sessionDays.filter((s) => s[0] >= from && (!to || s[0] < to)).map((s) => s[idx])).size
    const sessions = cp('sessions')
    const skipped = cp('skipped')
    const perDay = new Map<string, number>()
    for (const s of j.sessionDays) perDay.set(s[0], (perDay.get(s[0]) ?? 0) + 1)
    return {
      N,
      days,
      col,
      curStart,
      prevStart,
      consumers: cp('consumers'),
      physios: cp('physios'),
      assessments: cp('assessments'),
      web: cp('web'),
      bookings: cp('bookings'),
      plans: cp('plans'),
      sessions,
      revenue: cp('revenue'),
      exercising: { cur: distinct(1, curStart), prev: distinct(1, prevStart, curStart), spark: days.slice(-Math.max(N, 28)).map((d) => perDay.get(d) ?? 0) },
      activePhysios: { cur: distinct(2, curStart), prev: distinct(2, prevStart, curStart) },
      adherence: { cur: share(sessions.cur, sessions.cur + skipped.cur), prev: share(sessions.prev, sessions.prev + skipped.prev) },
    }
  }, [j, period])
}

const inPeriod = (ts: string | undefined, startDay: string) => !!ts && ts.slice(0, 10) >= startDay

// ---------- overview ----------
export function OverviewPage({ j, period, go, open }: Ctx) {
  const n = useNumbers(j, period)
  const words = periodWords(period)
  const C = j.consumers
  const P = j.physios
  const hc = j.health.consumers
  const hp = j.health.physios

  const withPhysio = C.filter((c) => c.physioId).length
  const onPlan = C.filter((c) => c.plans > 0).length
  const everExercised = C.filter((c) => c.sessionsDone > 0).length
  const setUp = P.filter((p) => p.setupDone >= 4).length
  const withPatients = P.filter((p) => p.patients > 0).length

  const insights = useMemo(() => buildInsights(j, n, go), [j, n, go])
  const dC = delta(n.consumers.cur, n.consumers.prev)
  const dE = delta(n.exercising.cur, n.exercising.prev)

  const stuck = C.filter((c) => c.health !== 'active' && c.health !== 'discharged' && c.plans > 0).slice(0, 6)
  const waiting = P.filter((p) => p.patients === 0 && Date.now() - new Date(p.createdAt).getTime() > 3 * DAY).slice(0, 6)
  const leads = j.web.recent.filter((w) => w.phone && !w.patientId && !w.physioId).slice(0, 6)

  return (
    <>
      <PageHeading title="Growth overview">
        {fmtInt(n.consumers.cur)} new consumers and {fmtInt(n.physios.cur)} new physios in the {words}. Consumer sign-ups are {dC.tone === 'flat' ? 'flat' : `${(dC.value ?? 1) > 0 ? 'up' : 'down'} ${dC.text.replace(/^[+−]/, '')}`} on the {period} days
        before, and {fmtInt(n.exercising.cur)} consumers did their exercises ({dE.tone === 'flat' ? 'no change' : dE.text}).
      </PageHeading>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Key numbers">
        <Kpi label="New consumers" info="Consumer accounts created in the period: self sign-ups and people a physio added." icon={<UserPlus size={14} />} value={fmtInt(n.consumers.cur)} cur={n.consumers.cur} prev={n.consumers.prev} prevText={fmtInt(n.consumers.prev)} spark={n.consumers.spark} />
        <Kpi label="New physios" info="Physio accounts created in the period, from the app or the directory sign-up on the website." icon={<Stethoscope size={14} />} value={fmtInt(n.physios.cur)} cur={n.physios.cur} prev={n.physios.prev} prevText={fmtInt(n.physios.prev)} spark={n.physios.spark} />
        <Kpi label="Consumers exercising" info="Different consumers who logged at least one finished exercise session in the period. This is the core engagement number." icon={<Activity size={14} />} value={fmtInt(n.exercising.cur)} cur={n.exercising.cur} prev={n.exercising.prev} prevText={fmtInt(n.exercising.prev)} spark={n.exercising.spark} />
        <Kpi label="Sessions done" info="Finished exercise sessions logged in the period. Skipped sessions are not counted." icon={<Dumbbell size={14} />} value={fmtInt(n.sessions.cur)} cur={n.sessions.cur} prev={n.sessions.prev} prevText={fmtInt(n.sessions.prev)} spark={n.sessions.spark} />
        <Kpi label="Bookings" info="Visits booked or requested in the period, by physios or from public profiles." icon={<CalendarCheck size={14} />} value={fmtInt(n.bookings.cur)} cur={n.bookings.cur} prev={n.bookings.prev} prevText={fmtInt(n.bookings.prev)} spark={n.bookings.spark} />
        <Kpi label="Care plans sent" info="Care plans physios sent to consumers in the period." icon={<ClipboardList size={14} />} value={fmtInt(n.plans.cur)} cur={n.plans.cur} prev={n.plans.prev} prevText={fmtInt(n.plans.prev)} spark={n.plans.spark} />
        <Kpi label="Collected by physios" info="Invoices marked paid in the period. This is money physios collected from their patients through the app, not Betterhood revenue." icon={<IndianRupee size={14} />} value={fmtRupees(n.revenue.cur)} cur={n.revenue.cur} prev={n.revenue.prev} prevText={fmtRupees(n.revenue.prev)} spark={n.revenue.spark} />
        <Kpi label="Website submissions" info="Lead forms sent and assessments finished on betterhood.in in the period. Counting started when the dashboard went live." icon={<Globe size={14} />} value={fmtInt(n.web.cur)} cur={n.web.cur} prev={n.web.prev} prevText={fmtInt(n.web.prev)} spark={n.web.spark} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="The two journeys">
        <SideCard
          title="Consumers"
          sub="People looking for care, and patients physios added"
          total={C.length}
          newN={n.consumers}
          period={period}
          onView={() => go('consumers')}
          stats={[
            ['Have a physio', fmtPct(share(withPhysio, C.length)), `${fmtInt(withPhysio)} of ${fmtInt(C.length)}`],
            ['Got a care plan', fmtPct(share(onPlan, C.length)), `${fmtInt(onPlan)} consumers`],
            ['Ever exercised', fmtPct(share(everExercised, C.length)), `${fmtInt(everExercised)} consumers`],
          ]}
        />
        <SideCard
          title="Physios"
          sub="Physiotherapists running their practice on the app"
          total={P.length}
          newN={n.physios}
          period={period}
          onView={() => go('physios')}
          stats={[
            ['Profile set up', fmtPct(share(setUp, P.length)), `${fmtInt(setUp)} of ${fmtInt(P.length)}`],
            ['Have a patient', fmtPct(share(withPatients, P.length)), `${fmtInt(withPatients)} physios`],
            ['Patients exercising', fmtInt(n.activePhysios.cur), `physios, ${words}`],
          ]}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <TrendChart
            title="Activity over time"
            days={n.days}
            metrics={[
              { key: 'consumers', label: 'New consumers', values: n.col('consumers') },
              { key: 'physios', label: 'New physios', values: n.col('physios') },
              { key: 'sessions', label: 'Sessions', values: n.col('sessions') },
              { key: 'bookings', label: 'Bookings', values: n.col('bookings') },
              { key: 'web', label: 'Website', values: n.col('web') },
            ]}
          />
        </div>
        <Panel>
          <PanelHead title="Who is active right now" desc="Active: did something in the last 7 days. Slipping: 8 to 21 days. Inactive: longer." />
          <div className="flex flex-col gap-5 p-5">
            <div>
              <div className="mb-2 text-[13px] font-medium text-ink">Consumers</div>
              <StateBar parts={[{ label: 'Active', n: hc.active, tone: 'good' }, { label: 'Slipping', n: hc.slipping, tone: 'warn' }, { label: 'Inactive', n: hc.inactive, tone: 'bad' }, { label: 'Discharged', n: hc.discharged, tone: 'muted' }]} />
            </div>
            <div>
              <div className="mb-2 text-[13px] font-medium text-ink">Physios</div>
              <StateBar parts={[{ label: 'Active', n: hp.active, tone: 'good' }, { label: 'Slipping', n: hp.slipping, tone: 'warn' }, { label: 'Inactive', n: hp.inactive, tone: 'bad' }]} />
            </div>
          </div>
        </Panel>
      </section>

      <Insights title="Where to look first" desc="The clearest wins, risks and openings in the numbers right now" items={insights} />

      <section className="grid gap-4 lg:grid-cols-3" aria-label="People to follow up">
        <FollowUp title="On a plan but gone quiet" empty="Everyone on a plan has been active this week.">
          {stuck.map((c) => (
            <FollowRow key={c.id} name={c.name} sub={`Last active ${ago(c.lastActiveAt)} · ${c.physioName ?? 'no physio'}`} onClick={() => open({ type: 'patient', row: c })} />
          ))}
        </FollowUp>
        <FollowUp title="Physios with no patients yet" empty="Every physio who joined more than 3 days ago has a patient.">
          {waiting.map((p) => (
            <FollowRow key={p.id} name={p.name} sub={`Joined ${ago(p.createdAt)} · setup ${p.setupDone}/${p.setupTotal}`} onClick={() => open({ type: 'physio', row: p })} />
          ))}
        </FollowUp>
        <FollowUp title="Website leads without an account" empty="No open website leads with a phone number.">
          {leads.map((w) => (
            <FollowRow key={w.id} name={w.name || fmtPhone(w.phone!)} sub={`${formName(w)} · ${ago(w.createdAt)}`} onClick={() => open({ type: 'lead', row: w })} />
          ))}
        </FollowUp>
      </section>
    </>
  )
}

function SideCard({ title, sub, total, newN, period, onView, stats }: { title: string; sub: string; total: number; newN: { cur: number; prev: number; spark: number[] }; period: Period; onView: () => void; stats: [string, string, string][] }) {
  return (
    <Panel className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-brand" />
      <div className="flex items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-[13px] text-muted">{sub}</p>
        </div>
        <button onClick={onView} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-ink cursor-pointer hover:bg-track">
          View journey <ArrowRight size={14} />
        </button>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <div className="text-[12px] text-muted">Accounts</div>
          <div className="flex items-center gap-2">
            <span className="text-[32px] font-semibold leading-tight tracking-tight tabular-nums text-ink">{fmtInt(total)}</span>
            <span className="flex items-center gap-1.5 text-[12px] text-muted">
              <DeltaBadge d={delta(newN.cur, newN.prev)} /> +{fmtInt(newN.cur)} in {period}D
            </span>
          </div>
        </div>
        <Sparkline values={newN.spark} height={52} />
      </div>
      <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
        {stats.map(([label, value, note]) => (
          <div key={label} className="px-5 py-3">
            <div className="text-[12px] text-muted">{label}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{value}</div>
            <div className="text-[11px] text-muted">{note}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function FollowUp({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <Panel className="p-5">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {children.length === 0 ? <p className="mt-3 text-[13px] text-muted">{empty}</p> : <div className="mt-2 divide-y divide-line">{children}</div>}
    </Panel>
  )
}
function FollowRow({ name, sub, onClick }: { name: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-2 py-2.5 text-left cursor-pointer hover:text-brand">
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-ink">{name}</span>
        <span className="block truncate text-[12px] text-muted">{sub}</span>
      </span>
      <ArrowUpRight size={15} className="shrink-0 text-faint" />
    </button>
  )
}

/** Wins, risks and openings, worked out from the numbers. Only the ones that apply are shown, biggest first. */
function buildInsights(j: Journeys, n: ReturnType<typeof useNumbers>, go: (p: GrowthPage) => void): Insight[] {
  const out: (Insight & { weight: number })[] = []
  const C = j.consumers
  const P = j.physios
  const words = `last ${n.N} days`

  const dC = delta(n.consumers.cur, n.consumers.prev)
  if (dC.value !== undefined && Math.abs(dC.value) >= 0.1 && n.consumers.cur + n.consumers.prev >= 10)
    out.push({ weight: Math.abs(dC.value) * 2, tone: dC.value > 0 ? 'good' : 'bad', title: `Consumer sign-ups are ${dC.value > 0 ? 'up' : 'down'} ${dC.text.replace(/^[+−]/, '')}`, detail: `${fmtInt(n.consumers.cur)} new consumers in the ${words}, against ${fmtInt(n.consumers.prev)} in the ${n.N} days before.`, go: () => go('consumers'), goLabel: 'Consumer journey' })

  const dE = delta(n.exercising.cur, n.exercising.prev)
  if (dE.value !== undefined && Math.abs(dE.value) >= 0.1 && n.exercising.cur + n.exercising.prev >= 10)
    out.push({ weight: Math.abs(dE.value) * 2.5, tone: dE.value > 0 ? 'good' : 'bad', title: `${dE.value > 0 ? 'More' : 'Fewer'} consumers are exercising (${dE.text})`, detail: `${fmtInt(n.exercising.cur)} consumers logged a session in the ${words}, against ${fmtInt(n.exercising.prev)} before. This is the number that shows whether care plans are being followed.` })

  const unassigned = C.filter((c) => !c.physioId)
  if (unassigned.length >= 3) {
    const assessed = unassigned.filter((c) => c.assessments > 0).length
    out.push({ weight: 1.5 + share(unassigned.length, C.length) * 3, tone: 'bad', title: `${fmtInt(unassigned.length)} consumers have no physio yet`, detail: `That's ${fmtPct(share(unassigned.length, C.length))} of all consumers. ${fmtInt(assessed)} of them already took an assessment, so they told us what hurts and are waiting to be matched.`, go: () => go('consumers') })
  }

  const sent = C.filter((c) => c.plans > 0)
  const opened = sent.filter((c) => c.planOpenedAt)
  if (sent.length >= 10) {
    const r = share(opened.length, sent.length)
    if (r < 0.85) out.push({ weight: 1.2 + (0.85 - r) * 4, tone: 'bad', title: `${fmtPct(1 - r)} of consumers never opened their care plan`, detail: `${fmtInt(sent.length - opened.length)} of ${fmtInt(sent.length)} consumers who were sent a plan haven't opened it. A WhatsApp nudge the day after the plan is sent is the cheapest fix.`, go: () => go('consumers') })
    else out.push({ weight: 0.8, tone: 'good', title: `${fmtPct(r)} of care plans get opened`, detail: `${fmtInt(opened.length)} of ${fmtInt(sent.length)} consumers who were sent a plan opened it.` })
  }

  // Week-2 retention across cohorts old enough to have a second week.
  const old = j.cohorts.filter((c) => Date.now() - new Date(`${c.cohort}T00:00:00`).getTime() > 14 * DAY)
  const size = old.reduce((a, c) => a + c.size, 0)
  if (size >= 10) {
    const w1 = share(old.reduce((a, c) => a + c.weeks[0], 0), size)
    const w2 = share(old.reduce((a, c) => a + c.weeks[1], 0), size)
    const w4 = share(old.reduce((a, c) => a + c.weeks[3], 0), size)
    out.push({ weight: 1.4 + Math.max(0, 0.6 - w2) * 3, tone: w2 >= 0.6 ? 'good' : 'bad', title: `${fmtPct(w2)} of consumers on a plan are still exercising in week 2`, detail: `Of consumers who got a plan in the last 12 weeks, ${fmtPct(w1)} exercised in week 1, ${fmtPct(w2)} in week 2 and ${fmtPct(w4)} in week 4. The drop between weeks is where reminders and physio check-ins matter most.`, go: () => go('consumers'), goLabel: 'Retention by week' })
  }

  const settled = P.filter((p) => Date.now() - new Date(p.createdAt).getTime() > 14 * DAY)
  const idle = settled.filter((p) => p.patients === 0)
  if (settled.length >= 5 && idle.length > 0)
    out.push({ weight: 1 + share(idle.length, settled.length) * 3, tone: 'opportunity', title: `${fmtInt(idle.length)} physios joined over two weeks ago and have no patients`, detail: `That's ${fmtPct(share(idle.length, settled.length))} of physios who've had time to start. A call to help them add their first patient is the fastest way to grow active physios.`, go: () => go('physios') })

  const leads = j.web.recent.filter((w) => w.phone && !w.patientId && !w.physioId)
  if (leads.length >= 3) out.push({ weight: 1 + Math.min(leads.length / 40, 1.5), tone: 'opportunity', title: `${fmtInt(leads.length)} website leads left a phone number but have no account`, detail: `They filled in a form or finished an assessment on betterhood.in. Each one is a warm lead for a call or a WhatsApp message.`, go: () => go('website') })

  const noBilling = P.filter((p) => p.patients > 0 && !p.setup.billing)
  if (noBilling.length >= 3) out.push({ weight: 0.9, tone: 'opportunity', title: `${fmtInt(noBilling.length)} physios with patients haven't set up billing`, detail: `They treat patients in the app but can't raise invoices yet. Billing is what makes the app part of their daily practice.`, go: () => go('physios') })

  // The physio whose patients exercise the most in the period.
  const byPhysio = new Map<string, number>()
  for (const s of j.sessionDays) if (s[0] >= n.curStart) byPhysio.set(s[2], (byPhysio.get(s[2]) ?? 0) + 1)
  const top = [...byPhysio.entries()].sort((a, b) => b[1] - a[1])[0]
  const topP = top && P.find((p) => p.id === top[0])
  if (topP && top[1] >= 10 && n.sessions.cur > 0)
    out.push({ weight: 0.7, tone: 'good', title: `${topP.name}'s patients did ${fmtInt(top[1])} sessions`, detail: `That's ${fmtPct(share(top[1], n.sessions.cur))} of all sessions in the ${words}. Worth asking what they do differently, and sharing it with other physios.`, go: () => go('physios') })

  return out.sort((a, b) => b.weight - a.weight).slice(0, 6)
}

// ---------- consumers ----------
export function ConsumersPage({ j, period, q, open }: Ctx) {
  const n = useNumbers(j, period)
  const [scope, setScope] = useState<'all' | 'period'>('all')
  const rows = scope === 'all' ? j.consumers : j.consumers.filter((c) => inPeriod(c.createdAt, n.curStart))

  const has = (f: (c: ConsumerRow) => unknown) => rows.filter(f).length
  const steps: FunnelStep[] = [
    { label: 'Accounts', n: rows.length },
    { label: 'Took an assessment', n: has((c) => c.assessments > 0), hint: 'Saved to their account in the app. People a physio adds usually skip this.' },
    { label: 'Has a physio', n: has((c) => c.physioId) },
    { label: 'Booked a visit', n: has((c) => c.bookings > 0) },
    { label: 'Got a care plan', n: has((c) => c.plans > 0) },
    { label: 'Opened the plan', n: has((c) => c.planOpenedAt), follows: true },
    { label: 'Did a session', n: has((c) => c.sessionsDone > 0), follows: true },
    { label: 'Did 3+ sessions', n: has((c) => c.sessionsDone >= 3), follows: true, hint: 'A simple sign the habit has started' },
    { label: 'Discharged', n: has((c) => c.dischargedAt) },
  ]
  const planned = steps[4].n
  const exercised = steps[6].n

  const times: [string, ReturnType<typeof medianDays>][] = [
    ['Sign-up → first booking', medianDays(rows, (c) => c.createdAt, (c) => c.firstBookingAt)],
    ['Sign-up → care plan', medianDays(rows, (c) => c.createdAt, (c) => c.firstPlanAt)],
    ['Plan sent → plan opened', medianDays(rows, (c) => c.firstPlanAt, (c) => c.planOpenedAt)],
    ['Plan sent → first session', medianDays(rows, (c) => c.firstPlanAt, (c) => c.firstSessionAt)],
  ]
  const joined = (c: ConsumerRow) => (c.origin === 'physio' ? 'Added by a physio' : c.firstWebAt && c.firstWebAt <= c.createdAt ? 'Website, then app sign-up' : 'App sign-up')

  return (
    <>
      <PageHeading title="Consumer journey">
        {fmtInt(j.consumers.length)} consumers in all. {fmtPct(share(planned, rows.length))} of {scope === 'all' ? 'them' : `those who joined in the ${periodWords(period)}`} got a care plan and {fmtPct(share(exercised, Math.max(planned, 1)))} of those went on to
        exercise. Click any row in the table for that person's full timeline.
      </PageHeading>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="New consumers" info="Consumer accounts created in the period." icon={<UserPlus size={14} />} value={fmtInt(n.consumers.cur)} cur={n.consumers.cur} prev={n.consumers.prev} prevText={fmtInt(n.consumers.prev)} spark={n.consumers.spark} />
        <Kpi label="Assessments taken" info="Assessments saved to an account in the app in the period." icon={<ClipboardList size={14} />} value={fmtInt(n.assessments.cur)} cur={n.assessments.cur} prev={n.assessments.prev} prevText={fmtInt(n.assessments.prev)} spark={n.assessments.spark} />
        <Kpi label="Consumers exercising" info="Different consumers who logged at least one finished session in the period." icon={<Activity size={14} />} value={fmtInt(n.exercising.cur)} cur={n.exercising.cur} prev={n.exercising.prev} prevText={fmtInt(n.exercising.prev)} spark={n.exercising.spark} />
        <Kpi label="Adherence" info="Of the sessions consumers logged in the period, the share they did rather than skipped. Days with nothing logged are not counted." icon={<Dumbbell size={14} />} value={fmtPct(n.adherence.cur)} cur={n.adherence.cur} prev={n.adherence.prev} prevText={fmtPct(n.adherence.prev)} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHead
            title="How far consumers get"
            desc="Each bar counts everyone who has done that step. The percentage is of all accounts; “of previous” appears where a step can only follow the one above."
            right={<Segmented label="Who to count" value={scope} onChange={setScope} options={[{ value: 'all', label: 'Everyone' }, { value: 'period', label: `Joined in ${period}D` }]} />}
          />
          <div className="p-5">
            <Funnel steps={steps} />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="How long each step takes" desc="Median time, for consumers who reached both points" />
          <ul className="divide-y divide-line px-5 pb-3 pt-2">
            {times.map(([label, t]) => (
              <li key={label} className="flex items-baseline justify-between gap-3 py-3 text-[14px]">
                <span className="text-ink">{label}</span>
                <span className="shrink-0 text-right">
                  <b className="tabular-nums text-ink">{fmtDays(t.value)}</b>
                  <span className="block text-[11px] text-muted">{fmtInt(t.n)} consumers</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <Panel>
        <PanelHead title="Do consumers keep exercising?" desc="Each row is the consumers who got their first care plan that week. The cells show what share of them did at least one session in each week after their plan was sent. Darker is better." />
        <div className="p-5 pt-4">
          <CohortGrid cohorts={j.cohorts} />
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHead title="How they joined" desc={scope === 'all' ? 'All consumers' : `Joined in the ${periodWords(period)}`} />
          <div className="p-5 pt-3">
            <BarList rows={countBy(rows, joined)} />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Where they are" desc="City on the account, top 8" />
          <div className="p-5 pt-3">
            <BarList rows={countBy(rows, (c) => c.city?.trim())} total={rows.length} empty="No cities recorded yet." />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="What hurts" desc={`Pain assessments in the app, ${periodWords(period)}`} />
          <div className="p-5 pt-3">
            <BarList rows={countBy(j.assessmentEvents.filter((a) => a.kind === 'pain' && a.day >= n.curStart), (a) => a.area)} empty="No pain assessments in this period." />
          </div>
        </Panel>
      </section>

      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Every consumer</h2>
        <ConsumersTab j={j} q={q} open={open} />
      </div>
    </>
  )
}

// ---------- physios ----------
export function PhysiosPage({ j, period, q, open }: Ctx) {
  const n = useNumbers(j, period)
  const [scope, setScope] = useState<'all' | 'period'>('all')
  const rows = scope === 'all' ? j.physios : j.physios.filter((p) => inPeriod(p.createdAt, n.curStart))
  const has = (f: (p: PhysioRow) => unknown) => rows.filter(f).length
  const steps: FunnelStep[] = [
    { label: 'Accounts', n: rows.length },
    { label: 'Profile set up', n: has((p) => p.setupDone >= 4), hint: 'At least 4 of 6: photo, qualification, focus areas, place, availability, billing' },
    { label: 'Listed on betterhood.in', n: has((p) => p.listing?.status === 'live') },
    { label: 'Added a patient', n: has((p) => p.patients > 0) },
    { label: 'Sent a care plan', n: has((p) => p.plans > 0), follows: true },
    { label: 'Has patients exercising', n: has((p) => p.activePatients > 0), follows: true, hint: 'At least one patient did a session in the last 14 days' },
    { label: 'Raised an invoice', n: has((p) => p.invoices > 0) },
    { label: 'Referred a physio', n: has((p) => p.referrals > 0) },
  ]
  const SETUP: [string, string][] = [['photo', 'Photo'], ['qualification', 'Qualification'], ['focusAreas', 'Focus areas'], ['place', 'Clinic or service area'], ['availability', 'Availability'], ['billing', 'Billing details']]
  const missing = SETUP.map(([k, label]) => [label, rows.filter((p) => !p.setup[k]).length] as [string, number]).filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1])

  const perPhysio = new Map<string, { sessions: number; people: Set<string> }>()
  for (const s of j.sessionDays) {
    if (s[0] < n.curStart) continue
    const e = perPhysio.get(s[2]) ?? { sessions: 0, people: new Set<string>() }
    e.sessions++
    e.people.add(s[1])
    perPhysio.set(s[2], e)
  }
  const board = j.physios
    .map((p) => ({ p, sessions: perPhysio.get(p.id)?.sessions ?? 0, people: perPhysio.get(p.id)?.people.size ?? 0 }))
    .filter((x) => x.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8)
  const t1 = medianDays(rows, (p) => p.createdAt, (p) => p.firstPatientAt)
  const t2 = medianDays(rows, (p) => p.createdAt, (p) => p.firstPlanAt)
  const withPatients = steps[3].n

  return (
    <>
      <PageHeading title="Physio journey">
        {fmtInt(j.physios.length)} physios in all. {fmtPct(share(withPatients, rows.length))} of {scope === 'all' ? 'them' : `those who joined in the ${periodWords(period)}`} have added a patient, and {fmtInt(n.activePhysios.cur)} had patients exercising in the{' '}
        {periodWords(period)}. A physio typically adds their first patient {fmtDays(t1.value)} after signing up.
      </PageHeading>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="New physios" info="Physio accounts created in the period." icon={<Stethoscope size={14} />} value={fmtInt(n.physios.cur)} cur={n.physios.cur} prev={n.physios.prev} prevText={fmtInt(n.physios.prev)} spark={n.physios.spark} />
        <Kpi label="Physios with patients exercising" info="Different physios with at least one patient who logged a finished session in the period." icon={<Users size={14} />} value={fmtInt(n.activePhysios.cur)} cur={n.activePhysios.cur} prev={n.activePhysios.prev} prevText={fmtInt(n.activePhysios.prev)} />
        <Kpi label="Care plans sent" info="Care plans physios sent in the period." icon={<ClipboardList size={14} />} value={fmtInt(n.plans.cur)} cur={n.plans.cur} prev={n.plans.prev} prevText={fmtInt(n.plans.prev)} spark={n.plans.spark} />
        <Kpi label="Collected by physios" info="Invoices marked paid in the period. Money physios collected from patients, not Betterhood revenue." icon={<IndianRupee size={14} />} value={fmtRupees(n.revenue.cur)} cur={n.revenue.cur} prev={n.revenue.prev} prevText={fmtRupees(n.revenue.prev)} spark={n.revenue.spark} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHead
            title="How far physios get"
            desc="Each bar counts every physio who has done that step. The percentage is of all accounts."
            right={<Segmented label="Who to count" value={scope} onChange={setScope} options={[{ value: 'all', label: 'Everyone' }, { value: 'period', label: `Joined in ${period}D` }]} />}
          />
          <div className="p-5">
            <Funnel steps={steps} />
          </div>
        </Panel>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Sign-up → first patient" value={fmtDays(t1.value)} note={`median, ${fmtInt(t1.n)} physios`} />
            <Tile label="Sign-up → first plan" value={fmtDays(t2.value)} note={`median, ${fmtInt(t2.n)} physios`} />
          </div>
          <Panel className="flex-1">
            <PanelHead title="What's missing from profiles" desc="Physios who haven't added each item" />
            <div className="p-5 pt-3">
              <BarList rows={missing} total={rows.length} empty="Every profile is complete." />
            </div>
          </Panel>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHead title="Physios whose patients exercise the most" desc={`Finished sessions logged by their patients in the ${periodWords(period)}`} />
          <div className="overflow-x-auto p-5 pt-3">
            {board.length === 0 ? (
              <p className="py-4 text-[13px] text-muted">No sessions logged in this period.</p>
            ) : (
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead className="text-[12px] text-muted">
                  <tr>
                    <th className="py-2 font-medium">Physio</th>
                    <th className="py-2 text-right font-medium">Sessions</th>
                    <th className="py-2 text-right font-medium">Patients exercising</th>
                    <th className="py-2 text-right font-medium">All patients</th>
                    <th className="py-2 text-right font-medium">Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {board.map(({ p, sessions, people }) => (
                    <tr key={p.id} onClick={() => open({ type: 'physio', row: p })} className="cursor-pointer hover:bg-track/60">
                      <td className="py-2.5">
                        <div className="font-medium text-ink">{p.name}</div>
                        <div className="text-[12px] text-muted">{p.place ?? 'No place set'}</div>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-ink">{fmtInt(sessions)}</td>
                      <td className="py-2.5 text-right tabular-nums text-ink">{people}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted">{p.patients}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted">{p.paidTotal ? fmtRupees(p.paidTotal) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHead title="What they specialise in" desc="Focus areas on physio profiles" />
          <div className="p-5 pt-3">
            <BarList rows={countBy(rows.flatMap((p) => p.focusAreas), (x) => x)} total={rows.length} empty="No focus areas added yet." />
          </div>
        </Panel>
      </section>

      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Every physio</h2>
        <PhysioJourneyTab j={j} q={q} open={open} />
      </div>
    </>
  )
}

// ---------- website ----------
export function WebsitePage({ j, period, q, open }: Ctx) {
  const n = useNumbers(j, period)
  const recent = j.web.recent.filter((w) => w.createdAt.slice(0, 10) >= n.curStart)
  const withPhone = recent.filter((w) => w.phone)
  const converted = withPhone.filter((w) => w.patientId || w.physioId)
  const byId = new Map(j.consumers.map((c) => [c.id, c]))
  const people = [...new Map(withPhone.map((w) => [w.phone, w])).values()]
  const accounts = people.filter((w) => w.patientId)
  const steps: FunnelStep[] = [
    { label: 'Left a phone number', n: people.length, hint: 'Different phone numbers from forms and assessments in the period' },
    { label: 'Has a consumer account', n: accounts.length, follows: true },
    { label: 'Has a physio', n: accounts.filter((w) => byId.get(w.patientId!)?.physioId).length, follows: true },
    { label: 'Got a care plan', n: accounts.filter((w) => (byId.get(w.patientId!)?.plans ?? 0) > 0).length, follows: true },
    { label: 'Did a session', n: accounts.filter((w) => (byId.get(w.patientId!)?.sessionsDone ?? 0) > 0).length, follows: true },
  ]
  return (
    <>
      <PageHeading title="Website">
        {fmtInt(n.web.cur)} submissions on betterhood.in in the {periodWords(period)}: {fmtInt(recent.filter((w) => w.kind === 'assessment').length)} assessments and {fmtInt(recent.filter((w) => w.kind === 'form').length)} lead forms.{' '}
        {fmtPct(share(withPhone.length, recent.length))} left a phone number, and {fmtPct(share(converted.length, Math.max(withPhone.length, 1)))} of those have an app account.
      </PageHeading>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Tile label="Submissions" value={fmtInt(n.web.cur)} note={`${delta(n.web.cur, n.web.prev).text} on the ${period} days before (${fmtInt(n.web.prev)})`} />
        <Tile label="Left a phone number" value={fmtInt(withPhone.length)} note={`${fmtPct(share(withPhone.length, recent.length))} of submissions`} />
        <Tile label="Have an app account" value={fmtInt(converted.length)} note={`${fmtPct(share(converted.length, Math.max(withPhone.length, 1)))} of those with a phone`} tone="good" />
        <Tile label="Leads to follow up" value={fmtInt(withPhone.length - converted.length)} note="phone number, no account yet" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHead title="From the website into care" desc={`People who left a phone number in the ${periodWords(period)}, and how far they have got in the app since`} />
          <div className="p-5">
            <Funnel steps={steps} />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="What they filled in" desc="Forms and assessments, most used first" />
          <div className="p-5 pt-3">
            <BarList rows={countBy(recent, (w) => formName(w))} total={recent.length} empty="Nothing in this period." />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHead title="Pages that bring submissions" desc="The page each submission was sent from" />
          <div className="p-5 pt-3">
            <BarList rows={countBy(recent, (w) => w.page)} total={recent.length} empty="Nothing in this period." />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="What website visitors are assessed with" desc="Result of pain assessments taken on the website" />
          <div className="p-5 pt-3">
            <BarList rows={countBy(recent.filter((w) => w.kind === 'assessment'), (w) => (w.data.condition ? String(w.data.condition) : undefined))} empty="No assessment results in this period." />
          </div>
        </Panel>
      </section>

      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Every submission</h2>
        <WebsiteTab j={j} q={q} open={open} />
      </div>
      <p className="text-[12px] text-muted">Data up to {fmtDay(j.generatedAt)}. The table and the breakdowns cover the latest 1,000 submissions.</p>
    </>
  )
}

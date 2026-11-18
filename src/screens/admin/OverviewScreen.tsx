import { ClipboardList, Dumbbell, IndianRupee, Stethoscope, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarList, countBy, fmtInt, fmtPct, fmtRupees, Funnel, Kpi, PageHeading, Panel, PanelHead, Segmented, Tile, TrendChart } from './kit'
import { type Dashboard, VIDEO_INFO, videoState, videoStats, daily, dayLabels, PERIOD_LABEL, type Period, type Person, SOURCE_INFO, SOURCE_LABEL, STEP_KEYS, STEPS, sum, TODO, todo, windows, within } from './model'
import { Pill } from './parts'
import { ago } from './kit'

export type Screen = 'overview' | 'people' | 'physios' | 'todo' | 'chats'

/** For leadership: is it growing, where do people drop off, what's the money doing, what needs attention. */
export function OverviewScreen({ d, all, showTest, period, go, openPerson }: { d: Dashboard; all: Dashboard; showTest: boolean; period: Period; go: (s: Screen) => void; openPerson: (p: Person) => void }) {
  const [scope, setScope] = useState<'period' | 'all'>('period')
  const w = windows(period)
  const days = Number(period)
  const n = useMemo(() => numbers(d, period), [d, period])
  const cohort = scope === 'period' ? d.people.filter((p) => within(p.steps.details, w.cur)) : d.people
  const t = todo(d.people, d.physios)
  const attention = [
    { key: 'waiting', n: t.waiting.length },
    { key: 'redFlag', n: t.redFlag.length },
    { key: 'leads', n: t.leads.length },
    { key: 'quiet', n: t.quiet.length },
    { key: 'verify', n: t.verify.length },
  ] as const
  const verified = d.physios.filter((x) => x.verification === 'verified').length
  const video = videoStats(d.events.bookings.filter((b) => within(b.at, w.cur)))

  const spark = (items: { at: string; v?: number }[]) => daily(items, days)
  const newPeople = d.people.filter((p) => p.steps.details).map((p) => ({ at: p.steps.details! }))
  const matched = d.people.filter((p) => p.steps.matched).map((p) => ({ at: p.steps.matched! }))
  const pay = d.events.payments.map((x) => ({ at: x.at, v: x.amount }))

  return (
    <>
      <PageHeading title="Overview">
        In the {PERIOD_LABEL[period]}, <b className="text-ink">{fmtInt(n.newPeople.cur)}</b> new {n.newPeople.cur === 1 ? 'person' : 'people'} gave their details,{' '}
        <b className="text-ink">{fmtInt(n.assessments.cur)}</b> assessment{n.assessments.cur === 1 ? ' was' : 's were'} taken, <b className="text-ink">{fmtInt(n.matched.cur)}</b> {n.matched.cur === 1 ? 'person was' : 'people were'} matched with a
        physio and patients did <b className="text-ink">{fmtInt(n.sessions.cur)}</b> exercise session{n.sessions.cur === 1 ? '' : 's'}.
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="New people" info="People who gave their details for the first time: a website form or assessment with a phone number, or a new account. One per phone number." icon={<UserPlus size={15} />} value={fmtInt(n.newPeople.cur)} cur={n.newPeople.cur} prev={n.newPeople.prev} prevText={`${fmtInt(n.newPeople.prev)} before`} spark={spark(newPeople)} />
        <Kpi label="Assessments taken" info="Every finished assessment, on the website or in the app. One person can take several." icon={<ClipboardList size={15} />} value={fmtInt(n.assessments.cur)} cur={n.assessments.cur} prev={n.assessments.prev} prevText={`${fmtInt(n.assessments.prev)} before`} spark={spark(d.events.assessments)} />
        <Kpi label="Matched with a physio" info={STEPS.matched.info} icon={<Stethoscope size={15} />} value={fmtInt(n.matched.cur)} cur={n.matched.cur} prev={n.matched.prev} prevText={`${fmtInt(n.matched.prev)} before`} spark={spark(matched)} />
        <Kpi label="Exercise sessions" info="Exercise sessions patients logged from their care plans (one per person per day)." icon={<Dumbbell size={15} />} value={fmtInt(n.sessions.cur)} cur={n.sessions.cur} prev={n.sessions.prev} prevText={`${fmtInt(n.sessions.prev)} before`} spark={spark(d.events.sessions)} />
        <Kpi label="Revenue collected" info="Invoices marked paid in the period, across all physios." icon={<IndianRupee size={15} />} value={fmtRupees(n.revenue.cur)} cur={n.revenue.cur} prev={n.revenue.prev} prevText={`${fmtRupees(n.revenue.prev)} before`} spark={spark(pay)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel>
          <PanelHead
            title="How far people get"
            desc={scope === 'period' ? `The ${fmtInt(cohort.length)} people who first gave their details in the ${PERIOD_LABEL[period]}, and how far each has got so far.` : `Everyone so far (${fmtInt(cohort.length)} people) and how far each has got.`}
            right={<Segmented label="Who" value={scope} onChange={setScope} options={[{ value: 'period', label: 'New in period' }, { value: 'all', label: 'Everyone' }]} />}
          />
          <div className="px-5 pb-5 pt-4">
            {cohort.length ? (
              <Funnel steps={STEP_KEYS.map((k, i) => ({ label: STEPS[k].label, n: cohort.filter((p) => p.steps[k]).length, hint: STEPS[k].info, follows: i >= 3 }))} />
            ) : (
              <p className="py-6 text-[14px] text-muted">Nobody new in the {PERIOD_LABEL[period]}.</p>
            )}
            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Each bar counts the people who have reached that step, whenever they got there. Some skip steps (a physio can add a patient who never took an assessment), so the first three bars aren’t strictly in order. “Of previous” is shown from matching onwards, where each step
              needs the one before.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHead title="Needs attention" desc="People and physios someone should act on today." right={<button onClick={() => go('todo')} className="text-[14px] font-semibold text-brand cursor-pointer hover:underline">Open to-do →</button>} />
          <ul className="px-5 pb-4 pt-2">
            {attention.map((a) => (
              <li key={a.key} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-ink">{TODO[a.key].label}</div>
                  <div className="text-[12px] text-muted">{TODO[a.key].info}</div>
                </div>
                <Pill tone={a.n === 0 ? 'ok' : a.key === 'redFlag' ? 'bad' : 'warn'}>{a.n === 0 ? 'None' : fmtInt(a.n)}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <TrendChart
        title="Over time"
        days={dayLabels(180)}
        metrics={[
          { key: 'people', label: 'New people', values: daily(newPeople, 180) },
          { key: 'assessments', label: 'Assessments', values: daily(d.events.assessments, 180) },
          { key: 'accounts', label: 'New accounts', values: daily(d.people.filter((p) => p.steps.account).map((p) => ({ at: p.steps.account! })), 180) },
          { key: 'sessions', label: 'Exercise sessions', values: daily(d.events.sessions, 180) },
          { key: 'revenue', label: 'Revenue', values: daily(pay, 180), fmt: fmtRupees },
        ]}
      />

      <VideoPanel d={d} all={all} showTest={showTest} period={period} openPerson={openPerson} />

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel>
          <PanelHead title="Where new people came from" desc={`New people in the ${PERIOD_LABEL[period]}, by first contact.`} right={<span title={SOURCE_INFO} className="text-[12px] text-faint">What’s this?</span>} />
          <div className="px-3 pb-4 pt-3">
            <BarList rows={countBy(n.newList, (p) => SOURCE_LABEL[p.source])} empty="Nobody new in this period." />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="What hurts" desc={`Assessments in the ${PERIOD_LABEL[period]}, by body area.`} />
          <div className="px-3 pb-4 pt-3">
            <BarList rows={countBy(d.events.assessments.filter((e) => within(e.at, w.cur)), (e) => (e.kind === 'longevity' || e.area === 'overall' ? 'Longevity' : AREA[e.area] ?? e.area))} empty="No assessments in this period." />
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Where they are" desc={`New people in the ${PERIOD_LABEL[period]}, by city (top 6).`} />
          <div className="px-3 pb-4 pt-3">
            <BarList rows={countBy(n.newList, (p) => p.city?.trim() || 'City not given', 6)} empty="Nobody new in this period." />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Video consults" info={VIDEO_INFO} value={fmtInt(video.booked)} note={video.booked ? `Booked in the ${PERIOD_LABEL[period]} · ${fmtInt(video.held)} held${video.oneSide ? ` · ${fmtInt(video.oneSide)} one side only` : ''}` : `None booked in the ${PERIOD_LABEL[period]}`} />
        <Tile label="Physios" value={fmtInt(d.physios.length)} note={`${fmtInt(verified)} verified`} />
        <Tile label="Treating someone now" value={fmtInt(d.physios.filter((x) => x.activePatients > 0).length)} note="A patient exercised in the last 14 days" />
        <Tile label="Listed on betterhood.in" value={fmtInt(d.physios.filter((x) => x.listing?.status === 'live').length)} note="Public directory profile is live" />
        <Tile label="Website visitors who signed up" value={n.accountRate === null ? "-" : fmtPct(n.accountRate)} note="Share of people who came through the website and then created an account" />
      </div>
    </>
  )
}

const AREA: Record<string, string> = { back: 'Back', neck: 'Neck', shoulder: 'Shoulder', knee: 'Knee', unknown: 'Not recorded' }

function numbers(d: Dashboard, period: Period) {
  const w = windows(period)
  const cp = (items: { at: string | null; v?: number }[]) => ({
    cur: sum(items.filter((x) => within(x.at, w.cur)).map((x) => x.v ?? 1)),
    prev: sum(items.filter((x) => within(x.at, w.prev)).map((x) => x.v ?? 1)),
  })
  const newList: Person[] = d.people.filter((p) => within(p.steps.details, w.cur))
  const web = d.people.filter((p) => p.source === 'website')
  return {
    newList,
    newPeople: cp(d.people.map((p) => ({ at: p.steps.details }))),
    assessments: cp(d.events.assessments),
    matched: cp(d.people.map((p) => ({ at: p.steps.matched }))),
    sessions: cp(d.events.sessions),
    revenue: cp(d.events.payments.map((x) => ({ at: x.at, v: x.amount }))),
    accountRate: web.length ? web.filter((p) => p.steps.account).length / web.length : null,
  }
}

/** Every video consult in the period, newest first, with who joined. Test accounts' calls are counted separately so they're never silently missing. */
function VideoPanel({ d, all, showTest, period, openPerson }: { d: Dashboard; all: Dashboard; showTest: boolean; period: Period; openPerson: (p: Person) => void }) {
  const w = windows(period)
  const inPeriod = (x: Dashboard) => videoStats(x.events.bookings.filter((b) => within(b.at, w.cur)))
  const v = inPeriod(d)
  const hidden = showTest ? 0 : inPeriod(all).booked - v.booked
  const people = new Map(all.people.map((p) => [p.key, p]))
  const physios = new Map(all.physios.map((x) => [x.id, x.name]))
  const rows = [...v.list].sort((a, b) => b.when.localeCompare(a.when)).slice(0, 10)
  const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  return (
    <Panel>
      <PanelHead
        title="Video consults"
        desc={`${fmtInt(v.booked)} booked in the ${PERIOD_LABEL[period]}: ${fmtInt(v.held)} held (both joined)${v.oneSide ? `, ${fmtInt(v.oneSide)} where only one side joined` : ''}.`}
      />
      <div className="px-5 pb-4 pt-1">
        {rows.length === 0 ? (
          <p className="py-3 text-[14px] text-muted">No video consults in the {PERIOD_LABEL[period]}.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((b, i) => {
              const p = b.who ? people.get(b.who) : undefined
              const state = videoState(b)
              return (
                <li key={i}>
                  <button disabled={!p} onClick={() => p && openPerson(p)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left text-[14px] cursor-pointer disabled:cursor-default sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                    <span className="text-muted">{when(b.when)}</span>
                    <span className="min-w-0 truncate">
                      <b className="font-medium text-ink">{p?.name ?? 'Patient'}</b> with {physios.get(b.physioId) ?? 'their physio'}
                      <span className="text-[12px] text-faint"> · booked {ago(b.at)}</span>
                    </span>
                    <Pill tone={state.startsWith('Held') ? 'ok' : state.startsWith('Nobody') ? 'muted' : 'warn'}>{state}</Pill>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {hidden > 0 && (
          <p className="mt-2 rounded-md bg-track/60 px-3 py-2 text-[12px] text-muted">
            {fmtInt(hidden)} more {hidden === 1 ? 'is' : 'are'} between test numbers and hidden. Tick “Show test accounts” at the top to see {hidden === 1 ? 'it' : 'them'}.
          </p>
        )}
      </div>
    </Panel>
  )
}

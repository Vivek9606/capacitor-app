import { Check, MessageCircle } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button, cx } from '../../components/ui'
import { physioPlace, wantedFocus } from '../../lib/match'
import type { Assessment, Patient, Physio } from '../../lib/types'
import { ago, day, fmtInt, InfoTip, PageHeading, Panel } from './kit'
import { type Dashboard, fmtPhone, type Person, type PhysioRow, TODO, todo, waLink } from './model'
import { PersonCell, Pill, RedFlag } from './parts'

export type AdminPhysio = Physio & { patients: number }
export interface OpsData {
  physios: AdminPhysio[]
  patients: Patient[]
  assessments: Assessment[]
}

/** What someone on the team should do today. Each list says why someone is on it. */
export function TodoScreen({ d, ops, openPerson, openPhysio, assign, verify }: { d: Dashboard; ops?: OpsData; openPerson: (p: Person) => void; openPhysio: (x: PhysioRow) => void; assign: (p: Patient, physioId: string) => void; verify: (id: string, status: 'verified' | 'none') => void }) {
  const t = todo(d.people, d.physios)
  const total = t.waiting.length + t.redFlag.length + t.leads.length + t.quiet.length + t.verify.length
  const byId = new Map((ops?.physios ?? []).map((x) => [x.id, x]))
  const latest = (pid?: string) => ops?.assessments.filter((a) => a.patientId === pid).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  return (
    <>
      <PageHeading title="To-do">{total === 0 ? 'Nothing waiting. New items show up here as they happen.' : `${fmtInt(total)} things waiting for someone on the team, most urgent first.`}</PageHeading>

      <Group title={TODO.redFlag.label} info={TODO.redFlag.info} n={t.redFlag.length} tone="bad" empty="Nobody with a critical advisory is waiting.">
        {t.redFlag.map((p) => (
          <Row key={p.key} onOpen={() => openPerson(p)} left={<PersonCell p={p} />} mid={<span className="flex flex-wrap items-center gap-1.5">{p.latest!.title}: {p.latest!.result} <RedFlag reasons={p.latest!.reasons} /></span>} right={<Wa phone={p.phone} />} note={`Took it ${ago(p.latest!.at)}`} />
        ))}
      </Group>

      <Group title={TODO.waiting.label} info={TODO.waiting.info} n={t.waiting.length} tone="warn" empty="Everyone with an account has a physio.">
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {t.waiting.map((p) => {
            const pt = ops?.patients.find((x) => x.id === p.patientId)
            return pt && ops ? (
              <AssignCard key={p.key} p={pt} person={p} a={latest(pt.id)} physios={ops.physios} byId={byId} onAssign={(id) => assign(pt, id)} onOpen={() => openPerson(p)} />
            ) : null
          })}
        </div>
      </Group>

      <Group title={TODO.verify.label} info={TODO.verify.info} n={t.verify.length} tone="warn" empty="No verification requests.">
        {t.verify.map((x) => {
          const full = byId.get(x.id)
          return (
            <Row
              key={x.id}
              onOpen={() => openPhysio(x)}
              left={
                <div>
                  <div className="font-semibold">{x.name}</div>
                  <div className="text-[12px] text-muted">{fmtPhone(x.phone)}</div>
                </div>
              }
              mid={
                <div className="text-[14px]">
                  Council reg. no. <b>{full?.councilRegNo || 'not added'}</b>
                  <div className="text-[12px] text-muted">{[full?.qualification, full?.experienceYrs ? `${full.experienceYrs} yrs` : undefined].filter(Boolean).join(' · ') || 'No qualification added'}</div>
                </div>
              }
              right={
                <span className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" onClick={() => verify(x.id, 'verified')}>
                    <Check size={14} /> Verify
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => verify(x.id, 'none')}>
                    Reject
                  </Button>
                </span>
              }
            />
          )
        })}
      </Group>

      <Group title={TODO.leads.label} info={TODO.leads.info} n={t.leads.length} empty="No website leads in the last 30 days.">
        {t.leads
          .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
          .map((p) => (
            <Row key={p.key} onOpen={() => openPerson(p)} left={<PersonCell p={p} />} mid={p.latest ? `${p.latest.title}${p.latest.result ? `: ${p.latest.result}` : ''}` : 'Sent a form'} note={`${p.counts.websiteSubmissions} submission${p.counts.websiteSubmissions === 1 ? '' : 's'}, last ${day(p.lastActiveAt)}`} right={<Wa phone={p.phone} />} />
          ))}
      </Group>

      <Group title={TODO.quiet.label} info={TODO.quiet.info} n={t.quiet.length} empty="Everyone on a plan exercised this week.">
        {t.quiet.map((p) => (
          <Row key={p.key} onOpen={() => openPerson(p)} left={<PersonCell p={p} />} mid={p.physioName ? `Physio: ${p.physioName}` : ''} note={p.lastSessionAt ? `Last session ${ago(p.lastSessionAt)}` : `Plan sent ${ago(p.steps.plan)}, no session yet`} right={<Wa phone={p.phone} />} />
        ))}
      </Group>
    </>
  )
}

function Group({ title, info, n, tone = 'warn', empty, children }: { title: string; info: string; n: number; tone?: 'bad' | 'warn'; empty: string; children: ReactNode }) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="flex items-center gap-1.5 text-[16px] font-semibold">
          {title} <InfoTip text={info} />
        </h2>
        <Pill tone={n === 0 ? 'ok' : tone}>{n === 0 ? 'None' : fmtInt(n)}</Pill>
      </div>
      {n === 0 ? <p className="px-5 py-4 text-[14px] text-muted">{empty}</p> : <div className="divide-y divide-line">{children}</div>}
    </Panel>
  )
}

function Row({ left, mid, note, right, onOpen }: { left: ReactNode; mid?: ReactNode; note?: string; right?: ReactNode; onOpen: () => void }) {
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className="grid cursor-pointer items-center gap-3 px-5 py-3 hover:bg-track/50 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto]">
      {left}
      <div className="min-w-0 text-[14px]">
        {mid}
        {note && <div className="text-[12px] text-muted">{note}</div>}
      </div>
      <div className="justify-self-start md:justify-self-end">{right}</div>
    </div>
  )
}

function Wa({ phone }: { phone: string }) {
  return (
    <a href={waLink(phone)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[14px] hover:bg-track/60">
      <MessageCircle size={14} /> WhatsApp
    </a>
  )
}

function AssignCard({ p, person, a, physios, byId, onAssign, onOpen }: { p: Patient; person: Person; a?: Assessment; physios: AdminPhysio[]; byId: Map<string, AdminPhysio>; onAssign: (physioId: string) => void; onOpen: () => void }) {
  // Same ranking as the automatic suggestion (lib/match.ts): city first, then focus area, then fewest patients.
  const want = wantedFocus(a?.cat)
  const score = (x: AdminPhysio) => {
    const c = p.city?.toLowerCase()
    return (c && physioPlace(x).toLowerCase().includes(c) ? 3 : 0) + (x.focusAreas.includes(want[0]) ? 2 : x.focusAreas.includes(want[1]) ? 1 : 0)
  }
  const ranked = [...physios].sort((x, y) => score(y) - score(x) || x.patients - y.patients)
  const suggested = p.match?.suggestedPhysioId ?? (ranked[0] && score(ranked[0]) > 0 ? ranked[0].id : undefined)
  const [pick, setPick] = useState(suggested ?? '')
  const chosen = byId.get(pick)
  return (
    <div className="rounded-lg border border-line p-4">
      <button onClick={onOpen} className="block w-full text-left cursor-pointer">
        <PersonCell p={person} />
      </button>
      <div className="mt-3 rounded-md bg-track/60 px-3 py-2.5 text-[14px]">
        {a ? (
          <>
            {a.title}
            {a.condition && <>: <b>{a.condition}</b></>}
            {(a.advisory || a.advisoryReasons?.length) && <div className="mt-1 text-[12px] font-semibold text-danger">Critical advisory: needs a medical check first</div>}
            <div className="mt-0.5 text-[12px] text-muted">
              Looking for {want.join(' or ')}
              {p.city ? ` near ${p.city}` : ''}
            </div>
          </>
        ) : (
          <span className="text-muted">Hasn’t taken an assessment yet.</span>
        )}
      </div>
      <label className="mt-3 block text-[12px] font-medium text-muted" htmlFor={`pick-${p.id}`}>
        Physio
      </label>
      <select id={`pick-${p.id}`} value={pick} onChange={(e) => setPick(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-2 text-[14px] outline-none focus:border-brand">
        <option value="">Choose a physio…</option>
        {ranked.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}, {x.focusAreas.join(', ') || 'no focus set'} · {x.patients} patient{x.patients === 1 ? '' : 's'}{x.id === suggested ? '  ★ suggested' : ''}
          </option>
        ))}
      </select>
      {chosen && <div className="mt-1 truncate text-[12px] text-muted">{physioPlace(chosen) || 'No location on their profile'}</div>}
      <button disabled={!pick} onClick={() => onAssign(pick)} className={cx('mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-brand text-[14px] font-medium text-white cursor-pointer disabled:opacity-50')}>
        <Check size={15} /> {pick && pick === suggested ? 'Confirm suggestion' : 'Assign physio'}
      </button>
    </div>
  )
}

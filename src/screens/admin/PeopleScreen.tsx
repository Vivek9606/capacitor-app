import { useMemo, useState } from 'react'
import { ago, day, fmtInt, PageHeading, Panel } from './kit'
import { activity, type Activity, ACTIVITY, downloadCsv, type Person, SOURCE_INFO, SOURCE_LABEL, STEP_KEYS, type StepKey, STEPS, stepsDone } from './model'
import { ActivityPill, Chips, ExportButton, PersonCell, RedFlag, StepDots, StepLegend, Table } from './parts'

type Kind = 'all' | 'account' | 'website'

/** Everyone, once per phone number: who they are, how far they've got, and whether they're still active. */
export function PeopleScreen({ people, q, open, initialStep }: { people: Person[]; q: string; open: (p: Person) => void; initialStep?: StepKey }) {
  const [kind, setKind] = useState<Kind>('all')
  const [step, setStep] = useState<StepKey | 'any'>(initialStep ?? 'any')
  const [act, setAct] = useState<Activity | 'any'>('any')
  const needle = q.trim().toLowerCase()

  const searched = useMemo(
    () => people.filter((p) => !needle || `${p.name} ${p.phone} ${p.city ?? ''} ${p.email ?? ''} ${p.physioName ?? ''} ${p.tags.join(' ')}`.toLowerCase().includes(needle)),
    [people, needle],
  )
  const byKind = searched.filter((p) => kind === 'all' || p.kind === kind)
  const byStep = byKind.filter((p) => step === 'any' || p.steps[step])
  const rows = byStep
    .filter((p) => act === 'any' || activity(p.lastActiveAt, p.dischargedAt) === act)
    .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
  const accounts = searched.filter((p) => p.kind === 'account').length

  const exportCsv = () =>
    downloadCsv(`betterhood-people-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Name', 'Phone', 'Email', 'City', 'Record', 'Came from', 'Steps reached', 'Furthest step', ...STEP_KEYS.map((k) => STEPS[k].label), 'Latest assessment', 'Result', 'Critical advisory', 'Physio', 'Last active', 'Status', 'Test'],
      ...rows.map((p) => [
        p.name,
        p.phone,
        p.email,
        p.city,
        p.kind === 'website' ? 'Website only' : 'Account',
        SOURCE_LABEL[p.source],
        stepsDone(p),
        STEPS[[...STEP_KEYS].reverse().find((k) => p.steps[k]) ?? 'details'].label,
        ...STEP_KEYS.map((k) => p.steps[k]?.slice(0, 10) ?? ''),
        p.latest?.title,
        p.latest?.result,
        p.latest?.redFlag ? 'Yes' : '',
        p.physioName,
        p.lastActiveAt.slice(0, 10),
        ACTIVITY[activity(p.lastActiveAt, p.dischargedAt)].label,
        p.test ? 'Yes' : '',
      ]),
    ])

  return (
    <>
      <PageHeading title="People" actions={<ExportButton onClick={exportCsv} />}>
        Everyone who has given us their details, once per phone number: <b className="text-ink">{fmtInt(accounts)}</b> with an account and <b className="text-ink">{fmtInt(searched.length - accounts)}</b> who only used the website. Open anyone for their full profile.
      </PageHeading>

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4">
          <Chips
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Everyone', n: searched.length },
              { value: 'account', label: 'Has an account', n: accounts, info: 'Verified their number, or was added by their physio.' },
              { value: 'website', label: 'Website only', n: searched.length - accounts, info: 'Gave their details on the website, no account yet.' },
            ]}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[12px] font-medium text-muted" htmlFor="reached">
              Reached
            </label>
            <select id="reached" value={step} onChange={(e) => setStep(e.target.value as StepKey | 'any')} className="h-8 rounded-md border border-line bg-surface px-2 text-[14px] text-ink outline-none focus:border-brand">
              <option value="any">Any step</option>
              {STEP_KEYS.map((k) => (
                <option key={k} value={k}>
                  {STEPS[k].label} ({byKind.filter((p) => p.steps[k]).length})
                </option>
              ))}
            </select>
            <span className="mx-1 h-5 w-px bg-line" />
            <Chips
              value={act}
              onChange={setAct}
              options={[{ value: 'any' as const, label: 'Any activity' }, ...(['active', 'quiet', 'inactive', 'discharged'] as const).map((a) => ({ value: a, label: ACTIVITY[a].label, n: byStep.filter((p) => activity(p.lastActiveAt, p.dischargedAt) === a).length, info: ACTIVITY[a].info }))]}
            />
          </div>
          {step !== 'any' && <p className="text-[12px] text-muted">{STEPS[step].info} Counts everyone who reached it, including people who have gone further.</p>}
        </div>
        <Table
          rows={rows}
          rowKey={(p) => p.key}
          onOpen={open}
          empty={people.length ? 'Nobody matches these filters.' : 'Nobody yet.'}
          cols={[
            { head: 'Person', cell: (p) => <PersonCell p={p} />, className: 'w-[30%]' },
            { head: 'Came from', info: SOURCE_INFO, cell: (p) => <span className="text-muted">{SOURCE_LABEL[p.source]}</span> },
            { head: 'Progress', info: 'The 8 steps every consumer moves through. The text is the furthest step reached.', cell: (p) => <StepDots p={p} /> },
            {
              head: 'Latest assessment',
              cell: (p) =>
                p.latest ? (
                  <div className="min-w-0">
                    <div className="truncate">
                      {p.latest.title}
                      {p.latest.result ? <span className="text-muted">: {p.latest.result}</span> : null}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                      {day(p.latest.at)} · {p.latest.source === 'web' ? 'website' : 'app'}
                      {p.latest.redFlag && <RedFlag reasons={p.latest.reasons} />}
                    </div>
                  </div>
                ) : (
                  <span className="text-faint">None</span>
                ),
            },
            { head: 'Physio', cell: (p) => (p.physioName ? p.physioName : <span className="text-faint">None yet</span>) },
            {
              head: 'Last active',
              info: 'The most recent thing they did: opened the app, a session, a booking, a message, an assessment or a website form.',
              cell: (p) => (
                <div className="flex flex-col items-start gap-1">
                  <ActivityPill p={p} />
                  <span className="text-[12px] text-muted">{ago(p.lastActiveAt)}</span>
                </div>
              ),
            },
          ]}
        />
        <div className="border-t border-line px-5 py-3">
          <StepLegend />
        </div>
      </Panel>
    </>
  )
}

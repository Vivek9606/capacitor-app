import { ArrowLeft, ArrowUpRight, Check, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { cx } from '../../components/ui'
import { api } from '../../lib/api'
import { toast } from '../../lib/platform'
import { ago, day, fmtInt, fmtRupees, PageHeading, Panel, PanelHead } from './kit'
import { activity, ACTIVITY, type Dashboard, downloadCsv, fmtPhone, type Person, type PhysioRow, waLink, within, windows, type Period } from './model'
import { Chips, ExportButton, Facts, Pill, Table } from './parts'
import { NotesTags } from './PersonScreen'

const SETUP_LABEL: Record<string, string> = { photo: 'Photo', qualification: 'Qualification', focusAreas: 'Focus areas', place: 'Where they practise', availability: 'Availability', billing: 'Billing details' }
type Filter = 'all' | 'pending' | 'verified' | 'treating' | 'not_set_up'

export function verificationPill(v: string) {
  return v === 'verified' ? <Pill tone="ok">Verified</Pill> : v === 'pending' ? <Pill tone="warn">Asked to be verified</Pill> : <Pill>Not verified</Pill>
}

/** Supply: who the physios are, whether they're set up and verified, and whether they're treating anyone. */
export function PhysiosScreen({ d, q, period, open }: { d: Dashboard; q: string; period: Period; open: (x: PhysioRow) => void }) {
  const [f, setF] = useState<Filter>('all')
  const w = windows(period)
  const needle = q.trim().toLowerCase()
  const sessions = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of d.events.sessions) if (within(s.at, w.cur)) m.set(s.physioId, (m.get(s.physioId) ?? 0) + 1)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, period])
  const searched = d.physios.filter((x) => !needle || `${x.name} ${x.phone} ${x.place ?? ''} ${x.focusAreas.join(' ')}`.toLowerCase().includes(needle))
  const test: Record<Filter, (x: PhysioRow) => boolean> = {
    all: () => true,
    pending: (x) => x.verification === 'pending',
    verified: (x) => x.verification === 'verified',
    treating: (x) => x.activePatients > 0,
    not_set_up: (x) => x.setupDone < 4,
  }
  const rows = searched.filter(test[f]).sort((a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''))

  return (
    <>
      <PageHeading
        title="Physios"
        actions={
          <ExportButton
            onClick={() =>
              downloadCsv(`betterhood-physios-${new Date().toISOString().slice(0, 10)}.csv`, [
                ['Name', 'Phone', 'Verification', 'Profile set up', 'Listed', 'Patients', 'Exercising now', 'Paid', 'Last active', 'Test'],
                ...rows.map((x) => [x.name, x.phone, x.verification, `${x.setupDone}/${x.setupTotal}`, x.listing?.status === 'live' ? 'Yes' : 'No', x.patients, x.activePatients, x.paidTotal, x.lastActiveAt?.slice(0, 10), x.test ? 'Yes' : '']),
              ])
            }
          />
        }
      >
        <b className="text-ink">{fmtInt(searched.length)}</b> physio{searched.length === 1 ? '' : 's'}, <b className="text-ink">{fmtInt(searched.filter(test.verified).length)}</b> verified and <b className="text-ink">{fmtInt(searched.filter(test.treating).length)}</b> with a patient exercising in the last 14 days.
      </PageHeading>
      <Panel>
        <div className="border-b border-line px-5 py-4">
          <Chips
            value={f}
            onChange={setF}
            options={[
              { value: 'all', label: 'Everyone', n: searched.length },
              { value: 'pending', label: 'Asked to be verified', n: searched.filter(test.pending).length },
              { value: 'verified', label: 'Verified', n: searched.filter(test.verified).length },
              { value: 'treating', label: 'Treating someone', n: searched.filter(test.treating).length, info: 'A patient of theirs exercised in the last 14 days.' },
              { value: 'not_set_up', label: 'Profile not set up', n: searched.filter(test.not_set_up).length, info: 'Fewer than 4 of: photo, qualification, focus areas, where they practise, availability, billing.' },
            ]}
          />
        </div>
        <Table
          rows={rows}
          rowKey={(x) => x.id}
          onOpen={open}
          empty={d.physios.length ? 'No physio matches.' : 'No physios yet.'}
          cols={[
            {
              head: 'Physio',
              className: 'w-[28%]',
              cell: (x) => (
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{x.name}</span>
                    {x.test && <Pill>Test</Pill>}
                  </div>
                  <div className="text-[12px] text-muted">{[fmtPhone(x.phone), x.place].filter(Boolean).join(' · ')}</div>
                </div>
              ),
            },
            { head: 'Verification', cell: (x) => verificationPill(x.verification) },
            { head: 'Profile', info: 'How many of the 6 profile items are filled in.', cell: (x) => <span className={x.setupDone < 4 ? 'text-warn' : ''}>{x.setupDone} of {x.setupTotal}</span> },
            { head: 'On betterhood.in', cell: (x) => (x.listing?.status === 'live' ? 'Listed' : x.listing ? 'Hidden' : <span className="text-faint">No</span>) },
            { head: 'Patients', info: 'All their patients, and how many exercised in the last 14 days.', cell: (x) => `${x.patients} · ${x.activePatients} exercising` },
            { head: 'Sessions', info: 'Exercise sessions their patients logged in the selected period.', cell: (x) => fmtInt(sessions.get(x.id) ?? 0) },
            { head: 'Paid', cell: (x) => (x.paidTotal ? fmtRupees(x.paidTotal) : <span className="text-faint">-</span>) },
            {
              head: 'Last active',
              cell: (x) => (
                <div className="flex flex-col items-start gap-1">
                  <Pill tone={ACTIVITY[activity(x.lastActiveAt)].tone}>{ACTIVITY[activity(x.lastActiveAt)].label}</Pill>
                  <span className="text-[12px] text-muted">{ago(x.lastActiveAt)}</span>
                </div>
              ),
            },
          ]}
        />
      </Panel>
    </>
  )
}

interface PhysioJourney {
  profile: { qualification?: string; experienceYrs?: number; councilRegNo?: string; referredBy?: string }
  listing?: { slug: string; status: string; url: string; publishedAt?: string }
  patients: { id: string; name: string; selfSignup: boolean; condition?: string; createdAt: string; dischargedAt?: string; lastSession?: string }[]
}

export function PhysioScreen({ x, people, token, onBack, onChanged, openPerson }: { x: PhysioRow; people: Person[]; token?: string; onBack: () => void; onChanged: () => void; openPerson: (p: Person) => void }) {
  const [j, setJ] = useState<PhysioJourney>()
  const [tl, setTl] = useState<{ events: { at: string; title: string; detail?: string }[]; notes: { id: string; text: string; author: string; createdAt: string }[]; tags: string[] }>()
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api<PhysioJourney>(`/admin/journey/physio/${x.id}`, { token }), api<NonNullable<typeof tl>>(`/admin/timeline/physio/${x.id}`, { token })])
      setJ(a)
      setTl(b)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t load this physio')
    }
  }, [x.id, token])
  useEffect(() => {
    load()
  }, [load])

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      toast(msg)
      onChanged()
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t update')
    }
  }
  const verify = (status: 'verified' | 'none') => act(() => api(`/admin/physios/${x.id}/verification`, { body: { status }, token }), status === 'verified' ? `${x.name} is now verified` : `${x.name} is no longer verified`)
  const listing = (status: 'live' | 'hidden') => act(() => api(`/admin/directory/${x.id}/status`, { body: { status }, token }), status === 'hidden' ? 'Listing taken off betterhood.in' : 'Listing back on betterhood.in')
  const setTest = (t: boolean) => act(() => api(`/admin/test-contacts/${x.phone}`, { method: t ? 'PUT' : 'DELETE', body: t ? {} : undefined, token }), t ? 'Marked as a test number' : 'Counts again')

  return (
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 self-start text-[14px] font-medium text-muted cursor-pointer hover:text-ink">
        <ArrowLeft size={16} /> All physios
      </button>
      <Panel className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-semibold tracking-tight">{x.name}</h1>
              {verificationPill(x.verification)}
              {x.test && <Pill>Test</Pill>}
            </div>
            <p className="mt-1 text-[14px] text-muted">{[fmtPhone(x.phone), x.email, x.place].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 text-[14px] text-muted">
              Joined {day(x.createdAt)}
              {j?.profile.referredBy ? `, invited by ${j.profile.referredBy}` : ''} · last active {ago(x.lastActiveAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={waLink(x.phone)} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[14px] hover:bg-track/60">
              <MessageCircle size={14} /> WhatsApp
            </a>
            {x.verification === 'verified' ? (
              <button onClick={() => verify('none')} className="h-8 rounded-md border border-line bg-surface px-3 text-[14px] cursor-pointer hover:bg-track/60">
                Remove verification
              </button>
            ) : (
              <button onClick={() => verify('verified')} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[14px] font-medium text-white cursor-pointer">
                <Check size={14} /> Verify
              </button>
            )}
            <button onClick={() => setTest(!x.test)} className="h-8 rounded-md border border-line bg-surface px-3 text-[14px] cursor-pointer hover:bg-track/60">
              {x.test ? 'Not a test number' : 'Mark as test number'}
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel>
            <PanelHead title="Patients" desc={`${x.patients} in total, ${x.activePatients} exercised in the last 14 days.`} />
            <ul className="divide-y divide-line px-5 pb-2 pt-2">
              {!j && <li className="py-3 text-[14px] text-muted">Loading…</li>}
              {j?.patients.length === 0 && <li className="py-3 text-[14px] text-muted">No patients yet.</li>}
              {j?.patients.map((pt) => {
                const person = people.find((p) => p.patientId === pt.id)
                return (
                  <li key={pt.id}>
                    <button disabled={!person} onClick={() => person && openPerson(person)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-[14px] cursor-pointer disabled:cursor-default">
                      <span>
                        <span className="font-medium">{pt.name}</span>
                        <span className="text-muted">{pt.condition ? ` · ${pt.condition}` : ''}</span>
                      </span>
                      <span className="text-[12px] text-muted">{pt.dischargedAt ? 'Discharged' : pt.lastSession ? `Last session ${day(pt.lastSession)}` : `Added ${day(pt.createdAt)}`}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>
          <Panel>
            <PanelHead title="Everything that happened" desc="Newest first." />
            <ol className="px-5 pb-4 pt-2">
              {tl?.events.map((e, i) => (
                <li key={i} className="grid grid-cols-[72px_1fr] gap-3 border-b border-line py-2.5 text-[14px] last:border-b-0">
                  <span className="text-[12px] text-muted">{day(e.at)}</span>
                  <div>
                    <div>{e.title}</div>
                    {e.detail && <div className="text-[12px] text-muted">{e.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <Panel>
            <PanelHead title="Profile" desc={`${x.setupDone} of ${x.setupTotal} filled in`} />
            <ul className="px-5 pb-4 pt-2">
              {Object.entries(x.setup).map(([k, done]) => (
                <li key={k} className="flex items-center justify-between border-b border-line py-2 text-[14px] last:border-b-0">
                  {SETUP_LABEL[k] ?? k}
                  <Pill tone={done ? 'ok' : 'muted'}>{done ? 'Done' : 'Missing'}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="px-5 py-5">
            <Facts
              rows={[
                ['Qualification', j?.profile.qualification ?? '-'],
                ['Experience', j?.profile.experienceYrs ? `${j.profile.experienceYrs} years` : '-'],
                ['Council reg. no.', j?.profile.councilRegNo ?? '-'],
                ['Focus areas', x.focusAreas.join(', ') || '-'],
                [
                  'On betterhood.in',
                  x.listing ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <a href={x.listing.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand">
                        {x.listing.status === 'live' ? 'Listed' : 'Hidden'} <ArrowUpRight size={13} />
                      </a>
                      <button onClick={() => listing(x.listing!.status === 'live' ? 'hidden' : 'live')} className={cx('text-[12px] text-muted cursor-pointer hover:text-danger')}>
                        {x.listing.status === 'live' ? 'Take off the site' : 'Put back'}
                      </button>
                    </span>
                  ) : (
                    'Not listed'
                  ),
                ],
                ['Bookings', `${x.bookings} (${x.publicBookings} from their public profile)`],
                ['Invoices', `${fmtRupees(x.paidTotal)} paid · ${fmtRupees(x.unpaidTotal)} unpaid`],
                ['Physios they invited', String(x.referrals)],
              ]}
            />
          </Panel>
          <NotesTags subject={{ type: 'physio', id: x.id }} tl={tl} token={token} onSaved={load} />
        </div>
      </div>
    </>
  )
}

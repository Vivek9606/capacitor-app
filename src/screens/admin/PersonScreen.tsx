import { ArrowLeft, MessageCircle, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AssessmentAnswers } from '../../components/AssessmentAnswers'
import { cx } from '../../components/ui'
import { api } from '../../lib/api'
import { toast } from '../../lib/platform'
import { ago, day, fmtRupees, Panel, PanelHead } from './kit'
import { fmtPhone, videoState, type Person, SOURCE_LABEL, STEP_KEYS, STEPS, waLink } from './model'
import { ActivityPill, Facts, PersonBadges, Pill, RedFlag } from './parts'

type Answer = { q: string; a: string | string[] }
interface Assessment {
  id: string
  title: string
  kind: string
  condition?: string
  result?: string
  advisory?: string
  scores?: { overall?: number | null }
  source: string
  answers?: Answer[]
  painScore?: number
  advisoryReasons?: string[]
  takenAt?: string
  createdAt: string
}
interface Submission {
  id: string
  kind: 'form' | 'assessment'
  form: string
  page?: string
  claimed: boolean
  resultId?: string
  data: Record<string, any>
  createdAt: string
}
interface Journey {
  profile: { age?: number; sex?: string; consentAt?: string; whatsappOptIn?: boolean; consents?: { purpose: string; granted: boolean; version: string; channel: string; at: string }[]; physio?: { name: string; matchStatus?: string }; discharge?: { outcome?: string; note?: string } }
  assessments: Assessment[]
  chats: { id: string; status: string; userMessages: number; createdAt: string; redFlags: string[] }[]
  bookings: { id: string; date: string; time: string; visitType: string; status: string; physioName: string; physioJoinedAt?: string; patientJoinedAt?: string }[]
  plans: { id: string; title: string; status: string; weeks: number; daysPerWeek: number; sentAt?: string; openedAt?: string; done: number; skipped: number; firstPain?: number; lastPain?: number }[]
  messages: { fromPatient: number; fromPhysio: number; lastAt?: string }
  invoices: { number: string; total: number; status: string; createdAt: string; paidAt?: string }[]
}
interface Timeline {
  events: { at: string; kind: string; title: string; detail?: string }[]
  notes: { id: string; text: string; author: string; createdAt: string }[]
  tags: string[]
}

const PURPOSE: Record<string, string> = { terms: 'Terms and privacy policy', share_with_physio: 'Share answers with the physio', whatsapp_updates: 'WhatsApp updates' }
const nice = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

/** One person, everything we know, in one page. Read-only apart from the team's notes, tags and the test flag. */
export function PersonScreen({ p, token, onBack, onChanged }: { p: Person; token?: string; onBack: () => void; onChanged: () => void }) {
  const [j, setJ] = useState<Journey>()
  const [subs, setSubs] = useState<Submission[]>([])
  const [tl, setTl] = useState<Timeline>()
  const subject = p.kind === 'account' ? { type: 'patient' as const, id: p.patientId! } : { type: 'lead' as const, id: p.submissionIds[0] }

  const load = useCallback(async () => {
    try {
      const [jr, sr, tr] = await Promise.all([
        p.kind === 'account' ? api<Journey>(`/admin/journey/patient/${p.patientId}`, { token }) : Promise.resolve(undefined),
        api<{ submissions: Submission[] }>(`/admin/submissions/${p.phone}`, { token }),
        subject.id ? api<Timeline>(`/admin/timeline/${subject.type}/${subject.id}`, { token }) : Promise.resolve(undefined),
      ])
      setJ(jr)
      setSubs(sr.submissions)
      setTl(tr)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t load this person')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.key, token])
  useEffect(() => {
    load()
  }, [load])

  const setTest = async (test: boolean) => {
    try {
      await api(`/admin/test-contacts/${p.phone}`, { method: test ? 'PUT' : 'DELETE', body: test ? {} : undefined, token })
      toast(test ? `${p.name} is marked as a test number` : `${p.name} counts again`)
      onChanged()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t update')
    }
  }

  // Assessments: those saved to the account, then website results with this phone that aren't (yet) in the account.
  const saved = [...(j?.assessments ?? [])].sort((a, b) => (b.takenAt ?? b.createdAt).localeCompare(a.takenAt ?? a.createdAt))
  const savedIds = new Set(saved.map((a) => a.id))
  const webOnly = subs.filter((s) => s.kind === 'assessment' && !s.claimed && !(s.resultId && savedIds.has(s.resultId)))
  const forms = subs.filter((s) => s.kind === 'form')

  return (
    <>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 self-start text-[14px] font-medium text-muted cursor-pointer hover:text-ink">
        <ArrowLeft size={16} /> All people
      </button>

      <Panel className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[24px] font-semibold tracking-tight text-ink">{p.name}</h1>
              <PersonBadges p={p} />
              <ActivityPill p={p} />
            </div>
            <p className="mt-1 text-[14px] text-muted">
              {[fmtPhone(p.phone), p.email, p.city, j?.profile.age && `${j.profile.age} yrs`, j?.profile.sex && { F: 'female', M: 'male', O: 'other' }[j.profile.sex]].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1 text-[14px] text-muted">
              Came from <b className="font-medium text-ink">{SOURCE_LABEL[p.source]}</b> · first contact {day(p.steps.details)} · last active {ago(p.lastActiveAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={waLink(p.phone)} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[14px] text-ink hover:bg-track/60">
              <MessageCircle size={14} /> WhatsApp
            </a>
            <button onClick={() => setTest(!p.test)} className="inline-flex h-8 items-center rounded-md border border-line bg-surface px-3 text-[14px] text-ink cursor-pointer hover:bg-track/60" title="Test numbers are left out of every count. Nothing is deleted.">
              {p.test ? 'Not a test number' : 'Mark as test number'}
            </button>
          </div>
        </div>

        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {STEP_KEYS.map((k, i) => (
            <li key={k} title={STEPS[k].info} className={cx('rounded-lg border px-3 py-2.5', p.steps[k] ? 'border-brand-line bg-brand-soft' : 'border-dashed border-line')}>
              <div className="text-[12px] text-muted">Step {i + 1}</div>
              <div className={cx('text-[14px] font-medium leading-snug', p.steps[k] ? 'text-ink' : 'text-faint')}>{STEPS[k].label}</div>
              <div className={cx('mt-0.5 text-[12px]', p.steps[k] ? 'text-brand' : 'text-faint')}>{p.steps[k] ? day(p.steps[k]) : 'Not yet'}</div>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Panel>
            <PanelHead title="Assessments" desc={saved.length + webOnly.length ? 'Newest first, with every answer they gave.' : undefined} />
            <div className="divide-y divide-line px-5 pb-2 pt-2">
              {!j && p.kind === 'account' && <p className="py-4 text-[14px] text-muted">Loading…</p>}
              {saved.length + webOnly.length === 0 && (j || p.kind === 'website') && <p className="py-4 text-[14px] text-muted">No assessments yet.</p>}
              {saved.map((a, i) => (
                <AssessmentRow
                  key={a.id}
                  title={a.title}
                  result={a.condition ?? (a.scores?.overall != null ? `${a.scores.overall}/10` : undefined)}
                  at={a.takenAt ?? a.createdAt}
                  where={a.source === 'web' ? 'Website' : 'App'}
                  redFlag={!!a.advisory || !!a.advisoryReasons?.length}
                  detail={{ answers: a.answers, painScore: a.painScore, advisoryReasons: a.advisoryReasons }}
                  open={i === 0}
                />
              ))}
              {webOnly.map((s, i) => (
                <AssessmentRow
                  key={s.id}
                  title={s.data.title ?? s.form}
                  result={s.data.condition ?? (s.data.overall != null ? `${s.data.overall}/10` : undefined)}
                  at={s.createdAt}
                  where="Website"
                  note={p.kind === 'account' ? 'Typed with this phone, not yet confirmed as theirs' : undefined}
                  redFlag={!!s.data.advisory}
                  detail={{ answers: s.data.answers, painScore: s.data.painScore, advisoryReasons: s.data.advisoryReasons }}
                  open={saved.length === 0 && i === 0}
                />
              ))}
            </div>
          </Panel>

          {p.kind === 'account' && j && (
            <Panel>
              <PanelHead title="Care" desc={j.profile.physio ? `With ${j.profile.physio.name}` : 'No physio yet'} />
              <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
                <Section title="Bookings" empty="No bookings." rows={j.bookings.map((b) => [`${b.visitType === 'teleconsult' ? 'Video consult' : nice(b.visitType)} with ${b.physioName}`, `${b.date} ${String(b.time).slice(0, 5)}`, b.visitType === 'teleconsult' && b.status !== 'cancelled' ? `${nice(b.status)} · ${videoState(b)}` : nice(b.status)])} />
                <Section
                  title="Care plans"
                  empty="No care plan yet."
                  rows={j.plans.map((x) => [
                    x.title,
                    `${x.done} done${x.skipped ? `, ${x.skipped} skipped` : ''}${x.firstPain != null && x.lastPain != null ? ` · pain ${x.firstPain} → ${x.lastPain}` : ''}`,
                    `${nice(x.status)}${x.openedAt ? '' : ' · not opened yet'}`,
                  ])}
                />
                <Section title="Invoices" empty="No invoices." rows={j.invoices.map((x) => [x.number, fmtRupees(x.total), nice(x.status)])} />
              </div>
            </Panel>
          )}

          {forms.length > 0 && (
            <Panel>
              <PanelHead title="Website forms" />
              <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
                {forms.map((s) => (
                  <div key={s.id} className="rounded-lg bg-track/50 px-3 py-2.5 text-[14px]">
                    <div className="font-medium">
                      {nice(s.form.replace(/[-:]/g, ' '))} <span className="font-normal text-muted">· {day(s.createdAt)}</span>
                    </div>
                    {Object.entries(s.data)
                      .filter(([k, v]) => v && typeof v !== 'object' && !['name', 'phone', 'email', 'website'].includes(k))
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <div key={k} className="mt-1 text-muted">
                          {nice(k)}: <span className="text-ink">{String(v).slice(0, 400)}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHead title="Everything that happened" desc="Newest first." />
            <ol className="px-5 pb-4 pt-2">
              {!tl && <li className="py-3 text-[14px] text-muted">Loading…</li>}
              {tl?.events.length === 0 && <li className="py-3 text-[14px] text-muted">Nothing yet.</li>}
              {tl?.events.map((e, i) => (
                <li key={i} className="grid grid-cols-[72px_1fr] gap-3 border-b border-line py-2.5 text-[14px] last:border-b-0">
                  <span className="text-[12px] text-muted">{day(e.at)}</span>
                  <div className="min-w-0">
                    <div className="text-ink">{e.title}</div>
                    {e.detail && <div className="text-[12px] text-muted">{e.detail}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <Panel className="px-5 py-5">
            <Facts
              rows={[
                ['Record', p.kind === 'account' ? 'Account' : 'Website only (no account)'],
                ['Physio', p.physioName ?? 'None yet'],
                ...(p.kind === 'account'
                  ? ([
                      ['Consent', p.consent ? 'Terms and sharing with physio' : <span className="text-warn">Not given yet</span>],
                      ['WhatsApp updates', j?.profile.whatsappOptIn == null ? 'Not asked' : j.profile.whatsappOptIn ? 'Opted in' : 'Opted out'],
                      ['Messages', j ? `${j.messages.fromPatient} sent · ${j.messages.fromPhysio} from physio` : '…'],
                      ['Pain chats', j ? String(j.chats.length) : '…'],
                    ] as [string, React.ReactNode][])
                  : []),
                ['Website submissions', String(p.counts.websiteSubmissions)],
                ['Paid', p.paid ? fmtRupees(p.paid) : '-'],
              ]}
            />
          </Panel>

          {p.kind === 'account' && j?.profile.consents && j.profile.consents.length > 0 && (
            <Panel>
              <PanelHead title="Consent history" />
              <ul className="px-5 pb-4 pt-2">
                {j.profile.consents.map((c, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 border-b border-line py-2.5 text-[14px] last:border-b-0">
                    <div>
                      <div className="text-ink">{PURPOSE[c.purpose] ?? c.purpose}</div>
                      <div className="text-[12px] text-muted">
                        {day(c.at)} · {c.channel === 'web' ? 'website' : 'app'} · wording {c.version}
                      </div>
                    </div>
                    <Pill tone={c.granted ? 'ok' : 'muted'}>{c.granted ? 'Agreed' : 'Declined'}</Pill>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {subject.id && <NotesTags subject={subject} tl={tl} token={token} onSaved={load} />}
        </div>
      </div>
    </>
  )
}

function AssessmentRow({ title, result, at, where, note, redFlag, detail, open }: { title: string; result?: string; at: string; where: string; note?: string; redFlag: boolean; detail: { answers?: Answer[]; painScore?: number; advisoryReasons?: string[] }; open: boolean }) {
  const has = !!(detail.answers?.length || detail.painScore != null || detail.advisoryReasons?.length)
  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[16px] font-medium text-ink">{title}</span>
        {result && <span className="text-[14px] text-muted">{result}</span>}
        {redFlag && <RedFlag reasons={detail.advisoryReasons} />}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">
        {day(at)} · {where}
        {note ? ` · ${note}` : ''}
      </div>
      {has ? <AssessmentAnswers a={detail} open={open} /> : <p className="mt-1.5 text-[12px] text-faint">Answers weren’t recorded for this one (taken before 18 Nov 2026).</p>}
    </div>
  )
}

function Section({ title, rows, empty }: { title: string; rows: [string, string, string][]; empty: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-medium text-muted">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[14px] text-faint">{empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-[14px]">
              <span className="truncate text-ink">{r[0]}</span>
              <span className="truncate text-muted">{r[1]}</span>
              <span className="text-[12px] text-muted">{r[2]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The team's own notes and follow-up tags (the only things the dashboard writes, besides the test flag). */
export function NotesTags({ subject, tl, token, onSaved }: { subject: { type: 'patient' | 'physio' | 'lead'; id: string }; tl?: { notes: Timeline['notes']; tags: string[] }; token?: string; onSaved: () => void }) {
  const [text, setText] = useState('')
  const [tag, setTag] = useState('')
  const [busy, setBusy] = useState(false)
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      onSaved()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save')
    } finally {
      setBusy(false)
    }
  }
  const tags = tl?.tags ?? []
  const setTags = (next: string[]) => act(() => api('/admin/tags', { method: 'PUT', token, body: { subjectType: subject.type, subjectId: subject.id, tags: next } }))
  return (
    <Panel>
      <PanelHead title="Team notes" desc="Only the admin team sees these." />
      <div className="flex flex-col gap-3 px-5 pb-5 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-soft pl-3 pr-1.5 text-[12px] font-medium text-brand">
              {t}
              <button aria-label={`Remove tag ${t}`} disabled={busy} onClick={() => setTags(tags.filter((x) => x !== t))} className="grid h-5 w-5 place-items-center rounded-full cursor-pointer hover:bg-brand-line">
                ×
              </button>
            </span>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const v = tag.trim().toLowerCase()
              if (v && !tags.includes(v)) setTags([...tags, v])
              setTag('')
            }}
          >
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ Add a tag" maxLength={30} className="h-7 w-28 rounded-full border border-dashed border-line bg-transparent px-3 text-[12px] outline-none focus:border-brand" />
          </form>
        </div>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) act(() => api('/admin/notes', { body: { subjectType: subject.type, subjectId: subject.id, text: text.trim() }, token })).then(() => setText(''))
          }}
        >
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Add a note, e.g. called, will book next week" className="rounded-md border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-brand" />
          <button disabled={busy || !text.trim()} className="h-8 self-end rounded-md bg-brand px-3 text-[14px] font-medium text-white cursor-pointer disabled:opacity-50">
            Save note
          </button>
        </form>
        <ul className="flex flex-col gap-2">
          {tl?.notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-track/50 px-3 py-2 text-[14px]">
              <div className="whitespace-pre-wrap text-ink">{n.text}</div>
              <div className="mt-1 flex items-center justify-between text-[12px] text-muted">
                {day(n.createdAt)} · {n.author}
                <button aria-label="Delete note" onClick={() => act(() => api(`/admin/notes/${n.id}`, { method: 'DELETE', token }))} className="cursor-pointer hover:text-danger">
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

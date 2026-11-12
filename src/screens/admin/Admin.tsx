import { ArrowUpRight, BadgeCheck, Check, ClipboardList, Globe, LayoutDashboard, LogOut, RefreshCw, Search, ShieldCheck, Stethoscope, UserRoundSearch, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Logo } from '../../components/Logo'
import { Avatar, Badge, Button, Card, cx, Input } from '../../components/ui'
import { api, ApiError, apiMode } from '../../lib/api'
import { resultUrl } from '../../lib/assessments'
import { fmtShort } from '../../lib/dates'
import { fmtPhone } from '../../lib/logic'
import { physioPlace, wantedFocus } from '../../lib/match'
import { isNative, toast } from '../../lib/platform'
import { DEMO } from '../../lib/seed'
import { useStore } from '../../lib/store'
import type { Assessment, Patient, Physio } from '../../lib/types'
import { ConsumersPage, OverviewPage, PhysiosPage, WebsitePage } from './Growth'
import { type Journeys, type Subject, SubjectDrawer } from './Journeys'
import { PageHeading, type Period, PERIODS, Segmented } from './kit'

/**
 * Web-only admin dashboard (/admin on the web app): self-signed-up patients, their assessments,
 * and confirming which physio each one goes to. Sign-in is a WhatsApp code for numbers in ADMIN_PHONES.
 */

const KEY = 'bh-admin-v1'
type AdminPhysio = Physio & { patients: number }
interface Overview {
  counts: { physios: number; patients: number; self: number; unassigned: number; assessments: number }
  physios: AdminPhysio[]
  patients: Patient[]
  assessments: Assessment[]
  /** betterhood.in directory listings (API mode only). They go live without review; admins can hide one. */
  listings?: { physioId: string; slug: string; status: 'live' | 'hidden'; url: string; updatedAt: string }[]
}

function loadAuth(): { phone: string; token?: string } | undefined {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? undefined
  } catch {
    return undefined
  }
}
function saveAuth(v?: { phone: string; token?: string }) {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v))
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export default function Admin() {
  const [auth, setAuth] = useState(loadAuth)
  if (isNative)
    return <p className="mx-auto max-w-sm p-10 text-center text-muted">The admin dashboard is web-only. Open it in a browser on your computer.</p>
  if (!auth)
    return (
      <AdminLogin
        onIn={(a) => {
          saveAuth(a)
          setAuth(a)
        }}
      />
    )
  return (
    <Dashboard
      token={auth.token}
      onOut={() => {
        saveAuth(undefined)
        setAuth(undefined)
      }}
    />
  )
}

function AdminLogin({ onIn }: { onIn: (a: { phone: string; token?: string }) => void }) {
  const store = useStore()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const digits = phone.replace(/\D/g, '').slice(-10)

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await store.requestOtp(digits)
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send the code')
    } finally {
      setBusy(false)
    }
  }
  const verify = async () => {
    setBusy(true)
    setError('')
    try {
      if (!apiMode) {
        if (digits !== DEMO.adminPhone) throw new Error('This number is not an admin.')
        if (code !== DEMO.otp) throw new Error('That code didn’t match.')
        onIn({ phone: digits })
      } else {
        const r = await api<{ token: string }>('/auth/otp/verify', { body: { phone: digits, code, as: 'admin' } })
        onIn({ phone: digits, token: r.token })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-full place-items-center px-5 py-10">
      <Card className="w-full max-w-[400px] p-6">
        <Logo tag="Admin" />
        <h1 className="mt-6 font-display text-[24px] font-bold">Sign in</h1>
        <p className="mt-1 text-[14px] text-muted">A one-time code goes to your WhatsApp.</p>
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!sent) send()
            else verify()
          }}
        >
          <Input label="Admin mobile number" prefix="+91" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} disabled={sent} />
          {sent && <Input label="6-digit code" inputMode="numeric" autoFocus maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />}
          {error && <p className="text-[14px] text-danger">{error}</p>}
          <Button type="submit" block disabled={busy || !/^[6-9]\d{9}$/.test(digits) || (sent && code.length !== 6)}>
            {sent ? 'Sign in' : 'Send code'}
          </Button>
          {!apiMode && (
            <p className="rounded-xl bg-brand-soft/60 p-3 text-[13px] text-brand">
              <b>Demo</b> — admin {DEMO.adminPhone}, code {DEMO.otp}
            </p>
          )}
        </form>
      </Card>
    </div>
  )
}

type Tab = 'overview' | 'consumers' | 'journey' | 'website' | 'queue' | 'patients' | 'physios' | 'assessments'

/**
 * The admin pages use a cooler, denser look than the consumer app (white panels on a neutral grey, thin
 * borders). These override the app's colour tokens for everything inside the dashboard; the brand plum stays.
 */
const ADMIN_THEME = {
  '--color-bg': '#f7f8fa',
  '--color-line': '#e4e7ec',
  '--color-track': '#f0f2f5',
  '--color-ink': '#101828',
  '--color-muted': '#5d6b82',
  '--color-faint': '#98a2b3',
} as React.CSSProperties
/** Brings the app's rounder cards in line with the dashboard's panels. */
const OPS_CARD = 'rounded-xl! shadow-none! border border-line'

function Dashboard({ token, onOut }: { token?: string; onOut: () => void }) {
  const store = useStore()
  const [remote, setRemote] = useState<Overview>()
  const [loading, setLoading] = useState(false)
  // Journeys come from the API; the local demo only has the older tabs.
  const [journeys, setJourneys] = useState<Journeys>()
  const [subject, setSubject] = useState<Subject>()
  const [tab, setTab] = useState<Tab>(apiMode ? 'overview' : 'queue')
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState<Period>('28')

  const load = useCallback(async () => {
    if (!apiMode) return
    setLoading(true)
    try {
      const [o, j] = await Promise.all([api<Overview>('/admin/overview', { token }), api<Journeys>('/admin/journeys', { token })])
      setRemote(o)
      setJourneys(j)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) onOut()
      toast(e instanceof Error ? e.message : 'Couldn’t load')
    } finally {
      setLoading(false)
    }
  }, [token, onOut])
  useEffect(() => {
    load()
  }, [load])

  // Demo mode reads the whole local demo database.
  const data: Overview | undefined = useMemo(() => {
    if (apiMode) return remote
    const db = store.db
    const physios = db.physios.map((p) => ({ ...p, patients: db.patients.filter((x) => x.physioId === p.id).length }))
    return {
      counts: {
        physios: physios.length,
        patients: db.patients.length,
        self: db.patients.filter((p) => p.selfSignup).length,
        unassigned: db.patients.filter((p) => !p.physioId).length,
        assessments: db.assessments.length,
      },
      physios,
      patients: [...db.patients].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      assessments: [...db.assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }
  }, [remote, store.db])

  const setVerification = async (p: AdminPhysio, status: 'verified' | 'none') => {
    try {
      if (apiMode) {
        await api(`/admin/physios/${p.id}/verification`, { body: { status }, token })
        await load()
      } else store.adminSetVerificationDemo(p.id, status)
      toast(status === 'verified' ? `${p.name} is now verified` : `${p.name}'s verification removed`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t update verification')
    }
  }

  const setListing = async (p: AdminPhysio, status: 'live' | 'hidden') => {
    try {
      await api(`/admin/directory/${p.id}/status`, { body: { status }, token })
      await load()
      toast(status === 'hidden' ? `${p.name}'s profile is coming off betterhood.in` : `${p.name}'s profile is going back on betterhood.in`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t update the listing')
    }
  }

  const assign = async (p: Patient, physioId: string) => {
    try {
      if (apiMode) {
        await api(`/admin/patients/${p.id}/assign`, { body: { physioId }, token })
        await load()
      } else store.adminAssignDemo(p.id, physioId)
      toast(`${p.name} assigned`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t assign')
    }
  }

  if (!data)
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )

  const physioById = new Map(data.physios.map((p) => [p.id, p]))
  const latestFor = (pid: string) => data.assessments.find((a) => a.patientId === pid)
  const queue = data.patients.filter((p) => !p.physioId)
  const pendingVerify = data.physios.filter((p) => p.verification === 'pending').length
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())

  type Nav = { key: Tab; label: string; icon: React.ReactNode; n?: number; alert?: boolean }
  const NAV: { label: string; items: Nav[] }[] = [
    ...(journeys
      ? [
          {
            label: 'Growth',
            items: [
              { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
              { key: 'consumers', label: 'Consumer journey', icon: <Users size={16} />, n: journeys.consumers.length },
              { key: 'journey', label: 'Physio journey', icon: <Stethoscope size={16} />, n: journeys.physios.length },
              { key: 'website', label: 'Website', icon: <Globe size={16} />, n: journeys.web.total },
            ] as Nav[],
          },
        ]
      : []),
    {
      label: 'Operations',
      items: [
        { key: 'queue', label: 'Assign a physio', icon: <UserRoundSearch size={16} />, n: queue.length, alert: queue.length > 0 },
        // The consumer journey replaces this list when the API is connected.
        ...(journeys ? [] : ([{ key: 'patients', label: 'Patients', icon: <Users size={16} />, n: data.counts.patients }] as Nav[])),
        { key: 'physios', label: 'Verification & listings', icon: <ShieldCheck size={16} />, n: pendingVerify, alert: pendingVerify > 0 },
        { key: 'assessments', label: 'Assessments', icon: <ClipboardList size={16} />, n: data.counts.assessments },
      ] as Nav[],
    },
  ]
  const show = (t: Tab) => {
    setTab(t)
    window.scrollTo(0, 0)
  }
  const growth = tab === 'overview' || tab === 'consumers' || tab === 'journey' || tab === 'website'
  const ctx = journeys && { j: journeys, period, q, open: setSubject, go: (p: 'overview' | 'consumers' | 'physios' | 'website') => show(p === 'physios' ? 'journey' : p) }
  const OPS_HEAD: Partial<Record<Tab, [string, string]>> = {
    queue: ['Assign a physio', `${queue.length} consumer${queue.length === 1 ? '' : 's'} signed up on their own and ${queue.length === 1 ? 'is' : 'are'} waiting for a physio. The best fits are listed first.`],
    patients: ['Patients', 'Everyone with a consumer account.'],
    physios: ['Verification & listings', `${pendingVerify} physio${pendingVerify === 1 ? '' : 's'} asked to be verified. You can also take a directory listing off betterhood.in here.`],
    assessments: ['Assessments', 'The latest 500 assessment results saved to an account in the app.'],
  }
  const navButton = (n: Nav, pill = false) => (
    <button
      key={n.key}
      onClick={() => show(n.key)}
      aria-current={tab === n.key ? 'page' : undefined}
      className={cx(
        'flex items-center gap-2.5 text-[14px] cursor-pointer',
        pill ? 'h-8 shrink-0 rounded-full border px-3' : 'h-9 w-full rounded-md px-2',
        tab === n.key ? (pill ? 'border-brand bg-brand text-white' : 'bg-track font-medium text-ink') : pill ? 'border-line bg-surface text-muted' : 'text-muted hover:bg-track/60 hover:text-ink',
      )}
    >
      {n.icon}
      <span className="truncate">{n.label}</span>
      {n.n !== undefined && !pill && <span className={cx('ml-auto rounded-full px-1.5 text-[11px] font-semibold tabular-nums', n.alert ? 'bg-warn-soft text-warn' : 'text-faint')}>{n.n}</span>}
    </button>
  )

  return (
    <div className="flex min-h-full bg-bg font-sans text-ink" style={ADMIN_THEME}>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Logo tag="Admin" />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main">
          {NAV.map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-faint">{s.label}</div>
              <div className="space-y-0.5">{s.items.map((n) => navButton(n))}</div>
            </div>
          ))}
        </nav>
        <button onClick={onOut} className="m-3 flex h-9 items-center gap-2 rounded-md px-2 text-[14px] text-muted cursor-pointer hover:bg-track/60 hover:text-danger">
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <div className="min-w-0 flex-1 overflow-x-clip">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <div className="lg:hidden">
              <Logo tag="Admin" />
            </div>
            {tab !== 'overview' && (
              <label className="hidden h-9 w-[300px] items-center gap-2 rounded-md border border-line bg-surface px-3 text-[14px] sm:flex">
                <Search size={15} className="shrink-0 text-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, city, tag" aria-label="Search" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" />
              </label>
            )}
            <div className="flex-1" />
            {journeys && growth && <Segmented label="Period" value={period} onChange={setPeriod} options={PERIODS} />}
            {apiMode && (
              <button
                onClick={load}
                aria-label="Refresh"
                title={journeys ? `Data from ${new Date(journeys.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}
                className="grid h-8 w-8 place-items-center rounded-md border border-line bg-surface text-muted cursor-pointer hover:text-ink"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
            <button onClick={onOut} aria-label="Sign out" className="grid h-8 w-8 place-items-center rounded-md border border-line bg-surface text-muted cursor-pointer hover:text-danger lg:hidden">
              <LogOut size={15} />
            </button>
          </div>
          <nav className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden" aria-label="Main">
            {NAV.flatMap((s) => s.items).map((n) => navButton(n, true))}
          </nav>
        </header>

        <main key={tab} className="anim-page mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-6 sm:px-6">
          {ctx && tab === 'overview' && <OverviewPage {...ctx} />}
          {ctx && tab === 'consumers' && <ConsumersPage {...ctx} />}
          {ctx && tab === 'journey' && <PhysiosPage {...ctx} />}
          {ctx && tab === 'website' && <WebsitePage {...ctx} />}
          {OPS_HEAD[tab] && <PageHeading title={OPS_HEAD[tab]![0]}>{OPS_HEAD[tab]![1]}</PageHeading>}
          {!apiMode && <p className="rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-muted">Demo mode: the growth pages need the live API, so only the operations pages are shown.</p>}
          {tab === 'queue' &&
            (queue.length === 0 ? (
              <Card className={cx(OPS_CARD, 'p-10 text-center text-muted')}>Everyone has a physio. New self sign-ups show up here.</Card>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {queue
                  .filter((p) => match(`${p.name} ${p.phone} ${p.city ?? ''}`))
                  .map((p) => (
                    <QueueCard key={p.id} p={p} a={latestFor(p.id)} physios={data.physios} byId={physioById} onAssign={(id) => assign(p, id)} />
                  ))}
              </div>
            ))}

          {tab === 'patients' && (
            <Card className={cx(OPS_CARD, 'overflow-x-auto p-0')}>
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead className="border-b border-line text-[12px] uppercase tracking-wider text-faint">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">City</th>
                    <th className="px-4 py-3 font-semibold">Latest assessment</th>
                    <th className="px-4 py-3 font-semibold">Physio</th>
                    <th className="px-4 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.patients
                    .filter((p) => match(`${p.name} ${p.phone} ${p.city ?? ''}`))
                    .map((p) => {
                      const a = latestFor(p.id)
                      const ph = p.physioId ? physioById.get(p.physioId) : undefined
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-[12px] text-muted">
                              {fmtPhone(p.phone)}
                              {p.selfSignup && ' · self sign-up'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted">{p.city ?? '—'}</td>
                          <td className="px-4 py-3">{a ? `${a.title}: ${a.condition ?? '—'}` : <span className="text-faint">—</span>}</td>
                          <td className="px-4 py-3">{ph ? ph.name : <Badge tone="accent">Unassigned</Badge>}</td>
                          <td className="px-4 py-3 text-muted">{fmtShort(p.createdAt.slice(0, 10))}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'physios' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...data.physios]
                .sort((a, b) => Number(b.verification === 'pending') - Number(a.verification === 'pending'))
                .filter((p) => match(`${p.name} ${p.phone} ${physioPlace(p)}`))
                .map((p) => (
                  <Card key={p.id} className={cx(OPS_CARD, 'p-4')}>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} photo={p.photo} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{p.name}</div>
                        <div className="text-[12px] text-muted">{fmtPhone(p.phone)}</div>
                      </div>
                      {p.verification === 'verified' ? (
                        <Badge tone="ok" icon={<BadgeCheck size={12} />}>Verified</Badge>
                      ) : p.verification === 'pending' ? (
                        <Badge tone="warn">Pending</Badge>
                      ) : (
                        <Badge tone="muted">Not verified</Badge>
                      )}
                    </div>
                    {p.verification === 'pending' && (
                      <div className="mt-3 rounded-xl bg-warn-soft px-3 py-2.5 text-[13px]">
                        <div className="font-semibold">Verification requested</div>
                        <div className="mt-1 text-muted">
                          Council reg. no: <b className="text-ink">{p.councilRegNo || 'not added'}</b>
                        </div>
                        <div className="text-muted">{[p.qualification, p.experienceYrs ? `${p.experienceYrs} yrs` : undefined].filter(Boolean).join(' · ') || 'No qualification added'}</div>
                        <div className="mt-2.5 flex gap-2">
                          <Button size="sm" onClick={() => setVerification(p, 'verified')}>
                            <Check size={14} /> Verify
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setVerification(p, 'none')}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.focusAreas.map((f) => (
                        <Badge key={f} tone="brand">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[13px] text-muted">{physioPlace(p) || 'No location yet'}</div>
                    {(() => {
                      const l = data.listings?.find((x) => x.physioId === p.id)
                      if (!l) return null
                      return (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-[13px]">
                          <a href={l.url} target="_blank" rel="noopener" className="flex min-w-0 items-center gap-1 font-semibold text-brand">
                            <span className="truncate">Directory {l.status === 'live' ? 'profile' : 'profile (hidden)'}</span> <ArrowUpRight size={13} className="shrink-0" />
                          </a>
                          <button onClick={() => setListing(p, l.status === 'live' ? 'hidden' : 'live')} className="shrink-0 text-[12px] font-semibold text-muted cursor-pointer hover:text-danger">
                            {l.status === 'live' ? 'Hide' : 'Show again'}
                          </button>
                        </div>
                      )
                    })()}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[13px] font-semibold">{p.patients} patients</span>
                      {p.verification === 'verified' && (
                        <button onClick={() => setVerification(p, 'none')} className="text-[12px] font-semibold text-muted cursor-pointer hover:text-danger">
                          Remove verification
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          )}

          {tab === 'assessments' && (
            <Card className={cx(OPS_CARD, 'divide-y divide-line p-0')}>
              {data.assessments.length === 0 && <div className="p-10 text-center text-muted">No assessments yet.</div>}
              {data.assessments.map((a) => {
                const p = data.patients.find((x) => x.id === a.patientId)
                if (p && !match(`${p.name} ${p.phone} ${p.city ?? ''}`)) return null
                return (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[14px]">
                    <div className="min-w-[160px] flex-1">
                      <div className="font-semibold">{p?.name ?? 'Patient'}</div>
                      <div className="text-[12px] text-muted">{fmtShort(a.createdAt.slice(0, 10))}</div>
                    </div>
                    <div className="min-w-[200px] flex-1">
                      {a.title}: <b>{a.condition ?? (a.scores?.overall != null ? `${a.scores.overall}/10` : '—')}</b>
                    </div>
                    {a.advisory && <Badge tone="accent">See a doctor</Badge>}
                    {a.result && (
                      <a href={resultUrl(a.result)} target="_blank" rel="noopener" className="flex items-center gap-1 text-[13px] font-semibold text-brand">
                        Result page <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                )
              })}
            </Card>
          )}
        </main>
      </div>
      <SubjectDrawer subject={subject} token={token} onClose={() => setSubject(undefined)} onChanged={load} />
    </div>
  )
}

function QueueCard({ p, a, physios, byId, onAssign }: { p: Patient; a?: Assessment; physios: AdminPhysio[]; byId: Map<string, AdminPhysio>; onAssign: (physioId: string) => void }) {
  // Same ranking as the automatic suggestion (lib/match.ts), so the admin sees the best fits first.
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
    <Card className={cx(OPS_CARD, 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[16px] font-semibold">{p.name}</div>
          <div className="text-[13px] text-muted">{[p.age && `${p.age} yrs`, p.sex, p.city, fmtPhone(p.phone)].filter(Boolean).join(' · ')}</div>
        </div>
        <Badge tone={p.match?.status === 'suggested' ? 'warn' : 'muted'}>{p.match?.status === 'suggested' ? 'Suggested' : 'No suggestion'}</Badge>
      </div>
      {a ? (
        <div className="mt-3 rounded-xl bg-brand-soft/60 px-3 py-2.5 text-[14px]">
          <div>
            {a.title}: <b>{a.condition}</b>
          </div>
          {a.advisory && <div className="mt-1 text-[13px] font-semibold text-accent">Critical advisory: needs a medical check first</div>}
          <div className="mt-0.5 text-[12px] text-muted">Looking for: {want.join(' or ')}{p.city ? ` near ${p.city}` : ''}</div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-track px-3 py-2.5 text-[13px] text-muted">Hasn’t taken an assessment yet.</div>
      )}
      <label className="mt-3 block text-[12px] font-semibold uppercase tracking-wider text-faint" htmlFor={`pick-${p.id}`}>
        Physio
      </label>
      <select
        id={`pick-${p.id}`}
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-3 text-[14px] outline-none focus:border-brand"
      >
        <option value="">Choose a physio…</option>
        {ranked.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name} — {x.focusAreas.join(', ') || 'no focus set'} · {x.patients} patients{x.id === suggested ? '  ★ suggested' : ''}
          </option>
        ))}
      </select>
      {chosen && <div className="mt-1.5 truncate text-[12px] text-muted">{physioPlace(chosen) || 'No location on profile'}</div>}
      <Button size="md" block className="mt-3" disabled={!pick} onClick={() => onAssign(pick)}>
        <Check size={17} /> {pick && pick === suggested ? 'Confirm suggestion' : 'Assign physio'}
      </Button>
    </Card>
  )
}

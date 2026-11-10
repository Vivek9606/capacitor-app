import { ArrowUpRight, BadgeCheck, Check, ClipboardList, LogOut, RefreshCw, Search, Stethoscope, UserRoundSearch, Users } from 'lucide-react'
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

type Tab = 'queue' | 'patients' | 'physios' | 'assessments'

function Dashboard({ token, onOut }: { token?: string; onOut: () => void }) {
  const store = useStore()
  const [remote, setRemote] = useState<Overview>()
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('queue')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (!apiMode) return
    setLoading(true)
    try {
      setRemote(await api<Overview>('/admin/overview', { token }))
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

  const TABS: { key: Tab; label: string; n: number; icon: React.ReactNode }[] = [
    { key: 'queue', label: 'To assign', n: queue.length, icon: <UserRoundSearch size={16} /> },
    { key: 'patients', label: 'Patients', n: data.counts.patients, icon: <Users size={16} /> },
    { key: 'physios', label: pendingVerify ? `Physios · ${pendingVerify} to verify` : 'Physios', n: data.counts.physios, icon: <Stethoscope size={16} /> },
    { key: 'assessments', label: 'Assessments', n: data.counts.assessments, icon: <ClipboardList size={16} /> },
  ]

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-line bg-glass">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-5 py-3">
          <Logo tag="Admin" />
          <div className="flex-1" />
          {apiMode && (
            <button onClick={load} aria-label="Refresh" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted cursor-pointer hover:text-brand">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
          <button onClick={onOut} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-semibold text-muted cursor-pointer hover:text-danger">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="stagger mx-auto max-w-[1200px] px-5 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Waiting for a physio', data.counts.unassigned, 'text-accent'],
            ['Self sign-ups', data.counts.self, 'text-brand'],
            ['Patients', data.counts.patients, 'text-ink'],
            ['Physios', data.counts.physios, 'text-ink'],
          ].map(([label, n, tone]) => (
            <Card key={label as string} className="p-4">
              <div className={cx('font-display text-[30px] font-bold leading-none', tone as string)}>{n as number}</div>
              <div className="mt-1.5 text-[13px] text-muted">{label as string}</div>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-track p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cx('flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold cursor-pointer', tab === t.key ? 'bg-surface text-brand shadow-card' : 'text-muted')}
              >
                {t.icon} {t.label} <span className="text-[12px] opacity-70">{t.n}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto w-full sm:w-[280px]">
            <Input prefix={<Search size={16} className="text-faint" />} placeholder="Search name, phone, city" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div key={tab} className="anim-page mt-4">
          {tab === 'queue' &&
            (queue.length === 0 ? (
              <Card className="p-10 text-center text-muted">Everyone has a physio. New self sign-ups show up here.</Card>
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
            <Card className="overflow-x-auto p-0">
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
                  <Card key={p.id} className="p-4">
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
            <Card className="divide-y divide-line p-0">
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
                      {a.title}: <b>{a.condition ?? '—'}</b>
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
        </div>
      </main>
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
    <Card className="p-4">
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

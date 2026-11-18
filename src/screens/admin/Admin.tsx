import '@fontsource-variable/geist'
import { ClipboardCheck, LayoutDashboard, LogOut, MessageCircleHeart, RefreshCw, Search, Stethoscope, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Logo } from '../../components/Logo'
import { Button, Card, cx, Input } from '../../components/ui'
import { api, ApiError, apiMode } from '../../lib/api'
import { isNative, toast } from '../../lib/platform'
import { DEMO } from '../../lib/seed'
import { useStore } from '../../lib/store'
import type { Patient } from '../../lib/types'
import { Segmented } from './kit'
import { type Dashboard as Data, type Period, type Person, type PhysioRow, todo } from './model'
import { OverviewScreen, type Screen } from './OverviewScreen'
import { type ChatRow, PainChatsPage } from './PainChats'
import { PeopleScreen } from './PeopleScreen'
import { PersonScreen } from './PersonScreen'
import { PhysioScreen, PhysiosScreen } from './PhysiosScreen'
import { type OpsData, TodoScreen } from './TodoScreen'

/**
 * Web-only admin dashboard (/admin on the web app). Four screens, each answering one question:
 * Overview (is it working?), People (who are they, how far have they got?), Physios (is supply keeping up?) and
 * To-do (what must someone do today?). Every number comes from GET /admin/dashboard and the definitions in model.ts.
 * Sign-in is a WhatsApp code for numbers in ADMIN_PHONES.
 */

const KEY = 'bh-admin-v1'
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
              <b>Demo</b>: admin {DEMO.adminPhone}, code {DEMO.otp}
            </p>
          )}
        </form>
      </Card>
    </div>
  )
}


/**
 * The admin pages use a cooler, denser look than the consumer app (white panels on a neutral grey, thin
 * borders). These override the app's colour tokens for everything inside the dashboard; the brand plum stays.
 */
const ADMIN_THEME = {
  // Same palette and type as seo-dashboard-v2: slate neutrals, blue as the main colour, Geist.
  '--color-bg': 'hsl(220 20% 98%)',
  '--color-surface': '#ffffff',
  '--color-line': 'hsl(220 13% 91%)',
  '--color-track': 'hsl(220 14% 96%)',
  '--color-ink': 'hsl(222 47% 11%)',
  '--color-muted': 'hsl(220 9% 46%)',
  '--color-faint': 'hsl(220 9% 62%)',
  '--color-brand': 'hsl(221 83% 53%)',
  '--color-brand-ink': 'hsl(224 76% 40%)',
  '--color-brand-soft': 'hsl(221 83% 96%)',
  '--color-brand-line': 'hsl(221 83% 85%)',
  '--color-ok': 'hsl(152 69% 36%)',
  '--color-ok-soft': 'hsl(152 60% 94%)',
  '--color-warn': 'hsl(35 92% 42%)',
  '--color-warn-soft': 'hsl(40 95% 93%)',
  '--color-danger': 'hsl(350 72% 50%)',
  '--color-accent': 'hsl(350 72% 50%)',
  '--color-accent-soft': 'hsl(350 80% 96%)',
  '--font-sans': "'Geist Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  '--font-display': "'Geist Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as React.CSSProperties

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '28', label: '28 days' },
  { value: '90', label: '90 days' },
]
const SHOW_TEST_KEY = 'bh-admin-show-test'

function Dashboard({ token, onOut }: { token?: string; onOut: () => void }) {
  const [raw, setRaw] = useState<Data>()
  const [ops, setOps] = useState<OpsData>()
  const [chats, setChats] = useState<ChatRow[]>()
  const [loading, setLoading] = useState(false)
  const [screen, setScreen] = useState<Screen>('overview')
  const [personKey, setPersonKey] = useState<string>()
  const [physioId, setPhysioId] = useState<string>()
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState<Period>('28')
  const [showTest, setShowTest] = useState(() => {
    try {
      return localStorage.getItem(SHOW_TEST_KEY) === '1'
    } catch {
      return false
    }
  })

  const load = useCallback(async () => {
    if (!apiMode) return
    setLoading(true)
    try {
      const [d, o, c] = await Promise.all([
        api<Data>('/admin/dashboard', { token }),
        api<OpsData>('/admin/overview', { token }),
        api<{ chats: ChatRow[] }>('/admin/pain-chats', { token }).catch(() => undefined),
      ])
      setRaw(d)
      setOps(o)
      setChats(c?.chats)
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

  // Test numbers stay in the data; they're only left out of what's shown unless the switch is on.
  const d = useMemo<Data | undefined>(() => {
    if (!raw || showTest) return raw
    const people = raw.people.filter((p) => !p.test)
    const physios = raw.physios.filter((x) => !x.test)
    const keys = new Set(people.map((p) => p.key))
    const ph = new Set(physios.map((x) => x.id))
    const mine = (who: string | null) => !!who && keys.has(who)
    return {
      ...raw,
      people,
      physios,
      events: {
        assessments: raw.events.assessments.filter((e) => mine(e.who)),
        sessions: raw.events.sessions.filter((e) => mine(e.who) && ph.has(e.physioId)),
        bookings: raw.events.bookings.filter((e) => (e.who ? mine(e.who) : true) && ph.has(e.physioId)),
        payments: raw.events.payments.filter((e) => (e.who ? mine(e.who) : true) && ph.has(e.physioId)),
        anonymous: raw.events.anonymous,
      },
    }
  }, [raw, showTest])
  const testCount = raw ? raw.people.filter((p) => p.test).length + raw.physios.filter((x) => x.test).length : 0

  const go = (s: Screen) => {
    setScreen(s)
    setPersonKey(undefined)
    setPhysioId(undefined)
    window.scrollTo(0, 0)
  }
  const openPerson = (p: Person) => {
    setPhysioId(undefined)
    setPersonKey(p.key)
    window.scrollTo(0, 0)
  }
  const openPhysio = (x: PhysioRow) => {
    setPersonKey(undefined)
    setPhysioId(x.id)
    window.scrollTo(0, 0)
  }
  const toggleTest = () => {
    const v = !showTest
    setShowTest(v)
    try {
      localStorage.setItem(SHOW_TEST_KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const assign = async (p: Patient, id: string) => {
    try {
      await api(`/admin/patients/${p.id}/assign`, { body: { physioId: id }, token })
      toast(`${p.name} assigned`)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t assign')
    }
  }
  const verify = async (id: string, status: 'verified' | 'none') => {
    try {
      await api(`/admin/physios/${id}/verification`, { body: { status }, token })
      toast(status === 'verified' ? 'Verified' : 'Verification removed')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t update verification')
    }
  }

  if (!apiMode) return <p className="mx-auto max-w-md p-10 text-center text-muted">The admin dashboard needs the live API. Run the app with VITE_API_URL set.</p>
  if (!d || !raw)
    return (
      <div className="grid min-h-full place-items-center" style={ADMIN_THEME}>
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )

  // A profile looks the person up in the full data, so a test number can still be opened (and unmarked).
  const person = personKey ? raw.people.find((p) => p.key === personKey) : undefined
  const physio = physioId ? raw.physios.find((x) => x.id === physioId) : undefined
  const t = todo(d.people, d.physios)
  const todoCount = t.waiting.length + t.redFlag.length + t.leads.length + t.quiet.length + t.verify.length
  type Nav = { key: Screen; label: string; icon: React.ReactNode; n?: number; alert?: boolean; hint: string }
  const NAV: Nav[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} />, hint: 'Is it working?' },
    { key: 'people', label: 'People', icon: <Users size={16} />, n: d.people.length, hint: 'Every consumer, once each' },
    { key: 'physios', label: 'Physios', icon: <Stethoscope size={16} />, n: d.physios.length, hint: 'Supply and verification' },
    { key: 'todo', label: 'To-do', icon: <ClipboardCheck size={16} />, n: todoCount, alert: todoCount > 0, hint: 'What to act on today' },
    ...(chats ? [{ key: 'chats' as const, label: 'Pain chats', icon: <MessageCircleHeart size={16} />, n: chats.length, hint: 'Conversations with the pain assistant' }] : []),
  ]
  const onList = !person && !physio
  const searchable = onList && (screen === 'people' || screen === 'physios' || screen === 'chats')
  const periodic = onList && (screen === 'overview' || screen === 'physios' || screen === 'chats')
  const asOf = new Date(d.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const navButton = (n: Nav, pill = false) => (
    <button
      key={n.key}
      onClick={() => go(n.key)}
      title={n.hint}
      aria-current={screen === n.key && onList ? 'page' : undefined}
      className={cx(
        'flex items-center gap-2.5 text-[14px] cursor-pointer',
        pill ? 'h-8 shrink-0 rounded-full border px-3' : 'h-9 w-full rounded-md px-2',
        screen === n.key ? (pill ? 'border-brand bg-brand text-white' : 'bg-track font-medium text-ink') : pill ? 'border-line bg-surface text-muted' : 'text-muted hover:bg-track/60 hover:text-ink',
      )}
    >
      {n.icon}
      <span className="truncate">{n.label}</span>
      {n.n !== undefined && !pill && <span className={cx('ml-auto rounded-full px-1.5 text-[12px] font-medium tabular-nums', n.alert ? 'bg-warn-soft text-warn' : 'text-faint')}>{n.n}</span>}
    </button>
  )

  return (
    <div className="flex min-h-full bg-bg font-sans text-ink" style={ADMIN_THEME}>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Logo tag="Admin" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5" aria-label="Main">
          {NAV.map((n) => navButton(n))}
        </nav>
        <button onClick={onOut} className="m-3 flex h-9 items-center gap-2 rounded-md px-2 text-[14px] text-muted cursor-pointer hover:bg-track/60 hover:text-danger">
          <LogOut size={16} /> Sign out
        </button>
      </aside>

      <div className="min-w-0 flex-1 overflow-x-clip">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
          <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
            <div className="lg:hidden">
              <Logo tag="Admin" />
            </div>
            {searchable && (
              <label className="flex h-9 w-full items-center gap-2 rounded-md border border-line bg-surface px-3 text-[14px] sm:w-[300px]">
                <Search size={15} className="shrink-0 text-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, city, tag" aria-label="Search" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" />
              </label>
            )}
            <div className="flex-1" />
            {periodic && <Segmented label="Period" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />}
            <label className="flex h-8 items-center gap-2 text-[14px] text-muted" title="Team test numbers are left out of every number unless this is on. Nothing is deleted.">
              <input type="checkbox" checked={showTest} onChange={toggleTest} className="h-4 w-4 accent-[var(--color-brand)]" />
              Show test accounts{testCount ? ` (${testCount})` : ''}
            </label>
            <button onClick={load} aria-label="Refresh" title={`Data as of ${asOf}. Click to refresh.`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[12px] text-muted cursor-pointer hover:text-ink">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">As of {asOf}</span>
            </button>
            <button onClick={onOut} aria-label="Sign out" className="grid h-8 w-8 place-items-center rounded-md border border-line bg-surface text-muted cursor-pointer hover:text-danger lg:hidden">
              <LogOut size={15} />
            </button>
          </div>
          <nav className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden" aria-label="Main">
            {NAV.map((n) => navButton(n, true))}
          </nav>
        </header>

        <main key={`${screen}-${personKey ?? ''}-${physioId ?? ''}`} className="anim-page mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6 sm:px-6">
          {person ? (
            <PersonScreen p={person} token={token} onBack={() => setPersonKey(undefined)} onChanged={load} />
          ) : physio ? (
            <PhysioScreen x={physio} people={raw.people} bookings={raw.events.bookings} token={token} onBack={() => setPhysioId(undefined)} onChanged={load} openPerson={openPerson} />
          ) : (
            <>
              {!showTest && testCount > 0 && screen !== 'chats' && (
                <p className="rounded-md border border-line bg-surface px-3 py-2 text-[12px] text-muted">
                  {testCount} test number{testCount === 1 ? ' is' : 's are'} hidden from these numbers. Tick “Show test accounts” to include {testCount === 1 ? 'it' : 'them'}.
                </p>
              )}
              {screen === 'overview' && <OverviewScreen d={d} period={period} go={go} />}
              {screen === 'people' && <PeopleScreen people={d.people} q={q} open={openPerson} />}
              {screen === 'physios' && <PhysiosScreen d={d} q={q} period={period} open={openPhysio} />}
              {screen === 'todo' && <TodoScreen d={d} ops={ops} openPerson={openPerson} openPhysio={openPhysio} assign={assign} verify={verify} />}
              {screen === 'chats' && chats && <PainChatsPage chats={chats} period={period} q={q} token={token} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

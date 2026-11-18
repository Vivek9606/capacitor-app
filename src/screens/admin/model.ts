/**
 * The admin dashboard's definitions, in one place. Every screen counts from these, so a number means the same thing
 * wherever it appears. Data comes from GET /admin/dashboard (capacitor-app-backend src/routes/adminDashboard.ts).
 */

export const STEP_KEYS = ['details', 'assessed', 'account', 'matched', 'booked', 'plan', 'exercised', 'improved'] as const
export type StepKey = (typeof STEP_KEYS)[number]

/** The eight steps every consumer moves through, with the one-line definition shown next to every count. */
export const STEPS: Record<StepKey, { label: string; short: string; info: string }> = {
  details: { label: 'Gave their details', short: 'Details', info: 'Left a name and phone number on the website, or has an account (signed up, or added by a physio).' },
  assessed: { label: 'Took an assessment', short: 'Assessment', info: 'Finished at least one assessment, on the website or in the app.' },
  account: { label: 'Created an account', short: 'Account', info: 'Verified their phone number with a WhatsApp code, or was added by their physio.' },
  matched: { label: 'Matched with a physio', short: 'Physio', info: 'Has a physio: chosen by an admin, through a physio’s invite link, or added by the physio.' },
  booked: { label: 'Booked a visit', short: 'Booked', info: 'Has at least one booking (consult or treatment), whoever made it.' },
  plan: { label: 'Got a care plan', short: 'Plan', info: 'Their physio sent them a care plan.' },
  exercised: { label: 'Did their exercises', short: 'Exercised', info: 'Logged at least one exercise session from their care plan.' },
  improved: { label: 'Improved or discharged', short: 'Improved', info: 'Pain dropped by 2 or more points from their first session, or their physio discharged them.' },
}

export type Source = 'website' | 'app' | 'physio'
export const SOURCE_LABEL: Record<Source, string> = { website: 'Website', app: 'App', physio: 'Added by a physio' }
export const SOURCE_INFO = 'Website: their first contact was a form or assessment on betterhood.in (or they signed up there). App: signed up in the app. Added by a physio: a physio added them as a patient.'

export interface Person {
  /** Patient id, or "web:<phone>" for someone who only used the website. */
  key: string
  kind: 'account' | 'website'
  patientId?: string
  name: string
  phone: string
  email?: string
  city?: string
  test: boolean
  /** The same number has a physio account (often a physio trying the consumer side). */
  alsoPhysio: boolean
  source: Source
  steps: Record<StepKey, string | null>
  lastActiveAt: string
  lastSessionAt: string | null
  dischargedAt: string | null
  physioId?: string
  physioName?: string
  matchStatus?: string
  consent: boolean
  latest?: { title: string; result: string | null; area: string; painScore: number | null; redFlag: boolean; reasons: string[]; at: string | null; source: string }
  counts: { assessments: number; websiteSubmissions: number; unverifiedSubmissions: number; bookings: number; plans: number; sessions: number }
  pain?: { first: number; last: number }
  paid: number
  submissionIds: string[]
  tags: string[]
  notes: number
}

export interface PhysioRow {
  id: string
  name: string
  phone: string
  email?: string
  place?: string
  focusAreas: string[]
  verification: string
  setup: Record<string, boolean>
  setupDone: number
  setupTotal: number
  createdAt: string
  lastActiveAt?: string
  daysSinceActive: number | null
  listing?: { status: string; url: string; publishedAt?: string }
  patients: number
  activePatients: number
  discharged: number
  plans: number
  activePlans: number
  bookings: number
  publicBookings: number
  invoices: number
  paidTotal: number
  unpaidTotal: number
  wasReferred: boolean
  referrals: number
  test: boolean
  tags: string[]
  notes: number
}

export interface Dashboard {
  generatedAt: string
  people: Person[]
  physios: PhysioRow[]
  events: {
    assessments: { at: string; who: string; source: string; area: string; kind: string; redFlag: boolean }[]
    sessions: { at: string; who: string; physioId: string }[]
    bookings: { at: string; who: string | null; physioId: string }[]
    payments: { at: string; who: string | null; physioId: string; amount: number }[]
    anonymous: { at: string; kind: string }[]
  }
  testPhones: string[]
}

// ---------- time ----------
export const DAY = 86_400_000
export type Period = '7' | '28' | '90'
export const PERIOD_LABEL: Record<Period, string> = { '7': 'last 7 days', '28': 'last 28 days', '90': 'last 90 days' }
/** [start, end) of the current period and the one before it, in ms. */
export function windows(p: Period, now = Date.now()) {
  const n = Number(p) * DAY
  return { cur: [now - n, now + 1] as const, prev: [now - 2 * n, now - n] as const }
}
export const within = (ts: string | null | undefined, [a, b]: readonly [number, number]) => {
  if (!ts) return false
  const t = new Date(ts).getTime()
  return t >= a && t < b
}
export const daysSince = (ts?: string | null) => (ts ? Math.floor((Date.now() - new Date(ts).getTime()) / DAY) : Infinity)

// ---------- one person ----------
/** The furthest step reached (people can skip steps: a physio-added patient never took an assessment). */
export function furthest(p: Person): StepKey {
  for (let i = STEP_KEYS.length - 1; i >= 0; i--) if (p.steps[STEP_KEYS[i]]) return STEP_KEYS[i]
  return 'details'
}
export const stepsDone = (p: Person) => STEP_KEYS.filter((k) => p.steps[k]).length

export type Activity = 'active' | 'quiet' | 'inactive' | 'discharged'
export const ACTIVITY: Record<Activity, { label: string; tone: 'ok' | 'warn' | 'muted' | 'brand'; info: string }> = {
  active: { label: 'Active this week', tone: 'ok', info: 'Did something in the last 7 days.' },
  quiet: { label: 'Quiet 1–4 weeks', tone: 'warn', info: 'Last did something 8 to 30 days ago.' },
  inactive: { label: 'Inactive 30+ days', tone: 'muted', info: 'Nothing for more than 30 days.' },
  discharged: { label: 'Discharged', tone: 'brand', info: 'Their physio discharged them.' },
}
export function activity(lastActiveAt?: string | null, dischargedAt?: string | null): Activity {
  if (dischargedAt) return 'discharged'
  const d = daysSince(lastActiveAt)
  return d <= 7 ? 'active' : d <= 30 ? 'quiet' : 'inactive'
}

// ---------- what needs someone's attention (the To-do screen) ----------
export const TODO = {
  waiting: { label: 'Waiting for a physio', info: 'Has an account and no physio yet.' },
  redFlag: { label: 'Critical advisory to follow up', info: 'Their latest assessment showed the critical advisory (answers that need a doctor first) and they haven’t booked a visit.' },
  leads: { label: 'Website leads to call', info: 'Gave their phone number on the website in the last 30 days and haven’t created an account.' },
  quiet: { label: 'Stopped exercising', info: 'Has an active care plan and no exercise session in the last 7 days.' },
  verify: { label: 'Physios asking to be verified', info: 'Sent their council registration and qualification for review.' },
} as const
export function todo(people: Person[], physios: PhysioRow[]) {
  return {
    waiting: people.filter((p) => p.kind === 'account' && !p.physioId && !p.dischargedAt),
    redFlag: people.filter((p) => p.latest?.redFlag && !p.steps.booked && !p.dischargedAt),
    leads: people.filter((p) => p.kind === 'website' && daysSince(p.steps.details) <= 30),
    quiet: people.filter((p) => p.steps.plan && !p.dischargedAt && daysSince(p.lastSessionAt ?? p.steps.plan) > 7),
    verify: physios.filter((x) => x.verification === 'pending'),
  }
}
// ---------- counting ----------
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
/** One value per day for the last `days` days (oldest first) from dated items. */
export function daily(items: { at: string; v?: number }[], days: number, now = Date.now()) {
  const out = Array<number>(days).fill(0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  for (const it of items) {
    const i = days - 1 - Math.floor((end.getTime() - new Date(it.at).getTime()) / DAY)
    if (i >= 0 && i < days) out[i] += it.v ?? 1
  }
  return out
}
export function dayLabels(days: number, now = Date.now()) {
  return Array.from({ length: days }, (_, i) => new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10))
}

export const fmtPhone = (p?: string) => (p && p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : (p ?? ''))
export const waLink = (phone: string) => `https://wa.me/91${phone}`

/** CSV download of rows (first row = headers). */
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

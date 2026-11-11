import type { NewAssessmentInput } from './store'
import type { Assessment } from './types'
import { site, type SiteAssessmentResult } from './web'

// The betterhood.in assessments, as listed in the app. Only what the picker shows lives here: the questions,
// logic, scoring and result pages are the website's (betterhood-website-revamp, AssessmentRunner), which the
// app opens in an in-app frame. There is one assessment flow, not a copy.
export type AreaKey = 'back' | 'neck' | 'shoulder' | 'knee'
export type Kind = Assessment['kind']

export interface AssessmentInfo {
  slug: string
  kind: Kind
  area: AreaKey | 'overall'
  title: string
  blurb: string
}

export const ASSESSMENTS: AssessmentInfo[] = [
  { slug: 'assessment-lower-back-pain', kind: 'pain', area: 'back', title: 'Lower back pain', blurb: 'Stiffness, aches or pain in the lower back' },
  { slug: 'assessment-neck-pain-level-1', kind: 'pain', area: 'neck', title: 'Neck pain', blurb: 'Stiff neck, pain turning your head, tension' },
  { slug: 'assessment-shoulder-pain-level-1', kind: 'pain', area: 'shoulder', title: 'Shoulder pain', blurb: 'Pain lifting your arm, stiffness, clicking' },
  { slug: 'assessment-knee-pain-level-1', kind: 'pain', area: 'knee', title: 'Knee pain', blurb: 'Pain on stairs, swelling, a knee that gives way' },
  { slug: 'assessment-back-health', kind: 'health', area: 'back', title: 'Back health', blurb: 'Strength, balance and mobility of your back' },
  { slug: 'assessment-neck-health-level-2', kind: 'health', area: 'neck', title: 'Neck health', blurb: 'Strength, balance and mobility of your neck' },
  { slug: 'assessment-shoulder-health-level-2', kind: 'health', area: 'shoulder', title: 'Shoulder health', blurb: 'Strength, balance and mobility of your shoulders' },
  { slug: 'assessment-knee-health-level-2', kind: 'health', area: 'knee', title: 'Knee health', blurb: 'Strength, balance and mobility of your knees' },
  { slug: 'assessment-longevity-goals', kind: 'longevity', area: 'overall', title: 'Longevity goals', blurb: 'Set targets for how you want to move at 70+' },
]

export const assessmentBySlug = (slug: string) => ASSESSMENTS.find((a) => a.slug === slug)

/** The website's result page for a pain result (opened in the app via /me/web). */
export const resultPath = (result: string) => `/${result}/`
export const resultUrl = (result: string) => site(resultPath(result))

const round = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : null)

/** The website's result record → the patient's saved assessment. Slug, kind, area and title come from our own list. */
export function toInput(info: AssessmentInfo, r: SiteAssessmentResult): NewAssessmentInput {
  if (info.kind === 'pain') {
    return {
      slug: info.slug,
      kind: 'pain',
      area: info.area,
      title: info.title,
      cat: r.cat,
      condition: r.condition,
      result: r.result,
      advisory: r.advisory ? 'Critical advisory' : undefined,
      totals: Object.fromEntries((r.totals ?? []).map((t) => [t.cat, round(t.score) ?? 0])),
    }
  }
  return {
    slug: info.slug,
    kind: info.kind,
    area: info.area,
    title: info.title,
    totals: {},
    scores: { overall: round(r.overall), strength: round(r.strength), balance: round(r.balance), mobility: round(r.mobility) },
  }
}

// ---------- results taken on the website ----------
// The website's result page links to the app with the result in the URL fragment (#import=<base64url JSON>,
// never sent to a server, no name or contact details). We keep it until the visitor is signed in as a
// patient, then save it to their account (PatientLayout) and open it.
const PENDING_KEY = 'bh_pending_result'

/** Called once at startup: moves an #import=… result into storage and cleans the URL. */
export function captureWebsiteResult() {
  const m = /(?:^#|&)import=([A-Za-z0-9_-]+)/.exec(window.location.hash)
  if (!m) return
  try {
    const json = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))
    const r = JSON.parse(json) as SiteAssessmentResult
    if (r && typeof r.slug === 'string' && assessmentBySlug(r.slug)) localStorage.setItem(PENDING_KEY, JSON.stringify(r))
  } catch {
    /* malformed link: ignore */
  }
  history.replaceState(history.state, '', window.location.pathname + window.location.search)
}

/** The website result waiting to be saved, removed as it is read. */
export function takeWebsiteResult(): { info: AssessmentInfo; result: SiteAssessmentResult } | undefined {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return undefined
    localStorage.removeItem(PENDING_KEY)
    const result = JSON.parse(raw) as SiteAssessmentResult
    const info = assessmentBySlug(result.slug)
    return info ? { info, result } : undefined
  } catch {
    return undefined
  }
}

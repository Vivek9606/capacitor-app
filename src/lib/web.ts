// The betterhood.in website (betterhood-website-revamp) owns the flows the app and the site share:
//  - the assessments (/assessment-*/): questions, logic and scoring;
//  - the physio directory listing (/physio-directory/join/).
// The app opens them in an in-app frame (components/WebFlow.tsx) with ?embed=app, which hides the site's
// header and footer and lets the page and the app talk over postMessage (see the website's src/scripts/embed.ts).

/** e.g. https://betterhood.in (no trailing slash). Set VITE_WEBSITE_URL for staging (e.g. the GitHub Pages URL). */
export const WEBSITE_URL = String(import.meta.env.VITE_WEBSITE_URL || 'https://betterhood.in').replace(/\/$/, '')
export const WEBSITE_ORIGIN = new URL(WEBSITE_URL).origin

/** Absolute URL of a website page, e.g. site('/result-lower-back-pain-nerve/'). */
export const site = (path: string) => `${WEBSITE_URL}${path.startsWith('/') ? path : `/${path}`}`

/** The same page in embed mode, telling it which origin to answer. */
export function embedUrl(path: string): string {
  const u = new URL(site(path))
  u.searchParams.set('embed', 'app')
  u.searchParams.set('origin', window.location.origin)
  return u.toString()
}

/** In-app route that shows a website page (screens/WebPage.tsx). */
export const webRoute = (path: string, title?: string) => `/web?${new URLSearchParams({ p: path, ...(title ? { t: title } : {}) })}`

/** Only site-relative paths may be opened in the frame (no other hosts, no protocol tricks). */
export const isSitePath = (p: string) => /^\/(?!\/)[\w\-./%?=&]*$/.test(p)

/** Messages between the website page and the app. */
export type WebMsg =
  | { type: 'bh:ready'; flow: 'assessment' | 'directory'; slug?: string }
  | { type: 'bh:assessment-result'; result: SiteAssessmentResult }
  | { type: 'bh:directory-published'; slug: string; url: string; status: string; created: boolean }

/** What the website's AssessmentRunner records when someone finishes (same shape as its localStorage "bh_results"). */
export interface SiteAssessmentResult {
  slug: string
  kind: 'pain' | 'health' | 'longevity'
  area: 'back' | 'neck' | 'shoulder' | 'knee' | 'overall'
  title: string
  date: string
  // pain
  cat?: 'muscle' | 'nerve' | 'bone' | 'joint'
  condition?: string
  result?: string
  advisory?: boolean
  totals?: { cat: string; score: number }[]
  // health / longevity (out of 10)
  overall?: number | null
  strength?: number | null
  balance?: number | null
  mobility?: number | null
}

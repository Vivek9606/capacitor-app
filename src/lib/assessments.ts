import type { Assessment } from './types'
import { site } from './web'

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

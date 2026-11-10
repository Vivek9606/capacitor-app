import type { FormDef } from './quizEngine'

/** The website's pain assessments (betterhood.in/quiz-landing-page/), same forms and scoring. */
export type Cat = 'muscle' | 'nerve' | 'bone' | 'joint'
export type AreaKey = 'back' | 'neck' | 'shoulder' | 'knee'

export interface PainAssessment {
  slug: string
  area: AreaKey
  title: string
  blurb: string
  totals: Record<number, Cat>
  results: Record<Cat, string>
  conditions: Record<Cat, string>
}

const T = { 14: 'muscle', 40: 'nerve', 41: 'bone', 42: 'joint' } as const

export const ASSESSMENTS: PainAssessment[] = [
  {
    slug: 'assessment-lower-back-pain', area: 'back', title: 'Lower back pain', blurb: 'Stiffness, aches or pain in the lower back', totals: T,
    results: { muscle: 'result-lower-back-pain-muscle', nerve: 'result-lower-back-pain-nerve', bone: 'result-lower-back-pain-bone-health', joint: 'result-lower-back-pain-joint-health' },
    conditions: { muscle: 'Muscular Imbalance', nerve: 'Nerve Compression', bone: 'Bone Health', joint: 'Joint Health' },
  },
  {
    slug: 'assessment-neck-pain-level-1', area: 'neck', title: 'Neck pain', blurb: 'Stiff neck, pain turning your head, tension', totals: T,
    results: { muscle: 'result-neck-pain-muscular-imbalance-muscle', nerve: 'result-neck-pain-compressed-nerves-nerve', bone: 'result-neck-pain-cervical-instability-bone', joint: 'result-neck-pain-osteoarthritis-joint' },
    conditions: { muscle: 'Muscular Imbalance', nerve: 'Compressed Nerves', bone: 'Cervical Instability', joint: 'Osteoarthritis' },
  },
  {
    slug: 'assessment-shoulder-pain-level-1', area: 'shoulder', title: 'Shoulder pain', blurb: 'Pain lifting your arm, stiffness, clicking', totals: T,
    results: { muscle: 'result-shoulder-pain-rotator-cuff-tendinopathy', nerve: 'result-shoulder-pain-frozen-shoulder-nerve', bone: 'result-shoulder-pain-shoulder-instability-bone', joint: 'result-shoulder-pain-osteoarthritis-in-shoulder-joint' },
    conditions: { muscle: 'Rotator Cuff Tendinopathy', nerve: 'Frozen Shoulder', bone: 'Shoulder Instability', joint: 'Osteoarthritis in Shoulder' },
  },
  {
    slug: 'assessment-knee-pain-level-1', area: 'knee', title: 'Knee pain', blurb: 'Pain on stairs, swelling, a knee that gives way', totals: T,
    results: { muscle: 'result-knee-pain-muscular-imbalance-muscle', nerve: 'result-knee-pain-bursitis-nerve', bone: 'result-knee-pain-patellar-instability-bone', joint: 'result-knee-pain-osteoarthritis-joint' },
    conditions: { muscle: 'Muscular Imbalance', nerve: 'Bursitis', bone: 'Patellar Instability', joint: 'Osteoarthritis' },
  },
]

export const assessmentBySlug = (slug: string) => ASSESSMENTS.find((a) => a.slug === slug)
export const resultUrl = (result: string) => `https://betterhood.in/${result}/`

/** Forms are big, so each one loads only when the patient starts it. */
const loaders = import.meta.glob<FormDef>('../data/forms/*.json', { import: 'default' })
export const loadForm = (slug: string) => loaders[`../data/forms/${slug}.json`]()

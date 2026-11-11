// The condition pages on betterhood.in ("diagnostic pages"): what each likely cause from the pain assessments
// means, what causes it and what helps. The app shows them in an in-app frame (screens/WebPage.tsx).

export type DxArea = 'back' | 'neck' | 'shoulder' | 'knee'

export interface Condition {
  area: DxArea
  cat: 'muscle' | 'nerve' | 'bone' | 'joint'
  title: string
  /** betterhood.in page slug */
  page: string
}

export const DX_AREAS: { key: DxArea; label: string; assessment: string }[] = [
  { key: 'back', label: 'Lower back', assessment: 'assessment-lower-back-pain' },
  { key: 'neck', label: 'Neck', assessment: 'assessment-neck-pain-level-1' },
  { key: 'shoulder', label: 'Shoulder', assessment: 'assessment-shoulder-pain-level-1' },
  { key: 'knee', label: 'Knee', assessment: 'assessment-knee-pain-level-1' },
]

export const CONDITIONS: Condition[] = [
  { area: 'back', cat: 'muscle', title: 'Muscular imbalance', page: 'result-lower-back-pain-muscle' },
  { area: 'back', cat: 'nerve', title: 'Nerve compression', page: 'result-lower-back-pain-nerve' },
  { area: 'back', cat: 'bone', title: 'Bone health', page: 'result-lower-back-pain-bone-health' },
  { area: 'back', cat: 'joint', title: 'Joint health', page: 'result-lower-back-pain-joint-health' },
  { area: 'neck', cat: 'muscle', title: 'Muscular imbalance', page: 'result-neck-pain-muscular-imbalance-muscle' },
  { area: 'neck', cat: 'nerve', title: 'Compressed nerves', page: 'result-neck-pain-compressed-nerves-nerve' },
  { area: 'neck', cat: 'bone', title: 'Cervical instability', page: 'result-neck-pain-cervical-instability-bone' },
  { area: 'neck', cat: 'joint', title: 'Osteoarthritis', page: 'result-neck-pain-osteoarthritis-joint' },
  { area: 'shoulder', cat: 'muscle', title: 'Rotator cuff tendinopathy', page: 'result-shoulder-pain-rotator-cuff-tendinopathy' },
  { area: 'shoulder', cat: 'nerve', title: 'Frozen shoulder', page: 'result-shoulder-pain-frozen-shoulder-nerve' },
  { area: 'shoulder', cat: 'bone', title: 'Shoulder instability', page: 'result-shoulder-pain-shoulder-instability-bone' },
  { area: 'shoulder', cat: 'joint', title: 'Osteoarthritis in the shoulder', page: 'result-shoulder-pain-osteoarthritis-in-shoulder-joint' },
  { area: 'knee', cat: 'muscle', title: 'Muscular imbalance', page: 'result-knee-pain-muscular-imbalance-muscle' },
  { area: 'knee', cat: 'nerve', title: 'Bursitis', page: 'result-knee-pain-bursitis-nerve' },
  { area: 'knee', cat: 'bone', title: 'Patellar instability', page: 'result-knee-pain-patellar-instability-bone' },
  { area: 'knee', cat: 'joint', title: 'Osteoarthritis', page: 'result-knee-pain-osteoarthritis-joint' },
]

/** Reading on betterhood.in/learn, by health concern and by solution. */
export const LEARN_TOPICS: { title: string; sub: string; path: string }[] = [
  { title: 'Back pain', sub: 'Causes, relief and prevention', path: '/learn/by-health-concern/back-pain/' },
  { title: 'Neck pain', sub: 'Stiffness, posture and tech neck', path: '/learn/by-health-concern/neck-pain/' },
  { title: 'Shoulder pain', sub: 'Frozen shoulder, rotator cuff and more', path: '/learn/by-health-concern/shoulder-pain/' },
  { title: 'Knee pain', sub: 'Stairs, swelling and arthritis', path: '/learn/by-health-concern/knee-pain/' },
  { title: 'Joint pain', sub: 'Keeping joints moving well', path: '/learn/by-health-concern/joint-pain/' },
  { title: 'Feet pain', sub: 'Heels, arches and ankles', path: '/learn/by-health-concern/feet-pain/' },
  { title: 'Posture', sub: 'Sit, stand and work better', path: '/learn/by-solution/posture/' },
  { title: 'Recovery', sub: 'Heal well after injury or strain', path: '/learn/by-solution/recovery/' },
  { title: 'Protocols', sub: 'Step-by-step routines from physios', path: '/learn/by-what-inside/protocol/' },
  { title: 'The science', sub: 'How the body heals and adapts', path: '/learn/by-what-inside/science/' },
]

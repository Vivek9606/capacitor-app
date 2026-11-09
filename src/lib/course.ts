// PhysioPreneurship — a short, practical course on running a physiotherapy practice.
// Text lessons for now; each has an action that links into the app where it can be done.

export interface Lesson {
  id: string
  title: string
  minutes: number
  summary: string
  points: string[]
  action: { text: string; to?: string; cta?: string }
}

export interface CourseModule {
  id: string
  title: string
  lessons: Lesson[]
}

export const COURSE = {
  id: 'physiopreneurship',
  title: 'PhysioPreneurship',
  tagline: 'Build a practice that pays you well and treats patients better',
  by: 'Betterhood Academy',
}

export const MODULES: CourseModule[] = [
  {
    id: 'm1',
    title: 'Choose your practice model',
    lessons: [
      {
        id: 'l1',
        title: 'Clinic, home visits or individual practice?',
        minutes: 6,
        summary: 'Each model has a different cost base, reach and ceiling. Most successful physios combine two.',
        points: [
          'Own clinic: highest fixed cost (rent, equipment, staff) but builds a brand and lets you see 8–14 patients a day.',
          'Home visits: no rent, premium fees (often 1.5–2× clinic), but travel caps you at 5–7 visits a day. Cluster visits by area.',
          'Individual / visiting practice: consult at hospitals, gyms, sports clubs or other clinics. Low risk, fast start — negotiate a revenue share (typically 50–70% to you).',
          'A common path: start individual or home-visit, build a patient base, then open a clinic in the area where most of them live.',
        ],
        action: { text: 'Set up how you practise so your booking page shows the right options.', to: '/app/profile/clinic', cta: 'Set practice model' },
      },
      {
        id: 'l2',
        title: 'Find your niche',
        minutes: 5,
        summary: 'A clear focus makes you easier to recommend and lets you charge more.',
        points: [
          'Pick a patient you can describe in one line: “desk workers with back pain”, “runners”, “post-natal mothers”, “knee replacements”.',
          'Your niche decides where you find patients: corporates, running clubs, gynaecologists, orthopaedic surgeons.',
          'Specialists are referred by name. Generalists compete on price.',
        ],
        action: { text: 'Add your focus areas to your profile.', to: '/app/profile/edit', cta: 'Edit focus areas' },
      },
    ],
  },
  {
    id: 'm2',
    title: 'Pricing & packages',
    lessons: [
      {
        id: 'l3',
        title: 'Price on value, not on the clinic next door',
        minutes: 7,
        summary: 'Work out your floor price from costs, then price on the outcome you deliver.',
        points: [
          'Floor price = (monthly costs + the salary you want) ÷ realistic sessions per month. Never go below it.',
          'Home visits should include travel time: a 45-minute visit often takes 90 minutes of your day.',
          'Raise fees for new patients first; give existing patients a month’s notice.',
          'Show your fee upfront on your booking page — it filters out price shoppers before they take a slot.',
        ],
        action: { text: 'Review your consult fees.', to: '/app/profile/clinic', cta: 'Edit fees' },
      },
      {
        id: 'l4',
        title: 'Packages and group classes',
        minutes: 6,
        summary: 'Packages improve completion; groups multiply your hourly income.',
        points: [
          'Sell a plan, not a session: “6 sessions over 3 weeks” matches how recovery actually works, and patients finish it.',
          'Offer a small package discount (5–10%), paid upfront.',
          'Group classes (back care, pre/post-natal, seniors’ balance, knee OA) let 6–10 people pay a lower fee while you earn 3–5× your hourly rate.',
          'Groups are also a low-cost way for new patients to try you.',
        ],
        action: { text: 'Start a weekly group class.', to: '/app/groups/new', cta: 'Create a group session' },
      },
    ],
  },
  {
    id: 'm3',
    title: 'Getting patients',
    lessons: [
      {
        id: 'l5',
        title: 'Referral partners',
        minutes: 6,
        summary: 'Doctors, gyms and other clinicians are your most reliable source of patients.',
        points: [
          'List 10 orthopaedic surgeons, gynaecologists, GPs and sports coaches within 5 km. Visit two a week.',
          'Bring a one-page summary of what you treat and how you report back.',
          'Send the referrer a short progress note after the 1st and last visit — it’s the single best way to get the next referral.',
        ],
        action: { text: 'Invite a fellow physio and grow your network.', to: '/app/refer', cta: 'Refer a physio' },
      },
      {
        id: 'l6',
        title: 'Google, WhatsApp and your booking link',
        minutes: 7,
        summary: 'Most patients search, read reviews, then message. Make every step easy.',
        points: [
          'Claim your Google Business Profile, add photos, hours and your Betterhood booking link.',
          'Ask every patient who finishes a plan for a Google review — send the link on WhatsApp the same day.',
          'Put your booking link in your WhatsApp Business profile, Instagram bio and visiting card.',
          'Post one useful tip a week (a 30-second exercise video works best).',
        ],
        action: { text: 'Share your booking page.', to: '/app/profile', cta: 'Get my link' },
      },
    ],
  },
  {
    id: 'm4',
    title: 'Keeping patients',
    lessons: [
      {
        id: 'l7',
        title: 'Cut no-shows',
        minutes: 5,
        summary: 'Every no-show is lost income and a patient who isn’t getting better.',
        points: [
          'Confirm on WhatsApp when booking and remind 2 hours before — this alone cuts no-shows sharply.',
          'Track show/no-show for every visit. Call anyone with two no-shows.',
          'Have a clear late-cancellation policy and mention it at the first visit.',
          'Fill gaps with walk-ins and a short wait-list.',
        ],
        action: { text: 'Mark today’s visits as show or no-show.', to: '/app/schedule', cta: 'Open schedule' },
      },
      {
        id: 'l8',
        title: 'Plan completion is retention',
        minutes: 5,
        summary: 'Patients who stop early don’t get results — and don’t refer.',
        points: [
          'Explain the full plan and expected timeline at the first visit.',
          'Send a home exercise plan the same day, and check adherence between visits.',
          'Nudge patients who haven’t logged a session in 3 days.',
          'Book the follow-up before the patient leaves.',
        ],
        action: { text: 'Send a care plan to a patient.', to: '/app/patients', cta: 'Open patients' },
      },
    ],
  },
  {
    id: 'm5',
    title: 'Money, compliance & records',
    lessons: [
      {
        id: 'l9',
        title: 'Invoices, payments and cash flow',
        minutes: 6,
        summary: 'Bill for every visit, the same day, and know your numbers each month.',
        points: [
          'Send an invoice on WhatsApp right after the visit, with your UPI ID so patients can pay instantly.',
          'Keep practice money in a separate bank account.',
          'Track three numbers monthly: revenue, collections (what was actually paid) and outstanding.',
          'Keep 3 months of fixed costs as a reserve before you expand.',
        ],
        action: { text: 'Set up invoicing with your UPI ID.', to: '/app/invoices', cta: 'Open invoices' },
      },
      {
        id: 'l10',
        title: 'Consent, records and GST basics',
        minutes: 7,
        summary: 'Good paperwork protects you and your patients.',
        points: [
          'Take written informed consent at the first visit, and separately for dry needling, manipulation and electrotherapy.',
          'Keep a treatment plan and notes for every patient; give patients a copy.',
          'Healthcare services by registered practitioners are generally exempt from GST, but products, wellness and some corporate packages may not be — check with a CA.',
          'Register your clinic under your state’s Clinical Establishments rules where they apply, and display your council registration.',
        ],
        action: { text: 'Take a consent form for your next patient.', to: '/app/patients', cta: 'Choose a patient' },
      },
    ],
  },
  {
    id: 'm6',
    title: 'Scaling up',
    lessons: [
      {
        id: 'l11',
        title: 'Your first hire',
        minutes: 6,
        summary: 'Hire when you’re turning patients away, not before.',
        points: [
          'First hire is usually a front-desk / coordinator — it frees 1–2 hours of your day for patients.',
          'Next, an associate physio on a fixed salary plus a share of what they bill.',
          'Write down how you assess, treat and follow up so the associate delivers the same care.',
        ],
        action: { text: 'Block admin time on your calendar each week.', to: '/app/schedule', cta: 'Block a slot' },
      },
      {
        id: 'l12',
        title: 'Second location and beyond',
        minutes: 6,
        summary: 'Expand where your patients already are.',
        points: [
          'Look at where your home-visit and walk-in patients live — that’s where the next clinic goes.',
          'Start small: a satellite room in a gym or a doctor’s clinic two days a week.',
          'Partnerships (gyms, corporates, housing societies) can bring a steady stream of group and individual patients.',
        ],
        action: { text: 'Explore partnering with Betterhood.', to: '/app/partner', cta: 'Partner with us' },
      },
    ],
  },
]

export const ALL_LESSONS = MODULES.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })))

export function courseProgress(done: string[] = []) {
  const total = ALL_LESSONS.length
  const n = ALL_LESSONS.filter((l) => done.includes(l.id)).length
  return { done: n, total, pct: Math.round((n / total) * 100), next: ALL_LESSONS.find((l) => !done.includes(l.id)) }
}

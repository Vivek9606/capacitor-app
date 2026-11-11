// Domain types. Shaped to map 1:1 onto Supabase tables later
// (physios, patients, exercises, plans, session_logs, bookings, messages, referrals).

export type Role = 'physio' | 'patient' | 'admin'

export type VisitType = 'in_clinic' | 'home_visit' | 'teleconsult'

/** How a physio practises. A physio can do more than one. */
export type PracticeMode = 'clinic' | 'home' | 'individual'

export interface TimeRange {
  start: string // HH:mm
  end: string // HH:mm
}

/** A place an individual (visiting) practitioner consults from: a hospital, gym, partner clinic… */
export interface PracticeLocation {
  id: string
  name: string
  address: string
  days: string[] // 'Mon'..'Sun'
}

export interface Practice {
  modes: PracticeMode[]
  /** Home visits: areas served, e.g. "Indiranagar, Koramangala, HSR". */
  serviceArea?: string
  /** Home visits: travel time kept free before and after each visit. */
  travelBufferMin?: number
  /** Individual practice: where they consult. */
  locations?: PracticeLocation[]
}

/** Calendly-style weekly availability. */
export interface Availability {
  weekly: Record<string, TimeRange[]> // 'Mon'..'Sun' → windows; missing/empty = closed
  slotStepMin: number // start times every N minutes
  bufferMin: number // gap after each appointment
  minNoticeHours: number // patients can't book sooner than this
  maxDaysAhead: number // how far ahead patients can book
}

export interface Billing {
  upiId?: string
  gstin?: string
  invoicePrefix: string
  taxPct: number // 0 = no GST line
  footer?: string
}

export interface Physio {
  id: string
  phone: string // 10-digit Indian mobile, no +91
  name: string
  email?: string
  qualification?: string // e.g. "MPT (Ortho)"
  experienceYrs?: number
  councilRegNo?: string
  verification: 'none' | 'pending' | 'verified'
  photo?: string // data URL in the mock; storage URL with Supabase
  focusAreas: string[]
  practiceSettings: string[]
  slug: string
  clinic?: { name: string; address: string; area: string }
  practice?: Practice
  consult: {
    inClinic: { enabled: boolean; fee: number; minutes: number }
    homeVisit: { enabled: boolean; fee: number; radiusKm: number; minutes?: number }
  }
  workingDays: string[] // 'Mon'..'Sun' (derived from availability when set)
  hours?: { start: string; end: string }
  availability?: Availability
  billing?: Billing
  courseProgress?: string[] // completed lesson ids
  inviteCode: string
  partnerOptIns: string[]
  communityWaitlist: boolean
  communityTopics: string[]
  createdAt: string
}

export interface Patient {
  id: string
  /** Empty for someone who signed up on their own and hasn't been assigned a physio yet. */
  physioId?: string
  phone: string
  name: string
  age?: number
  sex?: 'F' | 'M' | 'O'
  condition?: string
  since?: string // ISO date
  tags: string[]
  visits: number
  linkToken: string // token in the WhatsApp plan link
  consentAt?: string
  createdAt: string
  city?: string
  email?: string
  /** Joined on their own (not added by a physio). */
  selfSignup?: boolean
  /** Physio matching for self-signups: suggested from the assessment, confirmed by an admin. */
  match?: { status: 'pending' | 'suggested' | 'confirmed'; suggestedPhysioId?: string }
}

/** A result from one of the betterhood.in assessments (taken on the website's flow, inside the app). */
export interface Assessment {
  id: string
  patientId: string
  slug: string
  /** pain (level 1) → a likely cause; health (level 2) and longevity → scores out of 10. Older rows: pain. */
  kind: 'pain' | 'health' | 'longevity'
  area: 'back' | 'neck' | 'shoulder' | 'knee' | 'overall'
  title: string
  cat?: 'muscle' | 'nerve' | 'bone' | 'joint'
  condition?: string
  result?: string // betterhood.in result page slug
  advisory?: string
  totals: Record<string, number>
  scores?: { overall?: number | null; strength?: number | null; balance?: number | null; mobility?: number | null }
  createdAt: string
}

export interface Exercise {
  id: string
  name: string
  region: string // Lumbar, Core, Hip, Knee, Shoulder, Neck, Ankle
  category: string // Mobility, Core, Strength, Stretch, Balance
  dose: Dose
  cues: string[]
}

export interface Dose {
  sets: number
  reps: number
  holdSec?: number
  perSide?: boolean
}

export interface PlanItem extends Dose {
  exerciseId: string
  note?: string
}

export interface Rx {
  diagnosis: string
  advice: string
  modalities: string[]
  followUp: '1w' | '2w' | 'custom' | 'none'
  followUpDate?: string
  autoBook: boolean
  letterhead: boolean
}

export interface Plan {
  id: string
  patientId: string
  physioId: string
  title: string
  items: PlanItem[]
  daysPerWeek: number
  weeks: number
  startDate: string // ISO date
  status: 'active' | 'completed' | 'replaced'
  sentAt: string
  openedAt?: string
  rx?: Rx
  /** Edits made to this plan after it was sent, each with the physio's reason. */
  changes?: PlanChange[]
  updatedAt?: string
}

export interface PlanChange {
  at: string
  reason: string
  summary: string[]
}

export interface SessionLog {
  id: string
  planId: string
  date: string // YYYY-MM-DD
  status: 'done' | 'skipped'
  pain?: number // 0-10
  note?: string
}

export type BookingStatus =
  | 'requested'
  | 'awaiting'
  | 'confirmed'
  | 'reminder_sent'
  | 'reschedule'
  | 'checked_in' // patient has arrived (showed up) / walk-in waiting
  | 'cancelled'
  | 'done'
  | 'no_show'

export type BookingSource = 'physio' | 'public_profile' | 'walk_in'

export interface Booking {
  id: string
  physioId: string
  patientId?: string
  patientName: string
  patientPhone: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  visitType: VisitType
  minutes?: number // defaults to the visit type's length
  reason?: string
  address?: string // home visits
  isNewPatient: boolean
  status: BookingStatus
  sendConfirmation: boolean
  reminder: boolean
  source: BookingSource
  checkedInAt?: string
  createdAt: string
  /** Someone else's slot, shown to patients only as "busy". */
  hidden?: boolean
}

/** Time the physio has taken off the calendar (leave, lunch, admin). No start = whole day. */
export interface Block {
  id: string
  physioId: string
  date: string // YYYY-MM-DD
  start?: string
  end?: string
  reason?: string
}

export type GroupParticipantStatus = 'booked' | 'attended' | 'no_show' | 'cancelled'

export interface GroupParticipant {
  id: string
  patientId?: string
  name: string
  phone: string
  status: GroupParticipantStatus
  joinedAt: string
}

export interface GroupSession {
  id: string
  physioId: string
  seriesId?: string // weekly repeats share a series
  title: string
  description?: string
  date: string
  time: string
  minutes: number
  capacity: number
  fee: number
  location: string
  publicBooking: boolean // shown on the public booking page
  status: 'scheduled' | 'cancelled' | 'done'
  participants: GroupParticipant[]
  createdAt: string
}

export interface InvoiceItem {
  description: string
  qty: number
  rate: number
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank' | 'other'

export interface Invoice {
  id: string
  physioId: string
  patientId?: string
  patientName: string
  patientPhone: string
  number: string
  date: string
  items: InvoiceItem[]
  discount: number
  taxPct: number
  total: number
  status: 'unpaid' | 'paid' | 'void'
  method?: PaymentMethod
  paidAt?: string
  notes?: string
  bookingId?: string
  groupSessionId?: string
  sentAt?: string
  createdAt: string
}

export interface Consent {
  id: string
  physioId: string
  patientId: string
  formId: string
  title: string
  body: string // the exact text the patient agreed to
  status: 'pending' | 'signed' | 'declined' | 'revoked'
  method: 'in_clinic' | 'remote'
  signedName?: string
  signature?: string // PNG data URL
  guardian?: string // signed by a parent/guardian on behalf of a minor
  requestedAt: string
  signedAt?: string
}

export interface Message {
  id: string
  physioId: string
  patientId: string
  from: Role
  text: string
  at: string
  read: boolean
}

export interface Referral {
  id: string
  referrerId: string
  name: string
  status: 'pending' | 'joined' | 'activated'
  at: string
}

export interface PlanDraft {
  patientId: string
  items: PlanItem[]
  daysPerWeek: number
  weeks: number
  title: string
  rx: Rx
  /** Set when adjusting the active plan: saving edits that plan instead of sending a new one. */
  editPlanId?: string
}

export interface DB {
  physios: Physio[]
  patients: Patient[]
  exercises: Exercise[]
  plans: Plan[]
  sessions: SessionLog[]
  bookings: Booking[]
  messages: Message[]
  referrals: Referral[]
  templates: PlanTemplate[]
  blocks: Block[]
  groups: GroupSession[]
  invoices: Invoice[]
  consents: Consent[]
  assessments: Assessment[]
  draft?: PlanDraft
}

export interface PlanTemplate {
  id: string
  physioId: string
  title: string
  items: PlanItem[]
  daysPerWeek: number
  weeks: number
}

export interface Session {
  role: Role
  userId: string // physio id or patient id
  token?: string // API session token (API mode only)
}

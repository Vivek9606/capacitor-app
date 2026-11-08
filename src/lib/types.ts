// Domain types. Shaped to map 1:1 onto Supabase tables later
// (physios, patients, exercises, plans, session_logs, bookings, messages, referrals).

export type Role = 'physio' | 'patient'

export type VisitType = 'in_clinic' | 'home_visit' | 'teleconsult'

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
  consult: {
    inClinic: { enabled: boolean; fee: number; minutes: number }
    homeVisit: { enabled: boolean; fee: number; radiusKm: number }
  }
  workingDays: string[] // 'Mon'..'Sun'
  hours?: { start: string; end: string }
  inviteCode: string
  partnerOptIns: string[]
  communityWaitlist: boolean
  communityTopics: string[]
  createdAt: string
}

export interface Patient {
  id: string
  physioId: string
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
}

export interface SessionLog {
  id: string
  planId: string
  date: string // YYYY-MM-DD
  status: 'done' | 'skipped'
  pain?: number // 0-10
  note?: string
}

export type BookingStatus = 'requested' | 'awaiting' | 'confirmed' | 'reminder_sent' | 'reschedule' | 'cancelled' | 'done'

export interface Booking {
  id: string
  physioId: string
  patientId?: string
  patientName: string
  patientPhone: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  visitType: VisitType
  reason?: string
  isNewPatient: boolean
  status: BookingStatus
  sendConfirmation: boolean
  reminder: boolean
  source: 'physio' | 'public_profile'
  createdAt: string
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

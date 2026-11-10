import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, ApiError, apiMode } from './api'
import { addDays, nowTs, today } from './dates'
import { slugify, uid } from './logic'
import { toast } from './platform'
import { DEMO, seed } from './seed'
import { formById } from './consents'
import { nextInvoiceNumber, totals } from './invoices'
import { nowHHMM } from './slots'
import { suggestPhysio } from './match'
import type { Assessment, Block, Booking, Consent, DB, GroupParticipant, GroupParticipantStatus, GroupSession, Invoice, Patient, Physio, PlanDraft, Role, Session, SessionLog } from './types'

/**
 * App data layer. Screens read `db` synchronously and call actions; each action updates local
 * state immediately (optimistic) and, in API mode (VITE_API_URL set), sends the change to the
 * Betterhood API in order. If a write fails we show the error and reload from the server.
 * Without VITE_API_URL the app runs fully offline on seeded demo data in localStorage.
 */

const DB_KEY = apiMode ? 'bh-cache-v2' : 'bh-demo-db-v4'
const SESSION_KEY = apiMode ? 'bh-auth-v1' : 'bh-session-v1'

const EMPTY: DB = { physios: [], patients: [], exercises: [], plans: [], sessions: [], bookings: [], messages: [], referrals: [], templates: [], blocks: [], groups: [], invoices: [], consents: [], assessments: [] }

function load<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

function save(key: string, value: unknown) {
  try {
    if (value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode) – app still works in memory */
  }
}

export interface NewPhysioInput {
  phone: string
  name: string
  email?: string
  focusAreas: string[]
  practiceSettings: string[]
  practice?: Physio['practice']
  referredBy?: string
  signupToken?: string
}

export interface WalkInInput {
  patientId?: string
  name: string
  phone: string
  visitType: Booking['visitType']
  reason?: string
}

export type NewInvoiceInput = Omit<Invoice, 'id' | 'number' | 'total' | 'createdAt' | 'physioId'> & { send?: boolean }

export interface NewPatientInput {
  name: string
  phone: string
  age?: number
  sex?: Patient['sex']
  condition?: string
}

export interface NewSelfPatientInput {
  phone: string
  name: string
  age?: number
  sex?: Patient['sex']
  city?: string
  signupToken?: string
}

export type NewAssessmentInput = Omit<Assessment, 'id' | 'patientId' | 'createdAt'>

export type OtpResult = { role: Role } | { signup: true; signupToken?: string }

interface Bootstrap {
  session: Session
  db: DB
}

type Coll = 'physios' | 'patients' | 'plans' | 'sessions' | 'bookings' | 'messages' | 'referrals' | 'templates' | 'blocks' | 'groups' | 'invoices' | 'consents' | 'assessments'

interface Ctl {
  setDb: (fn: (d: DB) => DB) => void
  setSession: (s: Session | undefined) => void
  /** Queue a server write (runs in order, after earlier writes). */
  remote: (fn: (token: string) => Promise<unknown>) => void
  refresh: (token?: string) => Promise<void>
}

function makeStore(db: DB, session: Session | undefined, ctl: Ctl) {
  const { setDb, setSession, remote, refresh } = ctl
  const mutate = (fn: (d: DB) => void) =>
    setDb((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  /** Merge a server copy of a record into local state. */
  const put = <T extends { id: string }>(coll: Coll, row: T, match: (x: any) => boolean = (x) => x.id === row.id) =>
    mutate((d) => {
      const list = d[coll] as unknown as T[]
      const i = list.findIndex(match)
      if (i >= 0) list[i] = { ...list[i], ...row }
      else list.push(row)
    })
  const role = session?.role
  const lookupPhone = (phone: string): { role: Role; id: string } | undefined => {
    const ph = db.physios.find((p) => p.phone === phone)
    if (ph) return { role: 'physio', id: ph.id }
    const pt = db.patients.find((p) => p.phone === phone)
    if (pt) return { role: 'patient', id: pt.id }
    return undefined
  }

  const startSession = async (s: Session) => {
    if (apiMode && s.token) {
      await refresh(s.token) // loads data before we navigate into the app
    }
    setSession(s)
  }

  const self = {
    db,
    session,
    apiMode,

    // ---------- auth ----------
    lookupPhone,
    async requestOtp(phone: string): Promise<void> {
      if (apiMode) await api('/auth/otp/request', { body: { phone } })
    },
    /** Verifies the code. Existing user → logged in. New number → go to sign-up. */
    async verifyOtp(phone: string, code: string): Promise<OtpResult> {
      if (!apiMode) {
        if (code !== DEMO.otp) throw new ApiError(400, 'otp_invalid', 'That code didn’t match. Check WhatsApp and try again.')
        const found = lookupPhone(phone)
        if (!found) return { signup: true }
        setSession({ role: found.role, userId: found.id })
        return { role: found.role }
      }
      const r = await api<{ token?: string; role?: Role; userId?: string; signupToken?: string }>('/auth/otp/verify', { body: { phone, code } })
      if (r.signupToken) return { signup: true, signupToken: r.signupToken }
      await startSession({ role: r.role!, userId: r.userId!, token: r.token })
      return { role: r.role! }
    },
    /** Patient opens /plan/:token and confirms the last 4 digits of their number. */
    async verifyPlanLink(token: string, last4: string): Promise<{ consentGiven: boolean }> {
      if (!apiMode) {
        const p = db.patients.find((x) => x.linkToken === token)
        if (!p || p.phone.slice(-4) !== last4) throw new ApiError(400, 'link_mismatch', 'Those digits don’t match the number this plan was sent to.')
        setSession({ role: 'patient', userId: p.id })
        return { consentGiven: !!p.consentAt }
      }
      const r = await api<{ token: string; userId: string; consentGiven: boolean }>('/auth/plan-link/verify', { body: { token, last4 } })
      await startSession({ role: 'patient', userId: r.userId, token: r.token })
      return { consentGiven: r.consentGiven }
    },
    login(s: Session) {
      setSession(s)
    },
    logout() {
      setSession(undefined)
      if (apiMode) setDb(() => EMPTY)
    },
    async signupPhysio(input: NewPhysioInput): Promise<string> {
      if (apiMode) {
        const r = await api<{ token: string; userId: string }>('/auth/signup', {
          body: { signupToken: input.signupToken, name: input.name, email: input.email || undefined, focusAreas: input.focusAreas, practiceSettings: input.practiceSettings, practice: input.practice, referredBy: input.referredBy },
        })
        await startSession({ role: 'physio', userId: r.userId, token: r.token })
        return r.userId
      }
      const id = uid('ph')
      const base = slugify(input.name) || 'physio'
      const slug = db.physios.some((p) => p.slug === base) ? `${base}-${id.slice(-3)}` : base
      const physio: Physio = {
        id,
        phone: input.phone,
        name: input.name.startsWith('Dr') ? input.name : `Dr. ${input.name}`,
        email: input.email || undefined,
        verification: 'none',
        focusAreas: input.focusAreas,
        practiceSettings: input.practiceSettings,
        practice: input.practice,
        slug,
        consult: {
          inClinic: { enabled: !input.practice || input.practice.modes.some((m) => m !== 'home'), fee: 600, minutes: 45 },
          homeVisit: { enabled: !!input.practice?.modes.includes('home'), fee: 1000, radiusKm: 5, minutes: 60 },
        },
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        inviteCode: `${(input.name.replace(/^Dr\.?\s*/i, '').split(' ')[0] || 'PHYSIO').toUpperCase().slice(0, 8)}-BH`,
        partnerOptIns: [],
        communityWaitlist: false,
        communityTopics: [],
        createdAt: nowTs(),
      }
      mutate((d) => {
        d.physios.push(physio)
        if (input.referredBy) {
          const ref = d.physios.find((p) => p.inviteCode === input.referredBy)
          if (ref) d.referrals.push({ id: uid('rf'), referrerId: ref.id, name: physio.name, status: 'joined', at: nowTs() })
        }
      })
      setSession({ role: 'physio', userId: id })
      return id
    },

    /** A patient joining on their own, without a physio. They take an assessment next. */
    async signupPatient(input: NewSelfPatientInput): Promise<string> {
      if (apiMode) {
        const r = await api<{ token: string; userId: string; role: Role }>('/auth/signup-patient', {
          body: { signupToken: input.signupToken, name: input.name, age: input.age, sex: input.sex, city: input.city || undefined },
        })
        await startSession({ role: r.role, userId: r.userId, token: r.token })
        return r.userId
      }
      const id = uid('pt')
      mutate((d) => {
        d.patients.push({
          id,
          phone: input.phone,
          name: input.name,
          age: input.age,
          sex: input.sex,
          city: input.city || undefined,
          since: today(),
          tags: [],
          visits: 0,
          linkToken: `self-${id.slice(-6)}`,
          consentAt: nowTs(),
          createdAt: nowTs(),
          selfSignup: true,
          match: { status: 'pending' },
        })
      })
      setSession({ role: 'patient', userId: id })
      return id
    },

    /** Save an assessment result. Someone without a physio gets one suggested for the admin to confirm. */
    saveAssessment(patientId: string, input: NewAssessmentInput): string {
      const id = uid('as')
      mutate((d) => {
        d.assessments.push({ ...input, id, patientId, createdAt: nowTs() })
        const p = d.patients.find((x) => x.id === patientId)
        if (p && !p.physioId && p.match?.status !== 'confirmed') {
          const sug = suggestPhysio(d, input.cat, p.city)
          p.match = sug ? { status: 'suggested', suggestedPhysioId: sug } : { status: 'pending' }
          p.condition ??= input.condition
        }
      })
      remote(async (token) => {
        const r = await api<{ assessment: Assessment; patient: Patient }>('/patient/assessments', { body: { id, ...input }, token })
        put('assessments', r.assessment)
        put('patients', r.patient)
      })
      return id
    },

    /** Demo mode only: the admin dashboard confirms a physio (API mode calls the admin endpoint itself). */
    adminAssignDemo(patientId: string, physioId: string) {
      mutate((d) => {
        const p = d.patients.find((x) => x.id === patientId)
        if (p) {
          p.physioId = physioId
          p.match = { status: 'confirmed', suggestedPhysioId: physioId }
        }
      })
    },

    // ---------- physio ----------
    updatePhysio(id: string, patch: Partial<Physio>) {
      mutate((d) => {
        const p = d.physios.find((x) => x.id === id)
        if (p) Object.assign(p, patch)
      })
      // Explicitly cleared fields (undefined) are sent as null.
      const body = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === undefined ? null : v]))
      remote((token) => api('/physio/me', { method: 'PATCH', body, token }).then((row: any) => put('physios', row)))
    },

    // ---------- patients ----------
    addPatient(physioId: string, input: NewPatientInput): string {
      const existing = db.patients.find((p) => p.phone === input.phone && p.physioId === physioId)
      if (existing) return existing.id
      // Someone who signed up on their own: this physio takes them on (keeps their assessments).
      const solo = db.patients.find((p) => p.phone === input.phone && !p.physioId)
      if (solo) {
        mutate((d) => {
          const p = d.patients.find((x) => x.id === solo.id)!
          p.physioId = physioId
          p.match = { status: 'confirmed' }
        })
        remote((token) => api<Patient>('/physio/patients', { body: input, token }).then((row) => put('patients', row)))
        return solo.id
      }
      const id = uid('pt')
      mutate((d) => {
        d.patients.push({
          id,
          physioId,
          phone: input.phone,
          name: input.name,
          age: input.age,
          sex: input.sex,
          condition: input.condition,
          since: today(),
          tags: [],
          visits: 0,
          linkToken: `${slugify(input.name).split('-')[0]}-${id.slice(-4)}`,
          createdAt: nowTs(),
        })
      })
      // The server issues the real (unguessable) plan-link token.
      remote((token) => api<Patient>('/physio/patients', { body: { id, ...input }, token }).then((row) => (row.id === id ? put('patients', row) : refresh())))
      return id
    },
    giveConsent(patientId: string) {
      mutate((d) => {
        const p = d.patients.find((x) => x.id === patientId)
        if (p && !p.consentAt) p.consentAt = nowTs()
        d.plans.filter((pl) => pl.patientId === patientId && pl.status === 'active' && !pl.openedAt).forEach((pl) => (pl.openedAt = nowTs()))
      })
      remote(async (token) => {
        put('patients', await api<Patient>('/patient/consent', { method: 'POST', token }))
        await api('/patient/plans/opened', { method: 'POST', token })
      })
    },

    markPlansOpened(patientId: string) {
      if (!db.plans.some((pl) => pl.patientId === patientId && pl.status === 'active' && !pl.openedAt)) return
      mutate((d) => {
        d.plans.filter((pl) => pl.patientId === patientId && pl.status === 'active' && !pl.openedAt).forEach((pl) => (pl.openedAt = nowTs()))
      })
      remote((token) => api('/patient/plans/opened', { method: 'POST', token }))
    },

    // ---------- care plan draft (R2 -> R3 -> R4) — local until sent ----------
    startDraft(patientId: string, from?: Partial<PlanDraft>) {
      mutate((d) => {
        if (d.draft?.patientId === patientId && !from) return
        d.draft = {
          patientId,
          items: [],
          daysPerWeek: 5,
          weeks: 3,
          title: '',
          rx: { diagnosis: '', advice: '', modalities: [], followUp: '1w', autoBook: true, letterhead: true },
          ...from,
        }
      })
    },
    updateDraft(patch: Partial<PlanDraft>) {
      mutate((d) => {
        if (d.draft) Object.assign(d.draft, patch)
      })
    },
    saveDraftAsTemplate(physioId: string) {
      const draft = db.draft
      if (!draft || !draft.items.length) return
      const tpl = { id: uid('tpl'), physioId, title: draft.title || 'My template', items: draft.items, daysPerWeek: draft.daysPerWeek, weeks: draft.weeks }
      mutate((d) => {
        d.templates.push(tpl)
      })
      remote((token) => api('/physio/templates', { body: { id: tpl.id, title: tpl.title, items: tpl.items, daysPerWeek: tpl.daysPerWeek, weeks: tpl.weeks }, token }))
    },
    discardDraft() {
      mutate((d) => {
        d.draft = undefined
      })
    },
    /** Sends the draft. `whatsapp: false` when the physio shares the link from their own WhatsApp. */
    sendDraft(physioId: string, opts: { whatsapp?: boolean } = {}): string | undefined {
      const draft = db.draft
      if (!draft) return
      const id = uid('pl')
      const rxOnly = draft.items.length === 0
      mutate((d) => {
        // A prescription-only send is a record; it doesn't replace the active exercise plan.
        if (!rxOnly) d.plans.filter((p) => p.patientId === draft.patientId && p.status === 'active').forEach((p) => (p.status = 'replaced'))
        d.plans.push({
          id,
          patientId: draft.patientId,
          physioId,
          title: draft.title || 'Care plan',
          items: draft.items,
          daysPerWeek: draft.daysPerWeek,
          weeks: draft.weeks,
          startDate: today(),
          status: rxOnly ? 'completed' : 'active',
          sentAt: nowTs(),
          rx: draft.rx,
        })
        const pt = d.patients.find((p) => p.id === draft.patientId)
        if (pt && !pt.condition && draft.rx.diagnosis) pt.condition = draft.rx.diagnosis
        // Referral activation: a physio's first plan activates the invite.
        const me = d.physios.find((p) => p.id === physioId)
        if (me) d.referrals.filter((r) => r.name === me.name && r.status === 'joined').forEach((r) => (r.status = 'activated'))
        d.draft = undefined
      })
      const hasRx = !!(draft.rx.diagnosis || draft.rx.advice || draft.rx.modalities.length)
      remote((token) =>
        api('/physio/plans', {
          body: { id, patientId: draft.patientId, title: draft.title, items: draft.items, daysPerWeek: draft.daysPerWeek, weeks: draft.weeks, rx: hasRx || rxOnly ? draft.rx : undefined, sendWhatsApp: opts.whatsapp !== false },
          token,
        }).then((row: any) => put('plans', row)),
      )
      return id
    },

    // ---------- sessions ----------
    logSession(planId: string, log: Omit<SessionLog, 'id' | 'planId'>) {
      const id = uid('ss')
      mutate((d) => {
        d.sessions = d.sessions.filter((s) => !(s.planId === planId && s.date === log.date))
        d.sessions.push({ id, planId, ...log })
      })
      remote((token) =>
        api<SessionLog>('/patient/sessions', { method: 'PUT', body: { id, planId, ...log }, token }).then((row) => put('sessions', row, (x) => x.planId === row.planId && x.date === row.date)),
      )
    },

    // ---------- bookings ----------
    addBooking(b: Omit<Booking, 'id' | 'createdAt'>): string {
      const id = uid('bk')
      mutate((d) => {
        d.bookings.push({ ...b, id, createdAt: nowTs() })
      })
      if (role === 'physio')
        remote((token) =>
          api<Booking>('/physio/bookings', {
            body: {
              id,
              patientId: b.patientId,
              patientName: b.patientName,
              patientPhone: b.patientPhone,
              date: b.date,
              time: b.time,
              visitType: b.visitType,
              minutes: b.minutes,
              reason: b.reason,
              address: b.address,
              isNewPatient: b.isNewPatient,
              status: b.status === 'confirmed' || b.status === 'checked_in' ? b.status : 'awaiting',
              sendConfirmation: b.sendConfirmation,
              reminder: b.reminder,
              source: b.source === 'walk_in' ? 'walk_in' : 'physio',
            },
            token,
          }).then((row) => put('bookings', row)),
        )
      else if (role === 'patient') remote((token) => api<Booking>('/patient/bookings', { body: { id, date: b.date, time: b.time, visitType: b.visitType, reason: b.reason, address: b.address }, token }).then((row) => put('bookings', row)))
      return id
    },
    updateBooking(id: string, patch: Partial<Booking>) {
      const extra: Partial<Booking> = patch.status === 'checked_in' ? { checkedInAt: nowTs() } : {}
      mutate((d) => {
        const b = d.bookings.find((x) => x.id === id)
        if (b) Object.assign(b, patch, extra)
      })
      if (role === 'physio') remote((token) => api<Booking>(`/physio/bookings/${id}`, { method: 'PATCH', body: patch, token }).then((row) => put('bookings', row)))
      else if (role === 'patient' && (patch.status === 'confirmed' || patch.status === 'reschedule'))
        remote((token) => api<Booking>(`/patient/bookings/${id}`, { method: 'PATCH', body: { status: patch.status }, token }).then((row) => put('bookings', row)))
    },
    /** Walk-in: patient is at the clinic now. Creates the patient if new and checks them in. */
    walkIn(physioId: string, input: WalkInInput): { bookingId: string; patientId: string } {
      const patientId = input.patientId ?? self.addPatient(physioId, { name: input.name, phone: input.phone })
      const bookingId = self.addBooking({
        physioId,
        patientId,
        patientName: input.name,
        patientPhone: input.phone,
        date: today(),
        time: nowHHMM(),
        visitType: input.visitType,
        reason: input.reason || 'Walk-in',
        isNewPatient: !input.patientId,
        status: 'checked_in',
        sendConfirmation: false,
        reminder: false,
        source: 'walk_in',
      })
      mutate((d) => {
        const b = d.bookings.find((x) => x.id === bookingId)
        if (b) b.checkedInAt = nowTs()
      })
      return { bookingId, patientId }
    },

    // ---------- blocked time ----------
    addBlocks(physioId: string, blocks: Omit<Block, 'id' | 'physioId'>[]) {
      const rows: Block[] = blocks.map((b) => ({ ...b, id: uid('bl'), physioId }))
      mutate((d) => {
        d.blocks.push(...rows)
      })
      remote((token) => api<Block[]>('/physio/blocks', { body: { blocks: rows.map(({ physioId: _p, ...r }) => r) }, token }))
    },
    removeBlock(id: string) {
      mutate((d) => {
        d.blocks = d.blocks.filter((b) => b.id !== id)
      })
      remote((token) => api(`/physio/blocks/${id}`, { method: 'DELETE', token }))
    },

    // ---------- group sessions ----------
    /** Creates one session, or a weekly series when `repeatWeeks` > 1. Returns the first id. */
    addGroupSessions(physioId: string, g: Omit<GroupSession, 'id' | 'physioId' | 'participants' | 'status' | 'createdAt' | 'seriesId'>, repeatWeeks = 1): string {
      const seriesId = repeatWeeks > 1 ? uid('gs') : undefined
      const rows: GroupSession[] = Array.from({ length: Math.max(1, repeatWeeks) }, (_, i) => ({
        ...g,
        id: uid('gr'),
        physioId,
        seriesId,
        date: addDays(g.date, i * 7),
        status: 'scheduled',
        participants: [],
        createdAt: nowTs(),
      }))
      mutate((d) => {
        d.groups.push(...rows)
      })
      remote((token) =>
        api<GroupSession[]>('/physio/groups', { body: { sessions: rows.map(({ physioId: _p, participants: _x, status: _s, createdAt: _c, ...r }) => r) }, token }).then((list) => list.forEach((row) => put('groups', row))),
      )
      return rows[0].id
    },
    updateGroup(id: string, patch: Partial<Pick<GroupSession, 'title' | 'description' | 'date' | 'time' | 'minutes' | 'capacity' | 'fee' | 'location' | 'publicBooking' | 'status'>>) {
      mutate((d) => {
        const g = d.groups.find((x) => x.id === id)
        if (g) Object.assign(g, patch)
      })
      remote((token) => api<GroupSession>(`/physio/groups/${id}`, { method: 'PATCH', body: patch, token }).then((row) => put('groups', row)))
    },
    addParticipant(groupId: string, p: { patientId?: string; name: string; phone: string }): string {
      const id = uid('gp')
      const row: GroupParticipant = { id, patientId: p.patientId, name: p.name, phone: p.phone, status: 'booked', joinedAt: nowTs() }
      mutate((d) => {
        d.groups.find((g) => g.id === groupId)?.participants.push(row)
      })
      const path = role === 'patient' ? `/patient/groups/${groupId}/join` : `/physio/groups/${groupId}/participants`
      remote((token) => api<GroupSession>(path, { body: role === 'patient' ? { id } : { id, patientId: p.patientId, name: p.name, phone: p.phone }, token }).then((g) => put('groups', g)))
      return id
    },
    setParticipantStatus(groupId: string, participantId: string, status: GroupParticipantStatus) {
      mutate((d) => {
        const pt = d.groups.find((g) => g.id === groupId)?.participants.find((x) => x.id === participantId)
        if (pt) pt.status = status
      })
      remote((token) => api<GroupSession>(`/physio/groups/${groupId}/participants/${participantId}`, { method: 'PATCH', body: { status }, token }).then((g) => put('groups', g)))
    },

    // ---------- invoices ----------
    createInvoice(physioId: string, input: NewInvoiceInput): string {
      const physio = db.physios.find((p) => p.id === physioId)!
      const id = uid('iv')
      const { send, ...rest } = input
      const inv: Invoice = {
        ...rest,
        id,
        physioId,
        number: nextInvoiceNumber(db.invoices, physio, input.date),
        total: totals(input.items, input.discount, input.taxPct).total,
        sentAt: send ? nowTs() : undefined,
        paidAt: input.status === 'paid' ? nowTs() : undefined,
        createdAt: nowTs(),
      }
      mutate((d) => {
        d.invoices.push(inv)
      })
      remote((token) =>
        api<Invoice>('/physio/invoices', {
          body: {
            id,
            patientId: inv.patientId,
            patientName: inv.patientName,
            patientPhone: inv.patientPhone,
            date: inv.date,
            items: inv.items,
            discount: inv.discount,
            taxPct: inv.taxPct,
            notes: inv.notes,
            bookingId: inv.bookingId,
            groupSessionId: inv.groupSessionId,
            status: inv.status,
            method: inv.method,
            send: !!send,
          },
          token,
        }).then((row) => put('invoices', row)),
      )
      return id
    },
    updateInvoice(id: string, patch: { status?: Invoice['status']; method?: Invoice['method']; sent?: boolean }) {
      mutate((d) => {
        const inv = d.invoices.find((x) => x.id === id)
        if (!inv) return
        if (patch.status) {
          inv.status = patch.status
          inv.paidAt = patch.status === 'paid' ? inv.paidAt ?? nowTs() : undefined
        }
        if (patch.method) inv.method = patch.method
        if (patch.sent) inv.sentAt = nowTs()
      })
      remote((token) => api<Invoice>(`/physio/invoices/${id}`, { method: 'PATCH', body: patch, token }).then((row) => put('invoices', row)))
    },

    // ---------- treatment consent forms ----------
    /**
     * In clinic: pass the signature and the consent is signed now on the physio's device.
     * Remote: the patient gets a WhatsApp link and signs in their app.
     */
    requestConsent(physioId: string, patientId: string, formId: string, signed?: { signedName: string; signature?: string; guardian?: string }, notify = true): string {
      const physio = db.physios.find((p) => p.id === physioId)!
      const form = formById(formId)!
      const id = uid('cs')
      const c: Consent = {
        id,
        physioId,
        patientId,
        formId,
        title: form.title,
        body: form.body(physio),
        status: signed ? 'signed' : 'pending',
        method: signed ? 'in_clinic' : 'remote',
        ...signed,
        requestedAt: nowTs(),
        signedAt: signed ? nowTs() : undefined,
      }
      mutate((d) => {
        d.consents.push(c)
      })
      remote((token) =>
        api<Consent>('/physio/consents', {
          body: { id, patientId, formId, title: c.title, body: c.body, signedName: signed?.signedName, signature: signed?.signature, guardian: signed?.guardian || undefined, notify: !signed && notify },
          token,
        }).then((row) => put('consents', row)),
      )
      return id
    },
    /** Patient signs in their app, or the physio collects a signature for a pending request in clinic. */
    signConsent(id: string, s: { signedName: string; signature?: string; guardian?: string }) {
      mutate((d) => {
        const c = d.consents.find((x) => x.id === id)
        if (c) Object.assign(c, { ...s, guardian: s.guardian || undefined, status: 'signed', signedAt: nowTs(), method: role === 'physio' ? 'in_clinic' : c.method })
      })
      const body = { signedName: s.signedName, signature: s.signature, guardian: s.guardian || undefined }
      remote((token) =>
        api<Consent>(role === 'physio' ? `/physio/consents/${id}/sign` : `/patient/consents/${id}/sign`, { body, token }).then((row) => put('consents', row)),
      )
    },
    setConsentStatus(id: string, status: 'declined' | 'revoked') {
      mutate((d) => {
        const c = d.consents.find((x) => x.id === id)
        if (c) c.status = status
      })
      remote((token) =>
        api<Consent>(role === 'physio' ? `/physio/consents/${id}` : `/patient/consents/${id}`, { method: 'PATCH', body: { status }, token }).then((row) => put('consents', row)),
      )
    },

    // ---------- PhysioPreneurship course ----------
    toggleLesson(physioId: string, lessonId: string, done: boolean): void {
      const me = db.physios.find((p) => p.id === physioId)
      if (!me) return
      const cur = me.courseProgress ?? []
      const next = done ? Array.from(new Set([...cur, lessonId])) : cur.filter((x) => x !== lessonId)
      self.updatePhysio(physioId, { courseProgress: next })
    },

    // ---------- messages ----------
    sendMessage(physioId: string, patientId: string, from: Role, text: string) {
      const id = uid('m')
      mutate((d) => {
        d.messages.push({ id, physioId, patientId, from, text, at: nowTs(), read: false })
      })
      remote((token) => api(from === 'physio' ? '/physio/messages' : '/patient/messages', { body: from === 'physio' ? { id, patientId, text } : { id, text }, token }).then((row: any) => put('messages', row)))
    },
    markRead(patientId: string, reader: Role) {
      mutate((d) => {
        d.messages.filter((m) => m.patientId === patientId && m.from !== reader).forEach((m) => (m.read = true))
      })
      remote((token) => api(reader === 'physio' ? '/physio/messages/read' : '/patient/messages/read', { body: reader === 'physio' ? { patientId } : {}, token }))
    },

    // ---------- referrals ----------
    addReferral(referrerId: string, name: string) {
      const id = uid('rf')
      mutate((d) => {
        d.referrals.push({ id, referrerId, name, status: 'pending', at: nowTs() })
      })
      remote((token) => api('/physio/referrals', { body: { id, name }, token }))
    },

    /** Reload everything from the server (API mode). */
    refresh: () => refresh(),

    resetDemo() {
      if (apiMode) return
      setDb(() => seed())
      setSession(undefined)
    },
  }
  return self
}

export type Store = ReturnType<typeof makeStore>

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<DB>(() => {
    const saved = load<DB>(DB_KEY)
    if (saved) return { ...EMPTY, ...saved }
    return apiMode ? EMPTY : seed()
  })
  const [session, setSessionState] = useState<Session | undefined>(() => load<Session>(SESSION_KEY))
  // API mode: wait for the first server load unless we have cached data to show.
  const [ready, setReady] = useState(() => !apiMode || !session?.token || db.physios.length > 0)

  useEffect(() => save(DB_KEY, db), [db])
  useEffect(() => save(SESSION_KEY, session), [session])

  const tokenRef = useRef(session?.token)
  tokenRef.current = session?.token
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  const setDb = useCallback((fn: (d: DB) => DB) => setDbState(fn), [])
  const setSession = useCallback((s: Session | undefined) => {
    tokenRef.current = s?.token
    setSessionState(s)
  }, [])

  const refresh = useCallback(
    async (token = tokenRef.current) => {
      if (!apiMode || !token) return
      try {
        const r = await api<Bootstrap>('/me/bootstrap', { token })
        setDbState((prev) => ({ ...EMPTY, ...r.db, draft: prev.draft?.patientId && r.db.patients.some((p) => p.id === prev.draft!.patientId) ? prev.draft : undefined }))
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setSession(undefined)
          setDbState(EMPTY)
          toast('Your session expired. Please log in again.')
        } else throw e
      }
    },
    [setSession],
  )

  const remote = useCallback(
    (fn: (token: string) => Promise<unknown>) => {
      if (!apiMode) return
      queue.current = queue.current.then(async () => {
        const token = tokenRef.current
        if (!token) return
        try {
          await fn(token)
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Couldn’t save. Please try again.')
          await refresh().catch(() => undefined)
        }
      })
    },
    [refresh],
  )

  // Initial load (and on app start with a saved session).
  useEffect(() => {
    if (!apiMode || !session?.token) return
    refresh()
      .catch((e) => toast(e instanceof Error ? e.message : 'Couldn’t load your data'))
      .finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresh when the app/tab comes back to the foreground, so new patient logs and bookings show up.
  useEffect(() => {
    if (!apiMode) return
    let last = Date.now()
    const onVis = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > 30_000) {
        last = Date.now()
        refresh().catch(() => undefined)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  const store = useMemo(() => makeStore(db, session, { setDb, setSession, remote, refresh }), [db, session, setDb, setSession, remote, refresh])
  if (!ready)
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function useMe() {
  const { db, session } = useStore()
  const physio = session?.role === 'physio' ? db.physios.find((p) => p.id === session.userId) : undefined
  const patient = session?.role === 'patient' ? db.patients.find((p) => p.id === session.userId) : undefined
  return { physio, patient, session }
}

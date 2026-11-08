import { addDays, iso, today, weekStart } from './dates'
import { EXERCISES } from './exercises'
import { scheduledDates } from './logic'
import type { Booking, DB, Message, Plan, SessionLog } from './types'

// Demo data, generated relative to today so the app always looks "live".
export function seed(): DB {
  const t = today()
  const ts = (daysAgo: number, h = 10, m = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const physioId = 'ph_ananya'

  // Riya's plan started on the Monday of last week -> "week 2 of 3".
  const riyaStart = addDays(weekStart(t), -7)
  const karanStart = addDays(t, -4)
  const sanjayStart = addDays(t, -40)

  const plans: Plan[] = [
    {
      id: 'pl_riya',
      patientId: 'pt_riya',
      physioId,
      title: 'Core stability',
      items: [
        { exerciseId: 'pelvic-tilt', sets: 3, reps: 10, holdSec: 5 },
        { exerciseId: 'bird-dog', sets: 3, reps: 8, perSide: true },
        { exerciseId: 'glute-bridge', sets: 3, reps: 12 },
        { exerciseId: 'dead-bug', sets: 2, reps: 10 },
      ],
      daysPerWeek: 5,
      weeks: 3,
      startDate: riyaStart,
      status: 'active',
      sentAt: ts(14, 18, 12),
      openedAt: ts(14, 18, 20),
      rx: {
        diagnosis: 'Mechanical LBP, L4–L5',
        advice: 'Avoid sitting > 40 min. Heat for 15 min before exercises. Walk 20 min daily. Stop if pain goes above 6/10.',
        modalities: ['Heat', 'IFT'],
        followUp: '1w',
        autoBook: true,
        letterhead: true,
      },
    },
    {
      id: 'pl_karan',
      patientId: 'pt_karan',
      physioId,
      title: 'Shoulder mobility',
      items: [
        { exerciseId: 'pendulum', sets: 2, reps: 20 },
        { exerciseId: 'table-slide', sets: 2, reps: 10 },
        { exerciseId: 'er-band', sets: 3, reps: 12, perSide: true },
      ],
      daysPerWeek: 6,
      weeks: 4,
      startDate: karanStart,
      status: 'active',
      sentAt: ts(4, 17, 40),
      rx: {
        diagnosis: 'Adhesive capsulitis (R), freezing phase',
        advice: 'Warm shower before exercises. Avoid sleeping on the right side.',
        modalities: ['Heat', 'TENS'],
        followUp: '2w',
        autoBook: false,
        letterhead: true,
      },
    },
    {
      id: 'pl_sanjay',
      patientId: 'pt_sanjay',
      physioId,
      title: 'Neck posture reset',
      items: [
        { exerciseId: 'chin-tuck', sets: 3, reps: 10, holdSec: 5 },
        { exerciseId: 'upper-trap-stretch', sets: 2, reps: 3, holdSec: 30, perSide: true },
        { exerciseId: 'scap-squeeze', sets: 3, reps: 10, holdSec: 5 },
      ],
      daysPerWeek: 5,
      weeks: 3,
      startDate: sanjayStart,
      status: 'completed',
      sentAt: ts(40, 11, 0),
      openedAt: ts(40, 12, 0),
    },
  ]

  // Riya's session history: scheduled days from start to yesterday, one skip, pain trending 6 -> 3.
  const sessions: SessionLog[] = []
  const riyaDays = scheduledDates(plans[0]).filter((d) => d < t)
  const painCurve = [6, 6, 6, 5, 5, 5, 4, 4, 3, 3, 3, 3, 3]
  riyaDays.forEach((d, i) => {
    const skipped = i === riyaDays.length - 3
    sessions.push({
      id: `ss_r${i}`,
      planId: 'pl_riya',
      date: d,
      status: skipped ? 'skipped' : 'done',
      pain: skipped ? undefined : painCurve[Math.min(i, painCurve.length - 1)],
      note: i === 2 ? 'Bird dog felt hard' : undefined,
    })
  })
  const sanjayDays = scheduledDates(plans[2])
  sanjayDays.forEach((d, i) => {
    if (i % 6 === 5) return
    sessions.push({ id: `ss_s${i}`, planId: 'pl_sanjay', date: d, status: 'done', pain: Math.max(1, 5 - Math.floor(i / 3)) })
  })

  const B = (b: Omit<Booking, 'physioId' | 'createdAt' | 'sendConfirmation' | 'reminder' | 'source'> & Partial<Booking>): Booking => ({
    physioId,
    createdAt: ts(2),
    sendConfirmation: true,
    reminder: true,
    source: 'physio',
    ...b,
  })

  const bookings: Booking[] = [
    B({ id: 'bk1', patientId: 'pt_riya', patientName: 'Riya Sharma', patientPhone: '9845011223', date: t, time: '09:00', visitType: 'in_clinic', reason: 'Follow-up', isNewPatient: false, status: 'confirmed' }),
    B({ id: 'bk2', patientId: 'pt_arjun', patientName: 'Arjun Mehta', patientPhone: '9900122334', date: t, time: '10:30', visitType: 'in_clinic', reason: 'ACL rehab', isNewPatient: true, status: 'reminder_sent' }),
    B({ id: 'bk3', patientId: 'pt_priya', patientName: 'Priya Nair', patientPhone: '9741203344', date: t, time: '12:00', visitType: 'home_visit', reason: 'Post-natal back care', isNewPatient: false, status: 'awaiting' }),
    B({ id: 'bk4', patientId: 'pt_karan', patientName: 'Karan Shah', patientPhone: '9886055667', date: t, time: '16:00', visitType: 'in_clinic', reason: 'Follow-up · Frozen shoulder', isNewPatient: false, status: 'reschedule' }),
    B({ id: 'bk5', patientId: 'pt_sanjay', patientName: 'Sanjay Iyer', patientPhone: '9945566778', date: addDays(t, 1), time: '11:00', visitType: 'in_clinic', reason: 'Review', isNewPatient: false, status: 'confirmed' }),
    B({ id: 'bk6', patientName: 'Neha Gupta', patientPhone: '9812345670', date: addDays(t, 2), time: '17:30', visitType: 'in_clinic', reason: 'Knee pain while climbing stairs', isNewPatient: true, status: 'requested', source: 'public_profile', createdAt: ts(0, 8, 15) }),
    B({ id: 'bk7', patientId: 'pt_riya', patientName: 'Riya Sharma', patientPhone: '9845011223', date: addDays(t, 6), time: '10:30', visitType: 'in_clinic', reason: 'Follow-up', isNewPatient: false, status: 'awaiting' }),
    B({ id: 'bk8', patientId: 'pt_arjun', patientName: 'Arjun Mehta', patientPhone: '9900122334', date: addDays(t, -3), time: '10:00', visitType: 'in_clinic', reason: 'Assessment', isNewPatient: true, status: 'done' }),
  ]

  const messages: Message[] = [
    { id: 'm1', physioId, patientId: 'pt_riya', from: 'patient', text: 'Bird dog felt hard on day 3', at: ts(1, 19, 5), read: false },
  ]

  return {
    physios: [
      {
        id: physioId,
        phone: '9876543210',
        name: 'Dr. Ananya Rao',
        email: 'ananya@betterhoodphysio.in',
        qualification: 'MPT (Ortho)',
        experienceYrs: 8,
        councilRegNo: 'KPC/2017/04821',
        verification: 'pending',
        focusAreas: ['Orthopaedic', 'Sports'],
        practiceSettings: ['Own clinic'],
        slug: 'ananya-rao',
        consult: { inClinic: { enabled: true, fee: 800, minutes: 45 }, homeVisit: { enabled: false, fee: 1200, radiusKm: 5 } },
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        inviteCode: 'ANANYA-BH',
        partnerOptIns: [],
        communityWaitlist: false,
        communityTopics: [],
        createdAt: ts(30),
      },
    ],
    patients: [
      { id: 'pt_riya', physioId, phone: '9845011223', name: 'Riya Sharma', age: 32, sex: 'F', condition: 'Lower back pain · L4–L5', since: '2026-09-02', tags: ['Desk job'], visits: 4, linkToken: 'riya-3wk', consentAt: ts(14, 18, 20), createdAt: ts(60) },
      { id: 'pt_karan', physioId, phone: '9886055667', name: 'Karan Shah', age: 54, sex: 'M', condition: 'Frozen shoulder (R)', since: '2026-10-20', tags: ['Diabetic'], visits: 2, linkToken: 'karan-4wk', createdAt: ts(20) },
      { id: 'pt_arjun', physioId, phone: '9900122334', name: 'Arjun Mehta', age: 24, sex: 'M', condition: 'ACL reconstruction · 6 wks', since: iso(new Date(Date.now() - 3 * 86400000)), tags: ['Footballer'], visits: 1, linkToken: 'arjun-acl', createdAt: ts(3) },
      { id: 'pt_priya', physioId, phone: '9741203344', name: 'Priya Nair', age: 31, sex: 'F', condition: 'Post-natal back care', since: '2026-10-05', tags: ['Home visit'], visits: 3, linkToken: 'priya-pn', createdAt: ts(35) },
      { id: 'pt_sanjay', physioId, phone: '9945566778', name: 'Sanjay Iyer', age: 41, sex: 'M', condition: 'Neck pain · postural', since: '2026-09-20', tags: ['IT professional'], visits: 5, linkToken: 'sanjay-neck', consentAt: ts(40), createdAt: ts(48) },
    ],
    exercises: EXERCISES,
    plans,
    sessions,
    bookings,
    messages,
    referrals: [
      { id: 'rf1', referrerId: physioId, name: 'Dr. Rohan Kulkarni', status: 'activated', at: ts(12) },
      { id: 'rf2', referrerId: physioId, name: 'Dr. Meera Shah', status: 'joined', at: ts(6) },
      { id: 'rf3', referrerId: physioId, name: 'Dr. Faiz Ahmed', status: 'pending', at: ts(2) },
    ],
    templates: [],
  }
}

export const DEMO = {
  physioPhone: '9876543210',
  patientPhone: '9845011223',
  patientLink: '/plan/riya-3wk',
  otp: '123456',
}

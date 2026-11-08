import { MessageCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, cx, Footer, Input, Label, PageHeader, Toggle } from '../../../components/ui'
import { addDays, fmtDay, fmtTime, relDay, today } from '../../../lib/dates'
import { fmtPhone } from '../../../lib/logic'
import { haptic } from '../../../lib/platform'
import { openSlots } from '../../../lib/slots'
import { useMe, useStore } from '../../../lib/store'
import type { VisitType } from '../../../lib/types'

// B2 · New booking (also used to reschedule and to answer a booking request)
export default function NewBooking() {
  const { physio } = useMe()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const st = (useLocation().state ?? {}) as { date?: string; time?: string; patientId?: string; rescheduleId?: string }
  const existing = st.rescheduleId ? db.bookings.find((b) => b.id === st.rescheduleId) : undefined

  const [patientId, setPatientId] = useState<string | undefined>(existing?.patientId ?? st.patientId)
  const [isNew, setIsNew] = useState(!!existing && !existing.patientId)
  const [newName, setNewName] = useState(existing && !existing.patientId ? existing.patientName : '')
  const [newPhone, setNewPhone] = useState(existing && !existing.patientId ? existing.patientPhone : '')
  const [q, setQ] = useState('')
  const [date, setDate] = useState(st.date ?? existing?.date ?? today())
  const [time, setTime] = useState<string | undefined>(st.time)
  const [visit, setVisit] = useState<VisitType>(existing?.visitType ?? 'in_clinic')
  const [confirmNow, setConfirmNow] = useState(true)
  const [reminder, setReminder] = useState(true)

  const myPatients = useMemo(() => db.patients.filter((p) => p.physioId === physio?.id), [db.patients, physio?.id])
  if (!physio) return null
  const patient = myPatients.find((p) => p.id === patientId)
  const slots = openSlots(physio, db.bookings.filter((b) => b.id !== existing?.id), date)
  const dateChips = [today(), addDays(today(), 1), addDays(today(), 2), addDays(today(), 3)]
  const newValid = newName.trim().length > 1 && /^[6-9]\d{9}$/.test(newPhone.replace(/\D/g, ''))
  const ready = !!time && (isNew ? newValid : !!patient)

  const confirm = () => {
    if (!time) return
    haptic('success')
    let pid = patient?.id
    let pname = patient?.name ?? newName.trim()
    let pphone = patient?.phone ?? newPhone.replace(/\D/g, '')
    if (isNew && !existing) {
      pid = store.addPatient(physio.id, { name: newName.trim(), phone: pphone })
      pname = newName.trim()
    }
    const status = confirmNow ? 'awaiting' : 'confirmed'
    if (existing) {
      store.updateBooking(existing.id, { date, time, visitType: visit, status, sendConfirmation: confirmNow, reminder })
      nav(`/app/bookings/${existing.id}/confirmed`, { replace: true })
    } else {
      const id = store.addBooking({
        physioId: physio.id,
        patientId: pid,
        patientName: pname,
        patientPhone: pphone,
        date,
        time,
        visitType: visit,
        reason: isNew ? 'New patient' : 'Follow-up',
        isNewPatient: isNew,
        status,
        sendConfirmation: confirmNow,
        reminder,
        source: 'physio',
      })
      nav(`/app/bookings/${id}/confirmed`, { replace: true })
    }
  }

  const matches = q ? myPatients.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase())) : myPatients.slice(0, 5)

  return (
    <Page wide>
      <PageHeader title={existing ? (existing.status === 'requested' ? 'Suggest another time' : 'Reschedule') : 'New booking'} subtitle={existing ? `${existing.patientName} · was ${fmtDay(existing.date)}, ${fmtTime(existing.time)}` : undefined} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          <Label>Patient</Label>
          {existing ? (
            <div className="flex h-[52px] items-center rounded-xl border border-line bg-surface px-4 text-[16px]">
              {existing.patientName} · {fmtPhone(existing.patientPhone)}
            </div>
          ) : isNew ? (
            <div className="flex flex-col gap-3">
              <Input placeholder="Patient name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
              <Input prefix="+91" inputMode="numeric" placeholder="Mobile (WhatsApp)" maxLength={11} value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/[^\d ]/g, ''))} />
              <button className="self-start text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setIsNew(false)}>
                Choose an existing patient instead
              </button>
            </div>
          ) : patient ? (
            <button
              onClick={() => setPatientId(undefined)}
              className="flex h-[52px] w-full items-center justify-between rounded-xl border border-line bg-surface px-4 text-left text-[16px] cursor-pointer"
            >
              <span>
                {patient.name} · {fmtPhone(patient.phone)}
              </span>
              <span className="text-[13px] font-semibold text-brand">Change</span>
            </button>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex h-12 items-center gap-2 border-b border-line px-4">
                <Search size={17} className="text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients" className="h-full flex-1 bg-transparent outline-none placeholder:text-faint" autoFocus />
              </div>
              {matches.map((p) => (
                <button key={p.id} onClick={() => setPatientId(p.id)} className="block w-full px-4 py-2.5 text-left hover:bg-bg cursor-pointer">
                  <div className="text-[15px] font-medium">{p.name}</div>
                  <div className="text-[12px] text-muted">{fmtPhone(p.phone)}</div>
                </button>
              ))}
            </Card>
          )}
          {!existing && !isNew && (
            <button className="mt-2.5 text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setIsNew(true)}>
              + New patient
            </button>
          )}

          <h3 className="mb-3 mt-6 text-[16px] font-semibold">Date</h3>
          <div className="flex flex-wrap gap-2">
            {dateChips.map((d) => (
              <Chip
                key={d}
                selected={date === d}
                onClick={() => {
                  setDate(d)
                  setTime(undefined)
                }}
              >
                {relDay(d)}
              </Chip>
            ))}
            <label className={cx('relative inline-flex h-10 cursor-pointer items-center rounded-full border px-4 text-[14px]', dateChips.includes(date) ? 'border-line bg-surface' : 'border-brand bg-brand-soft font-medium text-brand')}>
              {dateChips.includes(date) ? 'Pick date' : fmtDay(date)}
              <input
                type="date"
                min={today()}
                value={date}
                onChange={(e) => {
                  if (!e.target.value) return
                  setDate(e.target.value)
                  setTime(undefined)
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Pick date"
              />
            </label>
          </div>

          <h3 className="mb-3 mt-6 text-[16px] font-semibold">Open slots</h3>
          {slots.length === 0 ? (
            <p className="text-[14px] text-muted">No open slots on this day.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <Chip key={s} selected={time === s} onClick={() => setTime(s)} className="justify-center px-2">
                  {fmtTime(s)}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 mt-6 text-[16px] font-semibold lg:mt-0">Visit type</h3>
          <div className="flex flex-wrap gap-2">
            <Chip selected={visit === 'in_clinic'} onClick={() => setVisit('in_clinic')}>
              In-clinic
            </Chip>
            <Chip selected={visit === 'home_visit'} onClick={() => setVisit('home_visit')}>
              Home visit
            </Chip>
            <Chip disabled>Teleconsult · soon</Chip>
          </div>

          <div className="mt-6 rounded-2xl bg-lime p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold text-lime-ink">
              <MessageCircle size={18} /> WhatsApp automations
            </div>
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <div className="text-[15px] font-semibold">Send confirmation now</div>
                <div className="text-[13px] text-muted">Patient can confirm or reschedule</div>
              </div>
              <Toggle label="Send confirmation now" checked={confirmNow} onChange={setConfirmNow} />
            </div>
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <div className="text-[15px] font-semibold">Reminder 2 hrs before</div>
                <div className="text-[13px] text-muted">Includes clinic location</div>
              </div>
              <Toggle label="Reminder 2 hours before" checked={reminder} onChange={setReminder} />
            </div>
          </div>
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={!ready} onClick={confirm}>
          {existing ? 'Confirm new time' : 'Confirm booking'}
        </Button>
      </Footer>
    </Page>
  )
}

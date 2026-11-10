import { Activity, Check, ChevronRight, FileSignature, ReceiptIndianRupee, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Button, Card, Chip, Footer, IconTile, Input, Label, PageHeader, TextArea } from '../../components/ui'
import { fmtTime, today } from '../../lib/dates'
import { hasConsent } from '../../lib/consents'
import { firstName, fmtPhone } from '../../lib/logic'
import { haptic } from '../../lib/platform'
import { clashes, nowHHMM, visitMinutes } from '../../lib/slots'
import { useMe, useStore } from '../../lib/store'
import { useStartPlan } from './Patients'

const REASONS = ['Back pain', 'Neck pain', 'Knee pain', 'Shoulder pain', 'Sprain', 'Post-surgery', 'Sports injury']

// Walk-in: someone arrives without a booking. Check them in now; they join today's queue.
export default function WalkIn() {
  const { physio } = useMe()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const startPlan = useStartPlan()
  const [q, setQ] = useState('')
  const [patientId, setPatientId] = useState<string>()
  const [isNew, setIsNew] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState<{ bookingId: string; patientId: string }>()

  const mine = useMemo(() => db.patients.filter((p) => p.physioId === physio?.id), [db.patients, physio?.id])
  if (!physio) return null
  const patient = mine.find((p) => p.id === patientId)
  const digits = phone.replace(/\D/g, '')
  const ready = isNew ? name.trim().length > 1 && /^[6-9]\d{9}$/.test(digits) : !!patient
  const now = nowHHMM()
  const busyNow = clashes(physio, db, today(), now, visitMinutes(physio, 'in_clinic'))
  const queue = db.bookings.filter((b) => b.physioId === physio.id && b.date === today() && b.status === 'checked_in').length
  const matches = q ? mine.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase())) : mine.slice(0, 5)

  if (done) {
    const p = db.patients.find((x) => x.id === done.patientId)
    const pname = p?.name ?? name
    const needsConsent = !hasConsent(db.consents, done.patientId, 'general')
    const next = [
      ...(needsConsent ? [{ icon: <FileSignature size={18} />, t: 'Take treatment consent', s: 'Patient signs on your phone', on: () => nav(`/app/patients/${done.patientId}/consent`, { replace: true, state: { formId: 'general' } }) }] : []),
      { icon: <Activity size={18} />, t: 'Care plan + treatment plan', s: 'Send exercises after the session', on: () => startPlan(done.patientId, 'plan') },
      { icon: <ReceiptIndianRupee size={18} />, t: 'Create invoice', s: `${physio.consult.inClinic.fee ? `₹${physio.consult.inClinic.fee}` : 'Consult fee'} · send on WhatsApp`, on: () => nav('/app/invoices/new', { replace: true, state: { bookingId: done.bookingId } }) },
    ]
    return (
      <Page>
        <PageHeader title="Checked in" close onBack={() => nav('/app', { replace: true })} />
        <div className="flex items-center gap-3">
          <div className="anim-pop grid h-12 w-12 place-items-center rounded-full bg-ok text-white">
            <Check size={26} strokeWidth={3} />
          </div>
          <div>
            <div className="font-display text-[18px] font-bold">{pname} is in the queue</div>
            <div className="text-[13px] text-muted">Arrived {fmtTime(now)} · walk-in</div>
          </div>
        </div>
        <h2 className="mb-3 mt-6 text-[17px] font-semibold">Next</h2>
        <div className="flex flex-col gap-2.5">
          {next.map((n) => (
            <Card key={n.t} className="flex items-center gap-3 p-4" onClick={n.on}>
              <IconTile>{n.icon}</IconTile>
              <div className="flex-1">
                <div className="text-[15px] font-semibold">{n.t}</div>
                <div className="text-[13px] text-muted">{n.s}</div>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Card>
          ))}
        </div>
        <Footer>
          <Button block variant="secondary" onClick={() => nav('/app', { replace: true })}>
            Back to today
          </Button>
        </Footer>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader title="Walk-in" subtitle={`Check in now · ${queue ? `${queue} already waiting` : 'no one waiting'}`} />
      <Label>Patient</Label>
      {isNew ? (
        <div className="flex flex-col gap-3">
          <Input placeholder="Patient name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input prefix="+91" inputMode="numeric" placeholder="Mobile (WhatsApp)" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} />
          <button className="self-start text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setIsNew(false)}>
            Existing patient instead
          </button>
        </div>
      ) : patient ? (
        <button onClick={() => setPatientId(undefined)} className="flex h-[52px] w-full items-center justify-between rounded-xl border border-line bg-surface px-4 text-left text-[16px] cursor-pointer">
          <span>
            {patient.name} · {fmtPhone(patient.phone)}
          </span>
          <span className="text-[13px] font-semibold text-brand">Change</span>
        </button>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex h-12 items-center gap-2 border-b border-line px-4">
              <Search size={17} className="text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or mobile" className="h-full flex-1 bg-transparent outline-none placeholder:text-faint" />
            </div>
            {matches.map((p) => (
              <button key={p.id} onClick={() => setPatientId(p.id)} className="block w-full px-4 py-2.5 text-left hover:bg-bg cursor-pointer">
                <div className="text-[15px] font-medium">{p.name}</div>
                <div className="text-[12px] text-muted">{fmtPhone(p.phone)}</div>
              </button>
            ))}
          </Card>
          <Button variant="soft" size="md" className="mt-3" onClick={() => setIsNew(true)}>
            + New patient
          </Button>
        </>
      )}

      <h3 className="mb-3 mt-6 text-[16px] font-semibold">Reason for visit</h3>
      <div className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <Chip key={r} selected={reason === r} onClick={() => setReason(reason === r ? '' : r)}>
            {r}
          </Chip>
        ))}
      </div>
      <div className="mt-3">
        <TextArea rows={2} placeholder="Or describe it (optional)" value={REASONS.includes(reason) ? '' : reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      {busyNow && (
        <div className="mt-5 flex gap-3 rounded-2xl bg-warn-soft p-4 text-[14px]">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warn" />
          You have a booking or blocked time right now. The walk-in will join the queue and you can see them after.
        </div>
      )}

      <Footer>
        <Button
          block
          disabled={!ready}
          onClick={() => {
            haptic('success')
            const pname = patient?.name ?? name.trim()
            const r = store.walkIn(physio.id, { patientId: patient?.id, name: pname, phone: patient?.phone ?? digits, visitType: 'in_clinic', reason: reason.trim() ? `Walk-in · ${reason.trim()}` : 'Walk-in' })
            setDone(r)
          }}
        >
          Check in {patient ? firstName(patient.name) : isNew && name.trim() ? firstName(name.trim()) : ''} now
        </Button>
      </Footer>
    </Page>
  )
}

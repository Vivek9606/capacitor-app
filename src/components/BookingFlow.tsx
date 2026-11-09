import { ArrowLeft, Building2, CalendarCheck, Check, Clock, House, MapPin, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { dayShort, fmtDay, fmtTime, relDay, today } from '../lib/dates'
import { inr } from '../lib/invoices'
import { firstName } from '../lib/logic'
import { modesOf } from '../lib/practice'
import { fromMin, toMin, visitFee, visitMinutes, type Calendar } from '../lib/slots'
import type { GroupSession, Physio, VisitType } from '../lib/types'
import { SlotPicker } from './SlotPicker'
import { Avatar, Button, Card, cx, Input, TextArea } from './ui'

export interface BookingSubmit {
  visitType: VisitType
  date: string
  time: string
  name: string
  phone: string
  reason?: string
  address?: string
}

type Choice = { kind: 'visit'; visitType: VisitType } | { kind: 'group'; groupId: string }

/** Where an in-person visit happens on a given day (individual practitioners consult at different places). */
function placeFor(p: Physio, date?: string): string | undefined {
  if (p.clinic?.address) return `${p.clinic.name}, ${p.clinic.area || p.clinic.address}`
  const locs = p.practice?.locations ?? []
  const loc = (date && locs.find((l) => l.days.includes(dayShort(date)))) || locs[0]
  return loc ? `${loc.name}, ${loc.address}` : undefined
}

export function openGroups(p: Physio, groups: GroupSession[] = []) {
  const t = today()
  return groups
    .filter((g) => g.physioId === p.id && g.publicBooking && g.status === 'scheduled' && g.date >= t)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 8)
}

const seatsLeft = (g: GroupSession) => g.capacity - g.participants.filter((x) => x.status !== 'cancelled').length

/**
 * Calendly-style booking: pick what to book → day & time → details → done.
 * Public booking page (/dr/:slug/book) and the patient app (/me/book).
 */
export function BookingFlow({
  physio,
  cal,
  known,
  initialGroupId,
  onBook,
  onJoinGroup,
  doneNote,
}: {
  physio: Physio
  cal: Calendar
  known?: { name: string; phone: string }
  initialGroupId?: string
  onBook: (v: BookingSubmit) => Promise<void> | void
  onJoinGroup: (groupId: string, who: { name: string; phone: string }) => Promise<void> | void
  doneNote?: string
}) {
  const groups = openGroups(physio, cal.groups)
  const types: { visitType: VisitType; title: string; icon: React.ReactNode; sub: string }[] = []
  const modes = modesOf(physio)
  if (physio.consult.inClinic.enabled)
    types.push({
      visitType: 'in_clinic',
      title: modes.includes('clinic') ? 'In-clinic consultation' : 'Consultation',
      icon: <Building2 size={19} />,
      sub: placeFor(physio) ?? 'In person',
    })
  if (physio.consult.homeVisit.enabled)
    types.push({
      visitType: 'home_visit',
      title: 'Home visit',
      icon: <House size={19} />,
      sub: physio.practice?.serviceArea ? `Covers ${physio.practice.serviceArea}` : `Within ${physio.consult.homeVisit.radiusKm} km`,
    })

  const initial: Choice | undefined = initialGroupId && groups.some((g) => g.id === initialGroupId) ? { kind: 'group', groupId: initialGroupId } : types.length === 1 && !groups.length ? { kind: 'visit', visitType: types[0].visitType } : undefined
  const [choice, setChoice] = useState<Choice | undefined>(initial)
  const [date, setDate] = useState<string>()
  const [time, setTime] = useState<string>()
  const [step, setStep] = useState<'pick' | 'details' | 'done'>(initial?.kind === 'group' ? 'details' : 'pick')
  const [name, setName] = useState(known?.name ?? '')
  const [phone, setPhone] = useState(known?.phone ?? '')
  const [reason, setReason] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const visitType = choice?.kind === 'visit' ? choice.visitType : undefined
  const group = choice?.kind === 'group' ? groups.find((g) => g.id === choice.groupId) : undefined
  const opts = useMemo(() => ({ visitType: visitType ?? 'in_clinic', forPatient: true }) as const, [visitType])
  const digits = phone.replace(/\D/g, '')
  const detailsOk = name.trim().length > 1 && /^[6-9]\d{9}$/.test(digits) && (visitType !== 'home_visit' || address.trim().length > 5)
  const doc = `Dr. ${firstName(physio.name)}`

  const summary = group
    ? { title: group.title, minutes: group.minutes, fee: group.fee, where: group.location, when: `${fmtDay(group.date)}, ${fmtTime(group.time)}` }
    : visitType
      ? {
          title: types.find((t) => t.visitType === visitType)!.title,
          minutes: visitMinutes(physio, visitType),
          fee: visitFee(physio, visitType),
          where: visitType === 'home_visit' ? 'At your home' : placeFor(physio, date),
          when: date && time ? `${fmtDay(date)}, ${fmtTime(time)}–${fmtTime(fromMin(toMin(time) + visitMinutes(physio, visitType)))}` : undefined,
        }
      : undefined

  const submit = async () => {
    if (!detailsOk || busy) return
    setBusy(true)
    setError('')
    try {
      if (group) await onJoinGroup(group.id, { name: name.trim(), phone: digits })
      else if (visitType && date && time) await onBook({ visitType, date, time, name: name.trim(), phone: digits, reason: reason.trim() || undefined, address: visitType === 'home_visit' ? address.trim() : undefined })
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t book. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const back = () => {
    setError('')
    if (step === 'details' && !group) return setStep('pick')
    setChoice(undefined)
    setDate(undefined)
    setTime(undefined)
    setStep('pick')
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-surface md:grid md:grid-cols-[280px_minmax(0,1fr)]">
      {/* Left: who + what */}
      <div className="border-b border-line p-5 md:border-b-0 md:border-r">
        {(choice || step !== 'pick') && step !== 'done' && (
          <button onClick={back} aria-label="Back" className="mb-3 grid h-9 w-9 place-items-center rounded-full border border-line text-brand hover:border-brand-line cursor-pointer">
            <ArrowLeft size={17} />
          </button>
        )}
        <div className="flex items-center gap-3">
          <Avatar name={physio.name} photo={physio.photo} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[14px] text-muted">{physio.name}, PT</div>
            <div className="truncate text-[18px] font-semibold leading-tight">{summary?.title ?? 'Book a session'}</div>
          </div>
        </div>
        {summary && (
          <div className="mt-4 flex flex-col gap-2 text-[14px] text-muted">
            <div className="flex items-center gap-2">
              <Clock size={15} className="shrink-0" /> {summary.minutes} min{summary.fee ? ` · ${inr(summary.fee)}` : ''}
            </div>
            {summary.where && (
              <div className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0" /> {summary.where}
              </div>
            )}
            {summary.when && (
              <div className="flex items-start gap-2 font-medium text-brand">
                <CalendarCheck size={15} className="mt-0.5 shrink-0" /> {summary.when}
              </div>
            )}
          </div>
        )}
        {!summary && <p className="mt-3 text-[14px] text-muted">Choose a visit type, then a day and time that suit you. {doc} confirms on WhatsApp.</p>}
      </div>

      {/* Right: the current step */}
      <div className="p-5">
        {step === 'done' ? (
          <div className="py-6 text-center">
            <div className="anim-pop mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok text-white">
              <Check size={28} strokeWidth={3} />
            </div>
            <h2 className="mt-4 text-[20px] font-semibold">{group ? 'Seat booked' : 'Request sent'}</h2>
            <p className="mx-auto mt-1 max-w-sm text-[14px] text-muted">
              {summary?.when}. {group ? `See you there! ${doc} will send details on WhatsApp.` : `${doc} will confirm on WhatsApp.`} {doneNote}
            </p>
          </div>
        ) : !choice ? (
          <div className="flex flex-col gap-2.5">
            <div className="mb-1 text-[16px] font-semibold">What would you like to book?</div>
            {types.map((t) => (
              <button
                key={t.visitType}
                onClick={() => setChoice({ kind: 'visit', visitType: t.visitType })}
                className="flex items-center gap-3 rounded-2xl border border-line p-4 text-left hover:border-brand cursor-pointer"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{t.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{t.title}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {visitMinutes(physio, t.visitType)} min · {inr(visitFee(physio, t.visitType))} · {t.sub}
                  </span>
                </span>
              </button>
            ))}
            {groups.length > 0 && (
              <>
                <div className="mb-1 mt-3 text-[14px] font-semibold text-muted">Group classes</div>
                {groups.map((g) => {
                  const left = seatsLeft(g)
                  return (
                    <button
                      key={g.id}
                      disabled={left <= 0}
                      onClick={() => {
                        setChoice({ kind: 'group', groupId: g.id })
                        setStep('details')
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-line p-4 text-left hover:border-brand disabled:opacity-50 cursor-pointer disabled:cursor-default"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime text-lime-ink">
                        <UsersRound size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">{g.title}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {relDay(g.date)} · {fmtTime(g.time)} · {g.minutes} min · {g.fee ? inr(g.fee) : 'Free'}
                        </span>
                      </span>
                      <span className={cx('shrink-0 text-[12px] font-semibold', left <= 2 ? 'text-accent' : 'text-brand')}>{left > 0 ? `${left} left` : 'Full'}</span>
                    </button>
                  )
                })}
              </>
            )}
            {!types.length && !groups.length && <p className="text-[14px] text-muted">Online booking isn’t open yet. Message {doc} on WhatsApp instead.</p>}
          </div>
        ) : step === 'pick' && visitType ? (
          <>
            <div className="mb-4 text-[16px] font-semibold">Select a day & time</div>
            <SlotPicker
              physio={physio}
              cal={cal}
              opts={opts}
              date={date}
              time={time}
              onDate={(d) => {
                setDate(d)
                setTime(undefined)
              }}
              onTime={(t) => {
                setTime(t)
                setStep('details')
              }}
            />
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-[16px] font-semibold">{group ? 'Book your seat' : 'Your details'}</div>
            {group?.description && <Card className="p-3.5 text-[14px] text-muted">{group.description}</Card>}
            {known ? (
              <div className="rounded-xl bg-bg px-4 py-3 text-[14px]">
                Booking as <b>{known.name}</b>
              </div>
            ) : (
              <>
                <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                <Input label="Mobile (WhatsApp)" prefix="+91" inputMode="numeric" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} autoComplete="tel-national" />
              </>
            )}
            {visitType === 'home_visit' && <TextArea label="Home address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, building, street, area" />}
            {!group && <TextArea label="What’s bothering you? (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Knee pain while climbing stairs" />}
            {error && <p className="rounded-xl bg-accent-soft px-3 py-2 text-[14px] text-danger">{error}</p>}
            <Button block disabled={!detailsOk || busy} onClick={submit}>
              {busy ? 'Booking…' : group ? 'Book my seat' : 'Request this time'}
            </Button>
            {!group && <p className="text-center text-[12px] text-muted">Free to request · {doc} confirms on WhatsApp</p>}
          </div>
        )}
      </div>
    </div>
  )
}

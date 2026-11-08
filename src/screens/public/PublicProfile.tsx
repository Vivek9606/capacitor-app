import { BadgeCheck, Building2, Check, Clock, House, MapPin, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BookingRequest } from '../../components/BookingRequest'
import { Logo } from '../../components/Logo'
import { Avatar, Badge, Card, IconButton } from '../../components/ui'
import { fmtDay, fmtTime } from '../../lib/dates'
import { firstName } from '../../lib/logic'
import { openMaps, publicUrl, shareLink } from '../../lib/platform'
import { api, apiMode } from '../../lib/api'
import { useStore } from '../../lib/store'
import type { Booking, Physio } from '../../lib/types'

// PW2 · Physio public profile — /dr/:slug. No login. Indexable (SSR/prerender in Phase 2).
interface PublicData {
  physio: Physio
  busy: { date: string; time: string }[]
}

export default function PublicProfile() {
  const { slug } = useParams()
  const store = useStore()
  const [remote, setRemote] = useState<PublicData | null>()
  const [sent, setSent] = useState<{ date: string; time: string }>()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!apiMode || !slug) return
    api<PublicData>(`/public/physios/${encodeURIComponent(slug)}`)
      .then(setRemote)
      .catch(() => setRemote(null))
  }, [slug])

  const physio = apiMode ? remote?.physio : store.db.physios.find((p) => p.slug === slug)
  const taken = useMemo<Booking[] | undefined>(
    () =>
      apiMode && remote
        ? remote.busy.map((b, i) => ({ id: `busy_${i}`, physioId: remote.physio.id, patientName: '', patientPhone: '', date: b.date, time: b.time, visitType: 'in_clinic', isNewPatient: false, status: 'confirmed', sendConfirmation: false, reminder: false, source: 'physio', createdAt: '' }))
        : undefined,
    [remote],
  )

  if (apiMode && remote === undefined)
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )

  if (!physio)
    return (
      <div className="mx-auto max-w-[480px] px-6 py-20 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-8 text-[22px] font-semibold">Profile not found</h1>
        <p className="mt-2 text-muted">This physio link may have changed.</p>
      </div>
    )

  const doc = `Dr. ${firstName(physio.name)}`
  const days = physio.workingDays.length === 7 ? 'All days' : physio.workingDays.join(', ')

  return (
    <div className="min-h-full">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1040px] items-center justify-between px-5">
          <Logo />
          <IconButton aria-label="Share profile" onClick={() => shareLink({ title: physio.name, text: `Book a session with ${physio.name}:`, url: publicUrl(`/dr/${physio.slug}`) })}>
            <Share2 size={17} />
          </IconButton>
        </div>
      </header>
      <div className="mx-auto max-w-[1040px] px-5 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10 lg:py-10">
        <div>
          <div className="flex items-center gap-4">
            <Avatar name={physio.name} photo={physio.photo} size={84} />
            <div>
              <h1 className="flex items-center gap-1.5 text-[24px] font-semibold leading-tight tracking-[-0.01em]">
                {physio.name}, PT
                {physio.verification === 'verified' && <BadgeCheck size={20} className="text-wa" />}
              </h1>
              <div className="mt-1 text-[14px] text-muted">
                {[physio.qualification, physio.experienceYrs ? `${physio.experienceYrs} yrs experience` : undefined].filter(Boolean).join(' · ') || 'Physiotherapist'}
              </div>
              {physio.clinic?.area && (
                <div className="mt-1 flex items-center gap-1 text-[14px] text-muted">
                  <MapPin size={14} /> {physio.clinic.area}
                </div>
              )}
            </div>
          </div>

          {physio.focusAreas.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {physio.focusAreas.map((f) => (
                <Badge key={f} tone="brand" className="h-8 px-3 text-[13px]">
                  {f}
                </Badge>
              ))}
            </div>
          )}

          <h2 className="mb-3 mt-7 text-[17px] font-semibold">Consultations</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {physio.consult.inClinic.enabled && (
              <Card className="flex items-center gap-3 p-4">
                <Building2 size={20} className="text-brand" />
                <div>
                  <div className="font-semibold">In-clinic</div>
                  <div className="text-[13px] text-muted">
                    ₹{physio.consult.inClinic.fee} · {physio.consult.inClinic.minutes} min
                  </div>
                </div>
              </Card>
            )}
            {physio.consult.homeVisit.enabled && (
              <Card className="flex items-center gap-3 p-4">
                <House size={20} className="text-brand" />
                <div>
                  <div className="font-semibold">Home visit</div>
                  <div className="text-[13px] text-muted">
                    ₹{physio.consult.homeVisit.fee} · within {physio.consult.homeVisit.radiusKm} km
                  </div>
                </div>
              </Card>
            )}
          </div>

          {physio.clinic && (
            <>
              <h2 className="mb-3 mt-7 text-[17px] font-semibold">Clinic</h2>
              <Card className="p-4">
                <div className="font-semibold">{physio.clinic.name}</div>
                <div className="mt-1 text-[14px] text-muted">{physio.clinic.address}</div>
                <div className="mt-2 flex items-center gap-1.5 text-[14px] text-muted">
                  <Clock size={14} /> {days}
                  {physio.hours ? ` · ${fmtTime(physio.hours.start)}–${fmtTime(physio.hours.end)}` : ''}
                </div>
                <button onClick={() => openMaps(physio.clinic!.address)} className="mt-3 text-[14px] font-semibold text-wa cursor-pointer">
                  Get directions →
                </button>
              </Card>
            </>
          )}
          <p className="mt-6 text-[13px] text-muted">
            {doc} uses Betterhood to send exercise plans and prescriptions on WhatsApp — no app needed.
          </p>
        </div>

        <aside className="mt-8 lg:mt-0">
          <Card className="p-5 lg:sticky lg:top-6">
            {sent ? (
              <div className="py-4 text-center">
                <div className="anim-pop mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok text-white">
                  <Check size={28} strokeWidth={3} />
                </div>
                <h2 className="mt-4 text-[20px] font-semibold">Request sent</h2>
                <p className="mt-1 text-[14px] text-muted">
                  {fmtDay(sent.date)}, {fmtTime(sent.time)}. {doc} will confirm on WhatsApp.
                </p>
              </div>
            ) : (
              <>
                <h2 className="mb-4 text-[19px] font-semibold">Book a session</h2>
                {error && <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-[14px] text-danger">{error}</p>}
                <BookingRequest
                  physio={physio}
                  bookings={taken}
                  busy={sending}
                  onSubmit={async (v) => {
                    if (apiMode) {
                      setSending(true)
                      setError('')
                      try {
                        await api(`/public/physios/${encodeURIComponent(physio.slug)}/booking-requests`, {
                          body: { name: v.name, phone: v.phone, date: v.date, time: v.time, visitType: 'in_clinic', reason: v.reason || undefined },
                        })
                        setSent({ date: v.date, time: v.time })
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Couldn’t send your request')
                      } finally {
                        setSending(false)
                      }
                      return
                    }
                    store.addBooking({
                      physioId: physio.id,
                      patientId: store.db.patients.find((p) => p.phone === v.phone && p.physioId === physio.id)?.id,
                      patientName: v.name,
                      patientPhone: v.phone,
                      date: v.date,
                      time: v.time,
                      visitType: 'in_clinic',
                      reason: v.reason || undefined,
                      isNewPatient: !store.db.patients.some((p) => p.phone === v.phone && p.physioId === physio.id),
                      status: 'requested',
                      sendConfirmation: true,
                      reminder: true,
                      source: 'public_profile',
                    })
                    setSent({ date: v.date, time: v.time })
                  }}
                />
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}

import { ExternalLink } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookingFlow } from '../../components/BookingFlow'
import { Logo } from '../../components/Logo'
import { api, apiMode } from '../../lib/api'
import { usePublicPhysio } from '../../lib/publicData'
import { useStore } from '../../lib/store'

// Public, Calendly-style booking page: /dr/:slug/book (share it on WhatsApp, Instagram, Google).
export default function PublicBook() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const store = useStore()
  const { physio, cal, loading, reload } = usePublicPhysio(slug)

  if (loading)
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )
  if (!physio || !cal)
    return (
      <div className="mx-auto max-w-[480px] px-6 py-20 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-8 font-display text-[22px] font-bold">Booking page not found</h1>
        <p className="mt-2 text-muted">This link may have changed.</p>
      </div>
    )

  const existing = (phone: string) => store.db.patients.find((p) => p.phone === phone && p.physioId === physio.id)

  return (
    <div className="min-h-full">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-5">
          <Logo />
          <Link to={`/dr/${physio.slug}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand">
            <ExternalLink size={15} /> Profile
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-[960px] px-4 py-6 lg:py-10">
        <BookingFlow
          physio={physio}
          cal={cal}
          initialGroupId={params.get('group') ?? undefined}
          onBook={async (v) => {
            if (apiMode) {
              await api(`/public/physios/${encodeURIComponent(physio.slug)}/booking-requests`, {
                body: { name: v.name, phone: v.phone, date: v.date, time: v.time, visitType: v.visitType, reason: v.reason, address: v.address, location: v.location },
              })
              reload()
              return
            }
            const pt = existing(v.phone)
            store.addBooking({
              physioId: physio.id,
              patientId: pt?.id,
              patientName: v.name,
              patientPhone: v.phone,
              date: v.date,
              time: v.time,
              visitType: v.visitType,
              reason: v.reason,
              address: v.address,
              location: v.location,
              isNewPatient: !pt,
              status: 'requested',
              sendConfirmation: true,
              reminder: true,
              source: 'public_profile',
            })
          }}
          onJoinGroup={async (groupId, who) => {
            if (apiMode) {
              await api(`/public/physios/${encodeURIComponent(physio.slug)}/groups/${groupId}/join`, { body: who })
              reload()
              return
            }
            store.addParticipant(groupId, { patientId: existing(who.phone)?.id, ...who })
          }}
        />
        <p className="mt-6 text-center text-[12px] text-faint">Powered by Betterhood · Times shown in IST</p>
      </div>
    </div>
  )
}

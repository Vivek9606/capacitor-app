import { BadgeCheck, Briefcase, Building2, CalendarCheck, Clock, House, MapPin, Share2, UsersRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { openGroups } from '../../components/BookingFlow'
import { Logo } from '../../components/Logo'
import { Avatar, Badge, Button, Card, IconButton } from '../../components/ui'
import { fmtTime, relDay } from '../../lib/dates'
import { inr } from '../../lib/invoices'
import { firstName } from '../../lib/logic'
import { openMaps, publicUrl, shareLink } from '../../lib/platform'
import { modesOf } from '../../lib/practice'
import { usePublicPhysio } from '../../lib/publicData'

// PW2 · Physio public profile — /dr/:slug. No login. Indexable (SSR/prerender in Phase 2).
export default function PublicProfile() {
  const { slug } = useParams()
  const nav = useNavigate()
  const { physio, cal, loading } = usePublicPhysio(slug)

  if (loading)
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )

  if (!physio)
    return (
      <div className="mx-auto max-w-[480px] px-6 py-20 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-8 font-display text-[22px] font-bold">Profile not found</h1>
        <p className="mt-2 text-muted">This physio link may have changed.</p>
      </div>
    )

  const bookPath = `/dr/${physio.slug}/book`
  const modes = modesOf(physio)
  const groups = openGroups(physio, cal?.groups).slice(0, 4)
  const doc = `Dr. ${firstName(physio.name)}`
  const days = physio.workingDays.length === 7 ? 'All days' : physio.workingDays.join(', ')

  return (
    <div className="min-h-full">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-[1040px] items-center justify-between px-5">
          <Logo />
          <IconButton aria-label="Share profile" onClick={() => shareLink({ title: physio.name, text: `Book a session with ${physio.name}:`, url: publicUrl(bookPath) })}>
            <Share2 size={17} />
          </IconButton>
        </div>
      </header>
      <div className="mx-auto max-w-[1040px] px-5 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10 lg:py-10">
        <div>
          <div className="flex items-center gap-4">
            <Avatar name={physio.name} photo={physio.photo} size={84} />
            <div>
              <h1 className="flex items-center gap-1.5 font-display text-[24px] font-bold leading-tight tracking-[-0.01em]">
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
                  <div className="font-semibold">{modes.includes('clinic') ? 'In-clinic' : 'In-person'}</div>
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
                    ₹{physio.consult.homeVisit.fee} · {physio.consult.homeVisit.minutes ?? 60} min · within {physio.consult.homeVisit.radiusKm} km
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
          {modes.includes('individual') && (physio.practice?.locations?.length ?? 0) > 0 && (
            <>
              <h2 className="mb-3 mt-7 text-[17px] font-semibold">Where {doc} consults</h2>
              <div className="flex flex-col gap-2.5">
                {physio.practice!.locations!.map((l) => (
                  <Card key={l.id} className="flex items-start gap-3 p-4">
                    <Briefcase size={18} className="mt-0.5 shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{l.name}</div>
                      <div className="text-[14px] text-muted">{l.address}</div>
                      <div className="mt-1 text-[13px] text-muted">{l.days.join(', ')}</div>
                    </div>
                    <button onClick={() => openMaps(l.address)} aria-label={`Directions to ${l.name}`} className="text-wa cursor-pointer">
                      <MapPin size={18} />
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}
          {modes.includes('home') && physio.practice?.serviceArea && (
            <>
              <h2 className="mb-3 mt-7 text-[17px] font-semibold">Home visits</h2>
              <Card className="flex items-start gap-3 p-4">
                <House size={18} className="mt-0.5 shrink-0 text-brand" />
                <div className="text-[14px]">
                  <div className="font-semibold">Covers {physio.practice.serviceArea}</div>
                  <div className="text-muted">Treatment at your home, within {physio.consult.homeVisit.radiusKm} km.</div>
                </div>
              </Card>
            </>
          )}
          <p className="mt-6 text-[13px] text-muted">
            {doc} uses Betterhood to send exercise plans and treatment plans on WhatsApp — no app needed.
          </p>
        </div>

        <aside className="mt-8 lg:mt-0">
          <Card className="p-5 lg:sticky lg:top-6">
            <h2 className="font-display text-[19px] font-bold">Book a session</h2>
            <p className="mt-1 text-[14px] text-muted">Pick a visit type and an open time. {doc} confirms on WhatsApp.</p>
            <div className="mt-4 flex flex-col gap-2">
              {physio.consult.inClinic.enabled && (
                <button onClick={() => nav(bookPath)} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left hover:border-brand cursor-pointer">
                  <Building2 size={18} className="shrink-0 text-brand" />
                  <span className="flex-1 text-[15px] font-medium">{modes.includes('clinic') ? 'In-clinic' : 'Consultation'}</span>
                  <span className="text-[13px] text-muted">{inr(physio.consult.inClinic.fee)}</span>
                </button>
              )}
              {physio.consult.homeVisit.enabled && (
                <button onClick={() => nav(bookPath)} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left hover:border-brand cursor-pointer">
                  <House size={18} className="shrink-0 text-brand" />
                  <span className="flex-1 text-[15px] font-medium">Home visit</span>
                  <span className="text-[13px] text-muted">{inr(physio.consult.homeVisit.fee)}</span>
                </button>
              )}
            </div>
            <Button block className="mt-4" onClick={() => nav(bookPath)}>
              <CalendarCheck size={18} /> See open times
            </Button>
            {groups.length > 0 && (
              <>
                <div className="mb-2 mt-5 flex items-center gap-1.5 text-[14px] font-semibold">
                  <UsersRound size={16} className="text-brand" /> Group classes
                </div>
                <div className="flex flex-col gap-2">
                  {groups.map((g) => (
                    <Link key={g.id} to={`${bookPath}?group=${g.id}`} className="rounded-xl bg-bg px-3.5 py-2.5 hover:bg-brand-soft/60">
                      <div className="text-[14px] font-semibold">{g.title}</div>
                      <div className="text-[12px] text-muted">
                        {relDay(g.date)} · {fmtTime(g.time)} · {g.fee ? inr(g.fee) : 'Free'} · {g.capacity - g.participants.filter((p) => p.status !== 'cancelled').length} seats left
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}

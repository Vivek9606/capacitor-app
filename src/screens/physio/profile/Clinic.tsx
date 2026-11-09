import { Building2, ChevronRight, Clock, House, LocateFixed, MapPin, Plus, Trash2, Video } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PracticeModePicker } from '../../../components/PracticeModePicker'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, IconTile, Input, PageHeader, SoonBadge, Toggle } from '../../../components/ui'
import { WEEK_ORDER } from '../../../lib/dates'
import { uid } from '../../../lib/logic'
import { haptic, toast } from '../../../lib/platform'
import { modeLabels, modesOf } from '../../../lib/practice'
import { useMe, useStore } from '../../../lib/store'
import type { PracticeLocation, PracticeMode } from '../../../lib/types'

const TRAVEL = [0, 15, 20, 30, 45]

// P2 · Practice setup — adapts to clinic, home visits and/or individual (visiting) practice.
export default function Clinic() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [modes, setModes] = useState<PracticeMode[]>(() => (physio ? modesOf(physio) : ['clinic']))
  const [f, setF] = useState(() => ({
    name: physio?.clinic?.name ?? '',
    address: physio?.clinic?.address ?? '',
    area: physio?.clinic?.area ?? '',
    consult: {
      inClinic: physio?.consult.inClinic ?? { enabled: true, fee: 800, minutes: 45 },
      homeVisit: { minutes: 60, ...(physio?.consult.homeVisit ?? { enabled: false, fee: 1200, radiusKm: 5 }) },
    },
    serviceArea: physio?.practice?.serviceArea ?? '',
    travel: physio?.practice?.travelBufferMin ?? 15,
    locations: physio?.practice?.locations ?? ([] as PracticeLocation[]),
  }))
  const [locating, setLocating] = useState(false)
  if (!physio) return null

  const has = (m: PracticeMode) => modes.includes(m)
  const locate = () => {
    if (!navigator.geolocation) return toast('Location isn’t available on this device')
    setLocating(true)
    // Phase 2: @capacitor/geolocation in the app + reverse geocoding (Google Maps) to fill the address.
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false)
        toast('Location found — pin placed. Confirm the address below.')
      },
      () => {
        setLocating(false)
        toast('Couldn’t get your location. Type the address instead.')
      },
      { timeout: 8000 },
    )
  }

  const locsValid = f.locations.every((l) => l.name.trim() && l.address.trim() && l.days.length)
  const valid =
    modes.length > 0 &&
    (!has('clinic') || f.address.trim().length > 5) &&
    (!has('home') || f.serviceArea.trim().length > 1) &&
    (!has('individual') || (f.locations.length > 0 && locsValid))

  const save = () => {
    haptic('success')
    const inPerson = has('clinic') || has('individual')
    store.updatePhysio(physio.id, {
      clinic: has('clinic')
        ? { name: f.name.trim() || `${physio.name} Physio`, address: f.address.trim(), area: f.area.trim() || f.address.split(',')[1]?.trim() || '' }
        : undefined,
      practice: {
        modes,
        serviceArea: has('home') ? f.serviceArea.trim() : undefined,
        travelBufferMin: has('home') ? f.travel : undefined,
        locations: has('individual') ? f.locations.map((l) => ({ ...l, name: l.name.trim(), address: l.address.trim() })) : undefined,
      },
      practiceSettings: modeLabels(modes),
      consult: {
        inClinic: { ...f.consult.inClinic, enabled: inPerson && f.consult.inClinic.enabled },
        homeVisit: { ...f.consult.homeVisit, enabled: has('home') },
      },
    })
    toast('Practice saved — your booking page is updated')
    nav('/app/profile', { replace: true })
  }

  const setIn = (patch: Partial<typeof f.consult.inClinic>) => setF({ ...f, consult: { ...f.consult, inClinic: { ...f.consult.inClinic, ...patch } } })
  const setHome = (patch: Partial<typeof f.consult.homeVisit>) => setF({ ...f, consult: { ...f.consult, homeVisit: { ...f.consult.homeVisit, ...patch } } })
  const setLoc = (id: string, patch: Partial<PracticeLocation>) => setF({ ...f, locations: f.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  const num = (v: string) => Number(v.replace(/\D/g, '')) || 0

  return (
    <Page wide>
      <PageHeader title="Practice setup" subtitle="How and where you see patients" />
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <h3 className="mb-3 text-[16px] font-semibold">How do you practise?</h3>
          <PracticeModePicker value={modes} onChange={setModes} />

          {has('clinic') && (
            <section className="mt-6">
              <h3 className="mb-3 text-[16px] font-semibold">Your clinic</h3>
              <div className="relative h-[150px] overflow-hidden rounded-2xl bg-[#e6eee9] lg:h-[180px]">
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 300 150" aria-hidden>
                  <path d="M0 45 H300 M0 110 H300 M95 0 V150 M215 0 V150" stroke="#fff" strokeWidth="9" />
                  <path d="M0 80 H300 M160 0 V150" stroke="#fff" strokeWidth="4" />
                </svg>
                <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-full text-accent">
                  <MapPin size={36} fill="#fdeadf" strokeWidth={2} />
                </div>
                {(f.name || f.area) && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface px-3 py-1 text-[12px] font-semibold shadow">
                    {[f.name, f.area].filter(Boolean).join(' · ')}
                  </div>
                )}
                <button onClick={locate} className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold text-brand shadow cursor-pointer">
                  <LocateFixed size={14} /> {locating ? 'Locating…' : 'Use my location'}
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <Input label="Clinic name" placeholder="Betterhood Physio" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <Input label="Clinic address" placeholder="HAL 2nd Stage, Indiranagar, Bengaluru" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
                <Input label="Area (shown to patients)" placeholder="Indiranagar" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
              </div>
            </section>
          )}

          {has('individual') && (
            <section className="mt-6">
              <h3 className="text-[16px] font-semibold">Where you consult</h3>
              <p className="mb-3 text-[13px] text-muted">Hospitals, gyms, sports clubs or partner clinics — and the days you’re there.</p>
              <div className="flex flex-col gap-3">
                {f.locations.map((l) => (
                  <Card key={l.id} className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <Input label="Place" placeholder="Fortis Hospital — OPD 3" value={l.name} onChange={(e) => setLoc(l.id, { name: e.target.value })} />
                        </div>
                        <button aria-label="Remove location" onClick={() => setF({ ...f, locations: f.locations.filter((x) => x.id !== l.id) })} className="mt-8 grid h-10 w-10 place-items-center text-muted hover:text-danger cursor-pointer">
                          <Trash2 size={17} />
                        </button>
                      </div>
                      <Input label="Address" placeholder="Bannerghatta Rd, Bengaluru" value={l.address} onChange={(e) => setLoc(l.id, { address: e.target.value })} />
                      <div className="flex flex-wrap gap-1.5">
                        {WEEK_ORDER.map((d) => (
                          <Chip key={d} className="h-9 px-3" selected={l.days.includes(d)} onClick={() => setLoc(l.id, { days: l.days.includes(d) ? l.days.filter((x) => x !== d) : [...l.days, d] })}>
                            {d}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="soft" size="md" className="self-start" onClick={() => setF({ ...f, locations: [...f.locations, { id: uid('lc'), name: '', address: '', days: [] }] })}>
                  <Plus size={16} /> Add a place
                </Button>
              </div>
            </section>
          )}

          {has('home') && (
            <section className="mt-6">
              <h3 className="mb-3 text-[16px] font-semibold">Home visits</h3>
              <div className="flex flex-col gap-3">
                <Input label="Areas you cover" placeholder="Indiranagar, Domlur, Koramangala" value={f.serviceArea} onChange={(e) => setF({ ...f, serviceArea: e.target.value })} />
                <div>
                  <div className="mb-1.5 text-[13px] text-muted">Travel time kept free around each visit</div>
                  <div className="flex flex-wrap gap-2">
                    {TRAVEL.map((n) => (
                      <Chip key={n} selected={f.travel === n} onClick={() => setF({ ...f, travel: n })}>
                        {n ? `${n} min` : 'None'}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <div>
          <h3 className="mb-3 mt-6 text-[16px] font-semibold lg:mt-0">Consult types & fees</h3>
          <Card className="divide-y divide-line px-4">
            {(has('clinic') || has('individual')) && (
              <div className="py-3.5">
                <div className="flex items-center gap-3">
                  <IconTile>
                    <Building2 size={18} />
                  </IconTile>
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">{has('clinic') ? 'In-clinic' : 'In-person consult'}</div>
                    <div className="text-[13px] text-muted">
                      ₹{f.consult.inClinic.fee} · {f.consult.inClinic.minutes} min
                    </div>
                  </div>
                  <Toggle label="In-clinic" checked={f.consult.inClinic.enabled} onChange={(v) => setIn({ enabled: v })} />
                </div>
                {f.consult.inClinic.enabled && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Input label="Fee (₹)" inputMode="numeric" value={String(f.consult.inClinic.fee)} onChange={(e) => setIn({ fee: num(e.target.value) })} />
                    <Input label="Minutes" inputMode="numeric" value={String(f.consult.inClinic.minutes)} onChange={(e) => setIn({ minutes: num(e.target.value) })} />
                  </div>
                )}
              </div>
            )}
            {has('home') && (
              <div className="py-3.5">
                <div className="flex items-center gap-3">
                  <IconTile>
                    <House size={18} />
                  </IconTile>
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">Home visit</div>
                    <div className="text-[13px] text-muted">
                      ₹{f.consult.homeVisit.fee} · {f.consult.homeVisit.minutes} min · within {f.consult.homeVisit.radiusKm} km
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <Input label="Fee (₹)" inputMode="numeric" value={String(f.consult.homeVisit.fee)} onChange={(e) => setHome({ fee: num(e.target.value) })} />
                  <Input label="Minutes" inputMode="numeric" value={String(f.consult.homeVisit.minutes)} onChange={(e) => setHome({ minutes: num(e.target.value) })} />
                  <Input label="Radius km" inputMode="numeric" value={String(f.consult.homeVisit.radiusKm)} onChange={(e) => setHome({ radiusKm: num(e.target.value) })} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 py-3.5 opacity-60">
              <IconTile>
                <Video size={18} />
              </IconTile>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[15px] font-semibold">
                  Teleconsult <SoonBadge />
                </div>
                <div className="text-[13px] text-muted">Video + payments</div>
              </div>
              <Toggle label="Teleconsult" checked={false} disabled onChange={() => {}} />
            </div>
          </Card>

          <Card className="mt-4 flex items-center gap-3 p-4" onClick={() => nav('/app/profile/availability')}>
            <IconTile tone="lime">
              <Clock size={18} />
            </IconTile>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">Weekly hours & booking rules</div>
              <div className="text-[13px] text-muted">Open times, breaks, notice and how far ahead patients can book</div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </Card>
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={!valid} onClick={save}>
          Save practice
        </Button>
      </Footer>
    </Page>
  )
}

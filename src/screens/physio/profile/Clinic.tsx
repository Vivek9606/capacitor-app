import { Building2, House, LocateFixed, MapPin, Video } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, IconTile, Input, Label, PageHeader, SoonBadge, Toggle } from '../../../components/ui'
import { WEEK_ORDER } from '../../../lib/dates'
import { profileCompletion } from '../../../lib/logic'
import { haptic, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

// P2 · Clinic & availability
export default function Clinic() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [f, setF] = useState(() => ({
    name: physio?.clinic?.name ?? '',
    address: physio?.clinic?.address ?? '',
    area: physio?.clinic?.area ?? '',
    consult: physio?.consult ?? { inClinic: { enabled: true, fee: 800, minutes: 45 }, homeVisit: { enabled: false, fee: 1200, radiusKm: 5 } },
    days: physio?.workingDays ?? [],
    start: physio?.hours?.start ?? '09:00',
    end: physio?.hours?.end ?? '18:30',
  }))
  const [locating, setLocating] = useState(false)
  if (!physio) return null
  const step = profileCompletion(physio).steps.findIndex((s) => s.key === 'clinic') + 1

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

  const valid = f.address.trim().length > 5 && f.days.length > 0
  const save = () => {
    haptic('success')
    store.updatePhysio(physio.id, {
      clinic: { name: f.name.trim() || `${physio.name} Physio`, address: f.address.trim(), area: f.area.trim() || f.address.split(',')[1]?.trim() || '' },
      consult: f.consult,
      workingDays: WEEK_ORDER.filter((d) => f.days.includes(d)),
      hours: { start: f.start, end: f.end },
    })
    toast('Saved — you’re now on the Betterhood map')
    nav('/app/profile', { replace: true })
  }

  const setConsult = (patch: Partial<typeof f.consult>) => setF({ ...f, consult: { ...f.consult, ...patch } })

  return (
    <Page wide>
      <PageHeader title="Clinic & availability" subtitle={`Profile step ${step} of 5`} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <div className="relative h-[150px] overflow-hidden rounded-2xl bg-[#e6eee9] lg:h-[220px]">
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
            <button
              onClick={locate}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold text-brand shadow cursor-pointer"
            >
              <LocateFixed size={14} /> {locating ? 'Locating…' : 'Use my location'}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Input label="Clinic name" placeholder="Betterhood Physio" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Input label="Clinic address" placeholder="HAL 2nd Stage, Indiranagar, Bengaluru" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            <Input label="Area (shown to patients)" placeholder="Indiranagar" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} />
          </div>
        </div>

        <div>
          <h3 className="mb-3 mt-6 text-[16px] font-semibold lg:mt-0">Consult types</h3>
          <Card className="divide-y divide-line px-4">
            <div className="py-3.5">
              <div className="flex items-center gap-3">
                <IconTile>
                  <Building2 size={18} />
                </IconTile>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">In-clinic</div>
                  <div className="text-[13px] text-muted">
                    ₹{f.consult.inClinic.fee} · {f.consult.inClinic.minutes} min
                  </div>
                </div>
                <Toggle label="In-clinic" checked={f.consult.inClinic.enabled} onChange={(v) => setConsult({ inClinic: { ...f.consult.inClinic, enabled: v } })} />
              </div>
              {f.consult.inClinic.enabled && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input label="Fee (₹)" inputMode="numeric" value={String(f.consult.inClinic.fee)} onChange={(e) => setConsult({ inClinic: { ...f.consult.inClinic, fee: Number(e.target.value.replace(/\D/g, '')) || 0 } })} />
                  <Input label="Minutes" inputMode="numeric" value={String(f.consult.inClinic.minutes)} onChange={(e) => setConsult({ inClinic: { ...f.consult.inClinic, minutes: Number(e.target.value.replace(/\D/g, '')) || 0 } })} />
                </div>
              )}
            </div>
            <div className="py-3.5">
              <div className="flex items-center gap-3">
                <IconTile>
                  <House size={18} />
                </IconTile>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">Home visits</div>
                  <div className="text-[13px] text-muted">
                    {f.consult.homeVisit.enabled ? `₹${f.consult.homeVisit.fee} · within ${f.consult.homeVisit.radiusKm} km` : 'Set fee & radius'}
                  </div>
                </div>
                <Toggle label="Home visits" checked={f.consult.homeVisit.enabled} onChange={(v) => setConsult({ homeVisit: { ...f.consult.homeVisit, enabled: v } })} />
              </div>
              {f.consult.homeVisit.enabled && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input label="Fee (₹)" inputMode="numeric" value={String(f.consult.homeVisit.fee)} onChange={(e) => setConsult({ homeVisit: { ...f.consult.homeVisit, fee: Number(e.target.value.replace(/\D/g, '')) || 0 } })} />
                  <Input label="Radius (km)" inputMode="numeric" value={String(f.consult.homeVisit.radiusKm)} onChange={(e) => setConsult({ homeVisit: { ...f.consult.homeVisit, radiusKm: Number(e.target.value.replace(/\D/g, '')) || 0 } })} />
                </div>
              )}
            </div>
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

          <h3 className="mb-3 mt-6 text-[16px] font-semibold">Working days</h3>
          <div className="flex flex-wrap gap-2">
            {WEEK_ORDER.map((d) => (
              <Chip key={d} selected={f.days.includes(d)} onClick={() => setF({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] })}>
                {d}
              </Chip>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label>
              <Label>Opens</Label>
              <input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} className="h-[52px] w-full rounded-xl border border-line bg-surface px-4 outline-none focus:border-brand" />
            </label>
            <label>
              <Label>Closes</Label>
              <input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} className="h-[52px] w-full rounded-xl border border-line bg-surface px-4 outline-none focus:border-brand" />
            </label>
          </div>
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={!valid} onClick={save}>
          Save & show me on the map
        </Button>
      </Footer>
    </Page>
  )
}

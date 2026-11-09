import { Copy, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, PageHeader, Toggle } from '../../../components/ui'
import { WEEK_ORDER } from '../../../lib/dates'
import { haptic, toast } from '../../../lib/platform'
import { DEFAULT_AVAILABILITY, effectiveAvailability, fromMin, summariseAvailability, toMin } from '../../../lib/slots'
import { useMe, useStore } from '../../../lib/store'
import type { Availability as Avail, TimeRange } from '../../../lib/types'

const STEPS = [15, 30, 60]
const BUFFERS = [0, 10, 15, 30]
const NOTICE = [1, 2, 4, 12, 24]
const AHEAD = [7, 14, 30, 60, 90]

const overlaps = (ws: TimeRange[]) => {
  const s = [...ws].sort((a, b) => a.start.localeCompare(b.start))
  return s.some((w, i) => w.start >= w.end || (i > 0 && w.start < s[i - 1].end))
}

// Weekly hours, Calendly-style: several windows per day, slot length, buffer, notice and booking window.
export default function Availability() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [a, setA] = useState<Avail>(() => structuredClone(physio ? effectiveAvailability(physio) : DEFAULT_AVAILABILITY))
  if (!physio) return null

  const setDay = (d: string, ws: TimeRange[]) => setA({ ...a, weekly: { ...a.weekly, [d]: ws } })
  const bad = WEEK_ORDER.filter((d) => overlaps(a.weekly[d] ?? []))
  const anyOpen = WEEK_ORDER.some((d) => (a.weekly[d] ?? []).length > 0)

  const save = () => {
    haptic('success')
    store.updatePhysio(physio.id, { availability: a, ...summariseAvailability(a) })
    toast('Availability saved — your booking page is updated')
    nav(-1)
  }

  return (
    <Page wide>
      <PageHeader title="Availability" subtitle="When patients can book you" />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          <h3 className="mb-3 text-[16px] font-semibold">Weekly hours</h3>
          <Card className="divide-y divide-line">
            {WEEK_ORDER.map((d) => {
              const ws = a.weekly[d] ?? []
              const on = ws.length > 0
              return (
                <div key={d} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Toggle label={`Open on ${d}`} checked={on} onChange={(v) => setDay(d, v ? [{ start: '09:00', end: '17:00' }] : [])} />
                    <div className="w-10 text-[15px] font-semibold">{d}</div>
                    {!on && <div className="flex-1 text-[14px] text-muted">Unavailable</div>}
                    {on && (
                      <div className="flex flex-1 flex-col gap-2">
                        {ws.map((w, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <input
                              type="time"
                              step={900}
                              aria-label={`${d} window ${i + 1} start`}
                              value={w.start}
                              onChange={(e) => setDay(d, ws.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[14px] outline-none focus:border-brand"
                            />
                            <span className="text-muted">–</span>
                            <input
                              type="time"
                              step={900}
                              aria-label={`${d} window ${i + 1} end`}
                              value={w.end}
                              onChange={(e) => setDay(d, ws.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[14px] outline-none focus:border-brand"
                            />
                            <button aria-label="Remove window" className="grid h-8 w-8 place-items-center text-muted hover:text-ink cursor-pointer" onClick={() => setDay(d, ws.filter((_, j) => j !== i))}>
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {on && (
                      <button
                        aria-label={`Add hours on ${d}`}
                        title="Add another window (e.g. evening)"
                        className="grid h-8 w-8 place-items-center self-start rounded-full text-brand hover:bg-brand-soft cursor-pointer"
                        onClick={() => {
                          const last = ws[ws.length - 1]
                          const s = Math.min(toMin(last.end) + 60, 22 * 60)
                          setDay(d, [...ws, { start: fromMin(s), end: fromMin(Math.min(s + 120, 23 * 60)) }])
                        }}
                      >
                        <Plus size={17} />
                      </button>
                    )}
                  </div>
                  {bad.includes(d) && <p className="mt-2 pl-[100px] text-[12px] text-danger">Windows overlap or end before they start.</p>}
                </div>
              )
            })}
          </Card>
          <button
            className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand cursor-pointer"
            onClick={() => {
              const mon = a.weekly.Mon ?? []
              setA({ ...a, weekly: { ...a.weekly, ...Object.fromEntries(['Tue', 'Wed', 'Thu', 'Fri'].map((d) => [d, structuredClone(mon)])) } })
            }}
          >
            <Copy size={15} /> Copy Monday to Tue–Fri
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:mt-0">
          <Setting title="Start times every" sub="How often slots begin">
            {STEPS.map((n) => (
              <Chip key={n} selected={a.slotStepMin === n} onClick={() => setA({ ...a, slotStepMin: n })}>
                {n === 60 ? '1 hr' : `${n} min`}
              </Chip>
            ))}
          </Setting>
          <Setting title="Break after each appointment" sub="Time to write notes and reset">
            {BUFFERS.map((n) => (
              <Chip key={n} selected={a.bufferMin === n} onClick={() => setA({ ...a, bufferMin: n })}>
                {n ? `${n} min` : 'None'}
              </Chip>
            ))}
          </Setting>
          <Setting title="Minimum notice" sub="Patients can’t book later than this before a slot">
            {NOTICE.map((n) => (
              <Chip key={n} selected={a.minNoticeHours === n} onClick={() => setA({ ...a, minNoticeHours: n })}>
                {n < 24 ? `${n} hr` : '1 day'}
              </Chip>
            ))}
          </Setting>
          <Setting title="Booking window" sub="How far ahead patients can book">
            {AHEAD.map((n) => (
              <Chip key={n} selected={a.maxDaysAhead === n} onClick={() => setA({ ...a, maxDaysAhead: n })}>
                {n < 30 ? `${n / 7} wk` : `${n / 30} mo`}
              </Chip>
            ))}
          </Setting>
          <Card className="p-4 text-[14px] text-muted">
            Appointment lengths come from your consult types ({physio.consult.inClinic.minutes} min in-clinic
            {physio.consult.homeVisit.enabled ? `, ${physio.consult.homeVisit.minutes ?? 60} min home visit` : ''}).{' '}
            <button className="font-semibold text-brand cursor-pointer" onClick={() => nav('/app/profile/clinic')}>
              Edit
            </button>
            . To take time off, use <b>Block</b> on the Schedule.
          </Card>
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={bad.length > 0 || !anyOpen} onClick={save}>
          Save availability
        </Button>
      </Footer>
    </Page>
  )
}

function Setting({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[16px] font-semibold">{title}</h3>
      <p className="mb-3 text-[13px] text-muted">{sub}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

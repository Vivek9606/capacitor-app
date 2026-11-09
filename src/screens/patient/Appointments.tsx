import { CalendarDays, ChevronRight, MapPin, Navigation, Plus, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookingBadge, VISIT_LABEL } from '../../components/bits'
import { Page } from '../../components/Shell'
import { Badge, Button, Card, Empty, PageHeader, SectionTitle, Sheet, TextArea } from '../../components/ui'
import { inr } from '../../lib/invoices'
import { fmtDay, fmtShort, fmtTime, relDay } from '../../lib/dates'
import { firstName } from '../../lib/logic'
import { patientView } from '../../lib/patientData'
import { haptic, openMaps, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import type { Booking } from '../../lib/types'

// Patient · Visits (appointments)
export default function Appointments() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [resched, setResched] = useState<Booking>()
  const [pref, setPref] = useState('')
  if (!patient) return null
  const v = patientView(store.db, patient)
  const doc = `Dr. ${firstName(v.physio.name)}`

  return (
    <Page wide>
      <PageHeader
        back={false}
        title="Visits"
        subtitle={`With ${v.physio.name}`}
        right={
          <Button size="sm" variant="soft" onClick={() => nav('/me/book')}>
            <Plus size={16} /> Book
          </Button>
        }
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          <h2 className="mb-3 text-[17px] font-semibold">Upcoming</h2>
          {v.upcoming.length === 0 ? (
            <Card>
              <Empty icon={<CalendarDays size={20} />} title="No upcoming visits" action={<Button size="md" onClick={() => nav('/me/book')}>Book a visit</Button>} />
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {v.upcoming.map((b) => (
                <Card key={b.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[17px] font-semibold">
                        {relDay(b.date)} · {fmtTime(b.time)}
                      </div>
                      <div className="text-[13px] text-muted">
                        {VISIT_LABEL[b.visitType]}
                        {b.visitType === 'in_clinic' && v.physio.clinic ? ` · ${v.physio.clinic.name}, ${v.physio.clinic.area}` : ''}
                      </div>
                    </div>
                    <BookingBadge status={b.status === 'requested' ? 'requested' : b.status} />
                  </div>
                  {b.status === 'requested' && <p className="mt-2 text-[13px] text-muted">Waiting for {doc} to accept. You’ll get a WhatsApp message.</p>}
                  {b.status === 'reschedule' && <p className="mt-2 text-[13px] text-muted">{doc} will suggest a new time on WhatsApp.</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(b.status === 'awaiting' || b.status === 'reminder_sent') && (
                      <Button
                        size="sm"
                        onClick={() => {
                          haptic('success')
                          store.updateBooking(b.id, { status: 'confirmed' })
                          toast('Confirmed — see you then')
                        }}
                      >
                        Confirm
                      </Button>
                    )}
                    {b.status !== 'requested' && b.status !== 'reschedule' && (
                      <Button size="sm" variant="secondary" onClick={() => setResched(b)}>
                        Reschedule
                      </Button>
                    )}
                    {b.visitType === 'in_clinic' && v.physio.clinic && (
                      <Button size="sm" variant="secondary" onClick={() => openMaps(v.physio.clinic!.address)}>
                        <Navigation size={14} /> Directions
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div>
          {v.upcomingGroups.length > 0 && (
            <>
              <SectionTitle className="lg:mt-0">Group classes</SectionTitle>
              <div className="mb-2 flex flex-col gap-3">
                {v.upcomingGroups.map((g) => (
                  <Card key={g.id} className="p-4">
                    <div className="flex items-center gap-2 text-[16px] font-semibold">
                      <UsersRound size={17} className="text-brand" /> {g.title}
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {relDay(g.date)} · {fmtTime(g.time)} · {g.minutes} min
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[13px] text-muted">
                      <MapPin size={13} /> {g.location}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
          <SectionTitle className={v.upcomingGroups.length ? undefined : 'lg:mt-0'}>Past visits</SectionTitle>
          {v.past.length === 0 ? (
            <p className="text-[14px] text-muted">No past visits yet.</p>
          ) : (
            <Card className="divide-y divide-line">
              {v.past.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-[15px] font-medium">{fmtDay(b.date)}</div>
                    <div className="text-[13px] text-muted">{b.reason ?? VISIT_LABEL[b.visitType]}</div>
                  </div>
                  {b.status === 'no_show' ? <Badge tone="warn">Missed</Badge> : <span className="text-[13px] text-muted">{fmtTime(b.time)}</span>}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
      {v.invoices.length > 0 && (
        <>
          <SectionTitle>Bills</SectionTitle>
          <Card className="divide-y divide-line lg:max-w-[560px]">
            {v.invoices.map((i) => (
              <button key={i.id} onClick={() => nav(`/me/invoices/${i.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">
                    {inr(i.total)} · {fmtShort(i.date)}
                  </div>
                  <div className="truncate text-[13px] text-muted">{i.items.map((x) => x.description).join(', ')}</div>
                </div>
                <Badge tone={i.status === 'paid' ? 'ok' : 'accent'}>{i.status === 'paid' ? 'Paid' : 'Due'}</Badge>
                <ChevronRight size={17} className="text-muted" />
              </button>
            ))}
          </Card>
        </>
      )}
      <div className="h-6" />

      <Sheet open={!!resched} onClose={() => setResched(undefined)} title="Ask to reschedule">
        {resched && (
          <div>
            <p className="text-[15px] text-muted">
              Currently {fmtDay(resched.date)}, {fmtTime(resched.time)}. {doc} will suggest a new time on WhatsApp.
            </p>
            <div className="mt-4">
              <TextArea label="When suits you? (optional)" rows={2} value={pref} onChange={(e) => setPref(e.target.value)} placeholder="e.g. Any evening after 5 PM" />
            </div>
            <Button
              block
              className="mt-5"
              onClick={() => {
                store.updateBooking(resched.id, { status: 'reschedule' })
                if (pref.trim()) store.sendMessage(v.physio.id, patient.id, 'patient', `Reschedule request: ${pref.trim()}`)
                toast(`Request sent to ${doc}`)
                setResched(undefined)
                setPref('')
              }}
            >
              Send request
            </Button>
          </div>
        )}
      </Sheet>
    </Page>
  )
}

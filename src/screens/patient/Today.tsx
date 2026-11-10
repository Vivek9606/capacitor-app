import { CalendarDays, Check, ChevronRight, Download, FileSignature, MessageSquare, Moon, Play, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookingBadge, VISIT_LABEL } from '../../components/bits'
import { ExerciseMedia } from '../../components/ExerciseMedia'
import { Page } from '../../components/Shell'
import { Avatar, Button, Card, Empty, RefreshButton, SectionTitle, WeekDots } from '../../components/ui'
import { fmtTime, greeting, relDay } from '../../lib/dates'
import { firstName } from '../../lib/logic'
import { patientView, estMinutes } from '../../lib/patientData'
import { isNative, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

function readDismissed() {
  try {
    return localStorage.getItem('bh-app-banner') === '1'
  } catch {
    return false
  }
}

// Patient · Today
export default function Today() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [bannerHidden, setBannerHidden] = useState(readDismissed)
  if (!patient) return null
  const v = patientView(store.db, patient)
  const doc = `Dr. ${firstName(v.physio.name)}`
  const next = v.upcoming[0]
  const exercises = v.plan?.items.map((i) => ({ item: i, ex: store.db.exercises.find((e) => e.id === i.exerciseId) })) ?? []

  const hideBanner = () => {
    setBannerHidden(true)
    try {
      localStorage.setItem('bh-app-banner', '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <Page wide>
      <header className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[13px] text-muted lg:text-[15px]">{greeting()},</div>
          <div className="font-display text-[22px] font-bold tracking-[-0.01em] lg:text-[28px]">{firstName(patient.name)}</div>
        </div>
        <button onClick={() => nav('/me/profile')} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 cursor-pointer lg:hidden">
          <Avatar name={v.physio.name} photo={v.physio.photo} size={30} />
          <span className="text-[13px] font-medium">{doc}</span>
        </button>
        <RefreshButton />
      </header>

      {v.pendingConsents.map((c) => (
        <Card key={c.id} className="mt-4 flex items-center gap-3 border-accent/40 bg-accent-soft p-4" onClick={() => nav(`/me/consents/${c.id}`)}>
          <FileSignature size={20} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">Please sign: {c.title}</div>
            <div className="text-[13px] text-muted">{doc} needs this before your treatment</div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Card>
      ))}

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          {!v.plan ? (
            <Card>
              <Empty icon={<CalendarDays size={20} />} title="No active plan right now" body={`${doc} will send your next plan on WhatsApp. You can still book a visit or ask a question.`} />
            </Card>
          ) : v.todayLog?.status === 'done' ? (
            <div className="bg-hero rounded-[24px] shadow-brand p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="anim-pop grid h-11 w-11 place-items-center rounded-full bg-ok">
                  <Check size={24} strokeWidth={3} />
                </div>
                <div>
                  <div className="font-display text-[18px] font-bold">Done for today</div>
                  <div className="text-[13px] text-white/75">
                    Pain logged: {v.todayLog.pain ?? '–'}/10 · {doc} can see your progress
                  </div>
                </div>
              </div>
              {v.nextSession && <div className="mt-4 text-[14px] text-white/80">Next session: {relDay(v.nextSession)}</div>}
            </div>
          ) : v.scheduledToday ? (
            <div className="bg-hero rounded-[24px] shadow-brand p-5 text-white">
              <div className="text-[13px] text-white/70">
                {v.plan.title} · Week {v.week} of {v.plan.weeks}
              </div>
              <div className="mt-1 font-display text-[22px] font-bold leading-tight">Today’s session</div>
              <div className="mt-1 text-[14px] text-white/80">
                {v.plan.items.length} exercises · about {estMinutes(v.plan.items)} min
              </div>
              <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
                {exercises.map(({ ex, item }) => (
                  <div key={item.exerciseId} className="w-[92px] shrink-0">
                    <ExerciseMedia region={ex?.region} size="sm" className="h-[60px]" />
                    <div className="mt-1 truncate text-[12px] text-white/85">{ex?.name}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => nav('/me/session')}
                className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white text-[16px] font-semibold text-brand cursor-pointer"
              >
                <Play size={18} fill="currentColor" /> Start session
              </button>
            </div>
          ) : (
            <div className="rounded-[22px] bg-brand-soft p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-surface text-brand">
                  <Moon size={20} />
                </div>
                <div>
                  <div className="font-display text-[18px] font-bold">Rest day</div>
                  <div className="text-[13px] text-muted">{v.nextSession ? `Next session: ${relDay(v.nextSession)}` : 'Your plan is complete'}</div>
                </div>
              </div>
              <button onClick={() => nav('/me/session')} className="mt-3 text-[14px] font-semibold text-brand cursor-pointer">
                Do an extra session anyway →
              </button>
            </div>
          )}

          {v.plan && (
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[16px] font-semibold">This week</div>
                {v.adherence && <div className="text-[14px] font-semibold text-brand">{v.adherence.pct}% on track</div>}
              </div>
              <WeekDots dots={v.dots} />
            </Card>
          )}

          {!isNative && v.hasDoneAnySession && !bannerHidden && (
            <div className="relative flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand font-display text-[18px] font-bold text-white">b</div>
              <div className="flex-1">
                <div className="text-[15px] font-semibold">Get the Betterhood app</div>
                <div className="text-[13px] text-muted">Reminders and offline videos. Optional — this page works too.</div>
              </div>
              <Button size="sm" variant="soft" onClick={() => toast('Store links go live at launch')}>
                <Download size={15} /> Get
              </Button>
              <button aria-label="Dismiss" onClick={hideBanner} className="absolute right-2 top-2 text-faint hover:text-muted cursor-pointer">
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:mt-0">
          <SectionTitle className="mt-3 lg:mt-0">Next visit</SectionTitle>
          {next ? (
            <Card className="p-4" onClick={() => nav('/me/appointments')}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[16px] font-semibold">
                    {relDay(next.date)} · {fmtTime(next.time)}
                  </div>
                  <div className="text-[13px] text-muted">
                    {VISIT_LABEL[next.visitType]}
                    {next.visitType === 'in_clinic' && v.physio.clinic ? ` · ${v.physio.clinic.name}` : ''}
                  </div>
                </div>
                <BookingBadge status={next.status} />
              </div>
              {(next.status === 'awaiting' || next.status === 'reminder_sent') && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      store.updateBooking(next.id, { status: 'confirmed' })
                      toast(`Confirmed — see you ${relDay(next.date).toLowerCase()}`)
                    }}
                  >
                    Confirm
                  </Button>
                  <Button size="sm" variant="secondary" onClick={(e) => (e.stopPropagation(), nav('/me/appointments'))}>
                    Reschedule
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex items-center justify-between p-4">
              <span className="text-[14px] text-muted">No visit booked</span>
              <Button size="sm" variant="soft" onClick={() => nav('/me/book')}>
                Book a visit
              </Button>
            </Card>
          )}

          <Card className="flex items-center gap-3 p-4" onClick={() => nav('/me/ask')}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <MessageSquare size={19} />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-semibold">Ask {doc} a question</div>
              <div className="text-[13px] text-muted">{v.unreadFromPhysio ? `${v.unreadFromPhysio} new repl${v.unreadFromPhysio > 1 ? 'ies' : 'y'}` : 'Replies come to WhatsApp and here'}</div>
            </div>
            {v.unreadFromPhysio > 0 && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
            <ChevronRight size={18} className="text-muted" />
          </Card>
        </div>
      </div>
      <div className="h-6" />
    </Page>
  )
}

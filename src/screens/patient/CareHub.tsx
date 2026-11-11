import { CalendarDays, CalendarPlus, ChevronRight, ClipboardCheck, ClipboardList, FileText, MapPin, MessageSquare, Stethoscope } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Badge, Card, PageHeader, SectionTitle } from '../../components/ui'
import { fmtTime, relDay } from '../../lib/dates'
import { firstName } from '../../lib/logic'
import { patientView } from '../../lib/patientData'
import { useMe, useStore } from '../../lib/store'
import { webRoute } from '../../lib/web'
import { MatchCard, ResultCard } from './care'

function Row({ icon, title, sub, onClick, right }: { icon: ReactNode; title: string; sub?: string; onClick: () => void; right?: ReactNode }) {
  return (
    <Card className="flex items-center gap-3 p-4" onClick={onClick}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{title}</div>
        {sub && <div className="truncate text-[13px] text-muted">{sub}</div>}
      </div>
      {right}
      <ChevronRight size={18} className="shrink-0 text-faint" />
    </Card>
  )
}

// Patient · Care: your physio, plan and visits, plus diagnostics. Self sign-ups see matching and diagnostics.
export default function Care() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  if (!patient) return null
  const mine = store.db.assessments.filter((a) => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const latest = mine[0]
  const hasPhysio = !!patient.physioId && store.db.physios.some((p) => p.id === patient.physioId)
  const v = hasPhysio ? patientView(store.db, patient) : undefined
  const doc = v ? `Dr. ${firstName(v.physio.name)}` : ''
  const next = v?.upcoming[0]
  const suggested = patient.match?.suggestedPhysioId ? store.db.physios.find((p) => p.id === patient.match!.suggestedPhysioId) : undefined

  return (
    <Page wide>
      <PageHeader back={false} title="Care" subtitle={v ? `With ${v.physio.name}, PT` : 'Find out what’s wrong and get the right physio'} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-2.5">
          {v ? (
            <>
              {patient.dischargedAt && (
                <Card className="border-ok/40 bg-ok-soft/40 p-4">
                  <div className="text-[15px] font-semibold">You’ve been discharged by {doc}</div>
                  {patient.discharge?.advice && <p className="mt-1 whitespace-pre-line text-[13px] text-muted">{patient.discharge.advice}</p>}
                </Card>
              )}
              <Row
                icon={<ClipboardList size={20} />}
                title="My care plan"
                sub={v.plan ? `${v.plan.title} · week ${v.week} of ${v.plan.weeks}` : 'Your exercises and treatment plans'}
                onClick={() => nav('/me/plan')}
                right={v.adherence ? <Badge tone="brand">{v.adherence.pct}%</Badge> : undefined}
              />
              <Row icon={<CalendarDays size={20} />} title="Visits" sub={next ? `Next: ${relDay(next.date)}, ${fmtTime(next.time)}` : 'No upcoming visits'} onClick={() => nav('/me/appointments')} />
              <Row icon={<CalendarPlus size={20} />} title="Book a session" sub={`Pick a time with ${doc}`} onClick={() => nav('/me/book')} />
              <Row
                icon={<MessageSquare size={20} />}
                title={`Ask ${doc}`}
                sub="Replies also arrive on WhatsApp"
                onClick={() => nav('/me/ask')}
                right={v.unreadFromPhysio ? <Badge tone="accent">{v.unreadFromPhysio} new</Badge> : undefined}
              />
              {v.rxPlans.length > 0 && <Row icon={<FileText size={20} />} title="Treatment plans" sub={`${v.rxPlans.length} from ${doc}`} onClick={() => nav('/me/plan')} />}
            </>
          ) : (
            <>
              <MatchCard patient={patient} physio={suggested} hasAssessment={!!latest} />
              <Row icon={<MapPin size={20} />} title="Physio directory" sub="Browse physiotherapists near you" onClick={() => nav(webRoute('/physio-directory/', 'Physio directory'))} />
            </>
          )}
        </div>

        <div>
          <SectionTitle className="lg:mt-0">Diagnostics</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {latest && <ResultCard a={latest} onOpen={() => nav(`/me/assess/result/${latest.id}`)} />}
            <Row icon={<Stethoscope size={20} />} title="Conditions & causes" sub="What’s behind back, neck, shoulder and knee pain" onClick={() => nav('/me/diagnostics')} />
            <Row icon={<ClipboardCheck size={20} />} title={latest ? 'Take another assessment' : 'Take an assessment'} sub="Pain checks and health scores, 5 minutes each" onClick={() => nav('/me/assess')} />
          </div>
        </div>
      </div>
      <div className="h-8" />
    </Page>
  )
}

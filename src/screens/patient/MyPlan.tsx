import { ChevronRight, ClipboardList, FileText } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExerciseMedia } from '../../components/ExerciseMedia'
import { PainChart } from '../../components/PainChart'
import { Page } from '../../components/Shell'
import { Card, Empty, PageHeader, Progress, SectionTitle, Sheet } from '../../components/ui'
import { fmtShort } from '../../lib/dates'
import { doseLabel } from '../../lib/exercises'
import { firstName, painSeries } from '../../lib/logic'
import { patientView } from '../../lib/patientData'
import { useMe, useStore } from '../../lib/store'
import type { Exercise, PlanItem } from '../../lib/types'

// Patient · My plan
export default function MyPlan() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState<{ ex: Exercise; item: PlanItem }>()
  if (!patient) return null
  const v = patientView(store.db, patient)
  const plan = v.plan

  return (
    <Page wide>
      <PageHeader back={false} title="My plan" subtitle={plan ? `From Dr. ${firstName(v.physio.name)} · sent ${fmtShort(plan.sentAt.slice(0, 10))}` : undefined} />
      {!plan ? (
        <Card>
          <Empty icon={<ClipboardList size={20} />} title="No active plan" body="Your physio will send your next plan on WhatsApp." />
        </Card>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
          <div>
            <Card className="p-4">
              <div className="text-[19px] font-semibold">{plan.title}</div>
              <div className="text-[13px] text-muted">
                Week {v.week} of {plan.weeks} · {plan.daysPerWeek} days a week
              </div>
              {v.adherence && (
                <>
                  <div className="mt-4 flex justify-between text-[14px]">
                    <span className="text-muted">Sessions done</span>
                    <span className="font-semibold text-brand">
                      {v.adherence.done} of {v.adherence.due}
                    </span>
                  </div>
                  <Progress value={v.adherence.pct} className="mt-2" />
                </>
              )}
            </Card>
            <SectionTitle>Exercises</SectionTitle>
            <div className="flex flex-col gap-2.5">
              {plan.items.map((item, i) => {
                const ex = store.db.exercises.find((e) => e.id === item.exerciseId)
                if (!ex) return null
                return (
                  <Card key={item.exerciseId} className="flex items-center gap-3 p-2.5 pr-3" onClick={() => setOpen({ ex, item })}>
                    <ExerciseMedia region={ex.region} size="sm" className="h-12 w-12 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">
                        {i + 1}. {ex.name}
                      </div>
                      <div className="text-[13px] text-muted">{doseLabel(item)}</div>
                    </div>
                    <ChevronRight size={17} className="text-muted" />
                  </Card>
                )
              })}
            </div>
          </div>
          <div>
            <SectionTitle className="lg:mt-0">Your pain over time</SectionTitle>
            <Card className="p-4">
              <PainChart points={painSeries(plan, store.db.sessions)} max={10} />
            </Card>
            {v.rxPlans.length > 0 && (
              <>
                <SectionTitle>Prescriptions</SectionTitle>
                <div className="flex flex-col gap-2.5">
                  {v.rxPlans.map((p) => (
                    <Card key={p.id} className="flex items-center gap-3 p-4" onClick={() => nav(`/me/rx/${p.id}`)}>
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                        <FileText size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold">{p.rx!.diagnosis || 'Prescription'}</div>
                        <div className="text-[13px] text-muted">{fmtShort(p.sentAt.slice(0, 10))} · view or download PDF</div>
                      </div>
                      <ChevronRight size={17} className="text-muted" />
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {v.pastPlans.length > 0 && (
        <>
          <SectionTitle>Past plans</SectionTitle>
          <div className="flex flex-col gap-2 pb-6">
            {v.pastPlans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="font-semibold">{p.title}</div>
                <div className="text-[13px] text-muted">
                  {p.weeks} weeks · from {fmtShort(p.startDate)}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <Sheet open={!!open} onClose={() => setOpen(undefined)} title={open?.ex.name}>
        {open && (
          <div>
            <ExerciseMedia region={open.ex.region} size="lg" className="aspect-video w-full" label="Video · demo placeholder" />
            <div className="mt-4 text-[16px] font-semibold text-brand">{doseLabel(open.item)}</div>
            {open.item.note && <div className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-[14px]">“{open.item.note}”</div>}
            <ul className="mt-3 flex flex-col gap-1.5 text-[15px] text-muted">
              {open.ex.cues.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>
    </Page>
  )
}

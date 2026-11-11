import { ChevronRight, LayoutGrid, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Avatar, Card, RefreshButton, SectionTitle } from '../../components/ui'
import { greeting } from '../../lib/dates'
import { recommendedFor } from '../../lib/explore'
import { firstName } from '../../lib/logic'
import type { Patient } from '../../lib/types'
import { useStore } from '../../lib/store'
import { MatchCard, ProductCard, ResultCard } from './care'

/** Home for someone who signed up on their own: assessment → physio match, plus store and tools. */
export default function SoloHome({ patient }: { patient: Patient }) {
  const store = useStore()
  const nav = useNavigate()
  const mine = store.db.assessments.filter((a) => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const latest = mine[0]
  const picks = recommendedFor(latest).slice(0, 4)

  return (
    <Page wide>
      <header className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[13px] text-muted lg:text-[15px]">{greeting()},</div>
          <div className="font-display text-[22px] font-bold tracking-[-0.01em] lg:text-[28px]">{firstName(patient.name)}</div>
        </div>
        <RefreshButton />
        <button aria-label="Profile" onClick={() => nav('/me/profile')} className="rounded-full cursor-pointer lg:hidden">
          <Avatar name={patient.name} size={40} />
        </button>
      </header>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          <MatchCard patient={patient} hasAssessment={!!latest} />
          {latest && <ResultCard a={latest} onOpen={() => nav(`/me/assess/result/${latest.id}`)} />}
          {latest && (
            <button onClick={() => nav('/me/assess')} className="flex items-center justify-between rounded-2xl border border-dashed border-brand-line px-4 py-3 text-[14px] font-semibold text-brand cursor-pointer">
              Take another assessment <ChevronRight size={16} />
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3 lg:mt-0">
          {picks.length > 0 && (
            <>
              <SectionTitle right={<button onClick={() => nav('/me/shop')} className="text-[13px] font-semibold text-brand cursor-pointer">See all</button>}>
                Picked for your {latest!.area}
              </SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {picks.map((p) => (
                  <ProductCard key={p.handle} p={p} />
                ))}
              </div>
            </>
          )}
          <SectionTitle>Explore</SectionTitle>
          <Card className="flex items-center gap-3 p-4" onClick={() => nav('/me/diagnostics')}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Stethoscope size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">Diagnostics</div>
              <div className="text-[13px] text-muted">What’s behind back, neck, shoulder and knee pain</div>
            </div>
            <ChevronRight size={18} className="text-faint" />
          </Card>
          <Card className="flex items-center gap-3 p-4" onClick={() => nav('/me/tools')}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <LayoutGrid size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">All tools</div>
              <div className="text-[13px] text-muted">Assessments, Slouch Catcher, betterYou corner and more</div>
            </div>
            <ChevronRight size={18} className="text-faint" />
          </Card>
        </div>
      </div>
      <div className="h-6" />
    </Page>
  )
}

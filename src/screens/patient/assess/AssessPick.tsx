import { ChevronRight, Clock, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Card, PageHeader } from '../../../components/ui'
import { ASSESSMENTS, type AreaKey, type AssessmentInfo } from '../../../lib/assessments'

/** Simple body-area marks, drawn in the brand colour. */
const AREA_ICON: Record<AreaKey | 'overall', string> = {
  overall: 'M12 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM6 10.5h12M12 10.5V16M12 16l-3.5 5M12 16l3.5 5',
  back: 'M12 3v18M8 6c2 1.5 6 1.5 8 0M8 10c2 1.5 6 1.5 8 0M8 14c2 1.5 6 1.5 8 0M8 18c2 1.5 6 1.5 8 0',
  neck: 'M12 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM10 9.5v4M14 9.5v4M5 21c0-4 3-7.5 7-7.5s7 3.5 7 7.5',
  shoulder: 'M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM4 21v-5c0-3 2-5 5-5h6c3 0 5 2 5 5v5M4 14.5l3-1',
  knee: 'M10 2v8c0 1.5-1 2.5-1 4s1 2.5 1 4v4M15 2v8c0 1.5 1 2.5 1 4s-1 2.5-1 4v4M9 14h7',
}

// Patient · choose an assessment (the same ones as betterhood.in/quiz-landing-page/, run from the website inside the app)
export default function AssessPick() {
  const nav = useNavigate()
  const row = (a: AssessmentInfo) => (
    <Card key={a.slug} className="flex items-center gap-3.5 p-4" onClick={() => nav(`/me/assess/${a.slug}`)}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={AREA_ICON[a.area]} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold">{a.title}</div>
        <div className="text-[13px] text-muted">{a.blurb}</div>
      </div>
      <ChevronRight size={18} className="text-muted" />
    </Card>
  )
  const group = (kinds: AssessmentInfo['kind'][]) => ASSESSMENTS.filter((a) => kinds.includes(a.kind)).map(row)
  return (
    <Page>
      <PageHeader title="Assessments" subtitle="Designed by Betterhood physios" />
      <p className="text-[15px] leading-relaxed text-muted">Answer a few questions about your pain. You’ll see the most likely cause and what helps, and we use it to match you with the right physio.</p>
      <div className="mt-3 flex gap-4 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <Clock size={14} /> 5 minutes
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} /> Private
        </span>
      </div>
      <h2 className="mt-6 text-[16px] font-semibold">Where does it hurt?</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{group(['pain'])}</div>
      <h2 className="mt-8 text-[16px] font-semibold">Check your health</h2>
      <p className="mt-1 text-[13px] text-muted">Guided movement tests that score your strength, balance and mobility out of 10.</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{group(['health', 'longevity'])}</div>
      <div className="h-8" />
    </Page>
  )
}

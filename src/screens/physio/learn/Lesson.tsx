import { ArrowRight, Check, Clock, Lightbulb } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, Footer, PageHeader } from '../../../components/ui'
import { ALL_LESSONS, COURSE } from '../../../lib/course'
import { haptic, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

export default function Lesson() {
  const { id } = useParams()
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const i = ALL_LESSONS.findIndex((l) => l.id === id)
  if (!physio) return null
  if (i < 0) return <Navigate to="/app/learn" replace />
  const l = ALL_LESSONS[i]
  const next = ALL_LESSONS[i + 1]
  const done = (physio.courseProgress ?? []).includes(l.id)

  const complete = () => {
    if (!done) {
      haptic('success')
      store.toggleLesson(physio.id, l.id, true)
    }
    if (next) nav(`/app/learn/${next.id}`, { replace: true })
    else {
      toast(`🎓 You’ve finished ${COURSE.title}!`)
      nav('/app/learn', { replace: true })
    }
  }

  return (
    <Page>
      <PageHeader title={l.title} subtitle={`${COURSE.title} · ${l.moduleTitle}`} onBack={() => nav('/app/learn')} />
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {l.minutes} min read
        </span>
        <span>
          Lesson {i + 1} of {ALL_LESSONS.length}
        </span>
        {done && (
          <span className="inline-flex items-center gap-1 font-semibold text-ok">
            <Check size={13} strokeWidth={3} /> Done
          </span>
        )}
      </div>
      <p className="mt-4 text-[18px] font-medium leading-snug">{l.summary}</p>
      <ol className="mt-5 flex flex-col gap-4">
        {l.points.map((pt, n) => (
          <li key={n} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">{n + 1}</span>
            <span className="pt-0.5 text-[15px] leading-relaxed">{pt}</span>
          </li>
        ))}
      </ol>
      <Card className="mt-6 border-accent/40 bg-accent-soft/60 p-4">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-accent">
          <Lightbulb size={16} /> Do this week
        </div>
        <p className="mt-1 text-[15px]">{l.action.text}</p>
        {l.action.to && (
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => nav(l.action.to!)}>
            {l.action.cta ?? 'Open'} <ArrowRight size={14} />
          </Button>
        )}
      </Card>
      <Footer className="flex flex-col gap-2">
        <Button block onClick={complete}>
          {done ? (next ? 'Next lesson' : 'Back to course') : next ? 'Mark done & continue' : 'Finish course'}
        </Button>
        {done && (
          <Button variant="ghost" size="md" onClick={() => store.toggleLesson(physio.id, l.id, false)}>
            Mark as not done
          </Button>
        )}
      </Footer>
    </Page>
  )
}

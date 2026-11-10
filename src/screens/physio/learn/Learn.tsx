import { Check, ChevronRight, Clock, GraduationCap, PlayCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, cx, PageHeader, Progress } from '../../../components/ui'
import { ALL_LESSONS, COURSE, courseProgress, MODULES } from '../../../lib/course'
import { useMe } from '../../../lib/store'

// Learn · PhysioPreneurship course
export default function Learn() {
  const { physio } = useMe()
  const nav = useNavigate()
  if (!physio) return null
  const done = physio.courseProgress ?? []
  const p = courseProgress(done)
  const mins = ALL_LESSONS.reduce((s, l) => s + l.minutes, 0)

  return (
    <Page wide>
      <PageHeader back={false} title="Learn" subtitle={COURSE.by} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <div>
          <div className="overflow-hidden bg-hero rounded-[24px] shadow-brand p-5 text-white">
            <div className="flex items-center gap-2 text-[13px] text-white/75">
              <GraduationCap size={16} /> Free course · {ALL_LESSONS.length} lessons · {Math.round(mins / 5) * 5} min
            </div>
            <h2 className="mt-2 font-display text-[26px] font-bold leading-tight tracking-[-0.01em]">{COURSE.title}</h2>
            <p className="mt-1 text-[15px] text-white/85">{COURSE.tagline}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-accent" style={{ width: `${p.pct}%` }} />
              </div>
              <span className="text-[13px] text-white/85">
                {p.done}/{p.total}
              </span>
            </div>
            {p.next && (
              <button
                onClick={() => nav(`/app/learn/${p.next!.id}`)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-brand cursor-pointer"
              >
                <PlayCircle size={17} /> {p.done ? 'Continue' : 'Start'}: {p.next.title}
              </button>
            )}
            {!p.next && <p className="mt-4 text-[14px] font-semibold">✓ Course complete — well done!</p>}
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {MODULES.map((m, mi) => {
              const n = m.lessons.filter((l) => done.includes(l.id)).length
              return (
                <Card key={m.id} className="overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-wider text-muted">Module {mi + 1}</div>
                      <div className="text-[16px] font-semibold">{m.title}</div>
                    </div>
                    <span className="text-[13px] text-muted">
                      {n}/{m.lessons.length}
                    </span>
                  </div>
                  {m.lessons.map((l) => {
                    const isDone = done.includes(l.id)
                    return (
                      <button key={l.id} onClick={() => nav(`/app/learn/${l.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg cursor-pointer">
                        <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', isDone ? 'bg-ok text-white' : 'border-2 border-line text-muted')}>
                          {isDone ? <Check size={14} strokeWidth={3} /> : <PlayCircle size={14} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium">{l.title}</span>
                          <span className="flex items-center gap-1 text-[12px] text-muted">
                            <Clock size={12} /> {l.minutes} min
                          </span>
                        </span>
                        <ChevronRight size={17} className="text-muted" />
                      </button>
                    )
                  })}
                </Card>
              )
            })}
          </div>
        </div>

        <aside className="mt-6 lg:mt-0">
          <Card className="p-4 lg:sticky lg:top-6">
            <div className="text-[16px] font-semibold">Who it’s for</div>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Physios starting out on their own, running a clinic, doing home visits, or consulting at several places — and anyone planning to grow a team.
            </p>
            <div className="mt-4 text-[16px] font-semibold">You’ll learn to</div>
            <ul className="mt-1 flex flex-col gap-1.5 text-[14px] text-muted">
              {['Pick the right practice model', 'Price sessions, packages and groups', 'Get referrals and Google reviews', 'Cut no-shows and keep patients', 'Bill, take consent and keep records', 'Hire and open a second location'].map((x) => (
                <li key={x} className="flex gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-ok" /> {x}
                </li>
              ))}
            </ul>
            <Progress value={p.pct} className="mt-4" />
            <div className="mt-1.5 text-[12px] text-muted">{p.pct}% complete</div>
            {p.next && (
              <Button block size="md" className="mt-4" onClick={() => nav(`/app/learn/${p.next!.id}`)}>
                {p.done ? 'Continue' : 'Start the course'}
              </Button>
            )}
          </Card>
        </aside>
      </div>
      <div className="h-6" />
    </Page>
  )
}

import { BookOpen, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Card, PageHeader, SectionTitle } from '../../components/ui'
import { LEARN_TOPICS } from '../../lib/diagnostics'
import { webRoute } from '../../lib/web'

// Patient · Learn: betterhood.in's physio-written guides, read inside the app.
export default function LearnHub() {
  const nav = useNavigate()
  const open = (path: string, title: string) => nav(webRoute(path, title))
  return (
    <Page wide>
      <PageHeader back={false} title="Learn" subtitle="Short guides written by physios" />
      <Card className="overflow-hidden p-0" onClick={() => open('/learn/', 'Learn')}>
        <div className="bg-hero p-5 text-white">
          <BookOpen size={22} />
          <div className="mt-3 font-display text-[20px] font-bold leading-tight">All articles</div>
          <div className="mt-1 text-[13px] text-white/80">Pain, posture, recovery and staying strong, from betterhood’s physios.</div>
        </div>
      </Card>
      <SectionTitle>Browse by topic</SectionTitle>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {LEARN_TOPICS.map((t) => (
          <Card key={t.path} className="flex items-center gap-3 p-4" onClick={() => open(t.path, t.title)}>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{t.title}</div>
              <div className="truncate text-[13px] text-muted">{t.sub}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-faint" />
          </Card>
        ))}
      </div>
      <div className="h-8" />
    </Page>
  )
}

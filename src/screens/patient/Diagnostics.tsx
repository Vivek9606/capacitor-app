import { ChevronRight, ClipboardCheck, HeartPulse } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Card, Chip, cx, PageHeader, SectionTitle } from '../../components/ui'
import { resultPath } from '../../lib/assessments'
import { fmtShort } from '../../lib/dates'
import { CONDITIONS, DX_AREAS, type DxArea } from '../../lib/diagnostics'
import { useMe, useStore } from '../../lib/store'
import { webRoute } from '../../lib/web'

// Patient · Diagnostics: check yourself (assessments), the condition pages, and your own results.
export default function Diagnostics() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const mine = patient ? store.db.assessments.filter((a) => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []
  const [area, setArea] = useState<DxArea>(() => (mine.find((a) => a.area !== 'overall')?.area as DxArea | undefined) ?? 'back')
  if (!patient) return null
  const conds = CONDITIONS.filter((c) => c.area === area)
  const areaInfo = DX_AREAS.find((a) => a.key === area)!
  const myPages = new Set(mine.map((a) => a.result).filter(Boolean))

  return (
    <Page wide>
      <PageHeader title="Diagnostics" subtitle="Understand what’s causing your pain" />

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
        {DX_AREAS.map((a) => (
          <Chip key={a.key} selected={area === a.key} onClick={() => setArea(a.key)}>
            {a.label}
          </Chip>
        ))}
      </div>

      <Card className="mt-4 flex items-center gap-3 border-brand-line bg-brand-soft/40 p-4" onClick={() => nav(`/me/assess/${areaInfo.assessment}`)}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white">
          <ClipboardCheck size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Take the {areaInfo.label.toLowerCase()} pain assessment</div>
          <div className="text-[13px] text-muted">5 minutes. Finds the most likely cause from your answers.</div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-brand" />
      </Card>

      <SectionTitle>Common causes of {areaInfo.label.toLowerCase()} pain</SectionTitle>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {conds.map((c) => (
          <Card key={c.page} className={cx('flex items-center gap-3 p-4', myPages.has(c.page) && 'border-brand')} onClick={() => nav(webRoute(resultPath(c.page), c.title))}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-bg text-brand">
              <HeartPulse size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{c.title}</div>
              <div className="text-[13px] capitalize text-muted">{myPages.has(c.page) ? 'Your latest result' : `${c.cat}-related`}</div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-faint" />
          </Card>
        ))}
      </div>

      {mine.length > 0 && (
        <>
          <SectionTitle>Your results</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {mine.slice(0, 8).map((a) => (
              <Card key={a.id} className="flex items-center gap-3 p-4" onClick={() => nav(`/me/assess/result/${a.id}`)}>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{a.kind === 'pain' ? a.condition ?? a.title : `${a.title} · ${a.scores?.overall ?? '–'}/10`}</div>
                  <div className="text-[13px] text-muted">
                    {a.title} · {fmtShort(a.createdAt.slice(0, 10))}
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-faint" />
              </Card>
            ))}
          </div>
        </>
      )}
      <button onClick={() => nav('/me/assess')} className="mt-5 text-[14px] font-semibold text-brand cursor-pointer">
        All assessments, including health scores →
      </button>
      <div className="h-8" />
    </Page>
  )
}

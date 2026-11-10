import { PartyPopper } from 'lucide-react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, PageHeader, SectionTitle } from '../../../components/ui'
import { recommendedFor } from '../../../lib/explore'
import { firstName } from '../../../lib/logic'
import { useMe, useStore } from '../../../lib/store'
import { MatchCard, ProductCard, ResultCard } from '../care'

const CAT_LABEL: Record<string, string> = { muscle: 'Muscle', nerve: 'Nerve', bone: 'Bone', joint: 'Joint' }

// Patient · assessment result
export default function AssessResult() {
  const { id } = useParams()
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const fresh = !!(useLocation().state as { fresh?: boolean } | null)?.fresh
  const a = store.db.assessments.find((x) => x.id === id)
  if (!patient) return null
  if (!a) return <Navigate to="/me" replace />
  const physio = patient.physioId ? store.db.physios.find((p) => p.id === patient.physioId) : undefined
  const totals = Object.entries(a.totals)
  const max = Math.max(1, ...totals.map(([, v]) => v))
  const picks = recommendedFor(a).slice(0, 6)

  return (
    <Page wide>
      <PageHeader title={fresh ? 'Your result' : a.title} onBack={() => nav('/me')} />
      {fresh && (
        <div className="anim-pop mb-4 flex items-center gap-3 rounded-2xl bg-ok-soft px-4 py-3 text-[14px] font-semibold text-ok">
          <PartyPopper size={18} /> Done, {firstName(patient.name)}! Here’s what your answers point to.
        </div>
      )}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          <ResultCard a={a} />
          {totals.length > 0 && (
            <Card className="p-4">
              <div className="text-[13px] font-semibold text-muted">How your answers scored</div>
              <div className="mt-3 flex flex-col gap-2.5">
                {totals
                  .sort((x, y) => y[1] - x[1])
                  .map(([cat, v]) => (
                    <div key={cat} className="flex items-center gap-3 text-[13px]">
                      <span className="w-12 shrink-0 font-medium">{CAT_LABEL[cat] ?? cat}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-track">
                        <span className={`anim-grow block h-full rounded-full ${cat === a.cat ? 'bg-brand' : 'bg-brand-line'}`} style={{ width: `${(v / max) * 100}%` }} />
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}
          {physio ? (
            <Card className="p-4 text-[14px] text-muted">
              Shared with <b className="text-ink">{physio.name}</b> so they can plan your treatment.
            </Card>
          ) : (
            <MatchCard patient={patient} hasAssessment />
          )}
        </div>
        <div className="mt-2 flex flex-col gap-3 lg:mt-0">
          {picks.length > 0 && (
            <>
              <SectionTitle>Recommended for you</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {picks.map((p) => (
                  <ProductCard key={p.handle} p={p} />
                ))}
              </div>
              <Button variant="soft" block size="md" onClick={() => nav('/me/explore')}>
                Browse the full store
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="h-8" />
    </Page>
  )
}

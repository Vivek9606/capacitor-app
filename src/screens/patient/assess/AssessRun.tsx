import { useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { WebFlow } from '../../../components/WebFlow'
import { assessmentBySlug, type AssessmentInfo } from '../../../lib/assessments'
import { haptic } from '../../../lib/platform'
import { useMe, useStore, type NewAssessmentInput } from '../../../lib/store'
import type { SiteAssessmentResult } from '../../../lib/web'

const round = (n: number | null | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : null)

/** The website's result record → the patient's saved assessment. Slug, kind, area and title come from our own list. */
function toInput(info: AssessmentInfo, r: SiteAssessmentResult): NewAssessmentInput {
  if (info.kind === 'pain') {
    return {
      slug: info.slug,
      kind: 'pain',
      area: info.area,
      title: info.title,
      cat: r.cat,
      condition: r.condition,
      result: r.result,
      advisory: r.advisory ? 'Critical advisory' : undefined,
      totals: Object.fromEntries((r.totals ?? []).map((t) => [t.cat, round(t.score) ?? 0])),
    }
  }
  return {
    slug: info.slug,
    kind: info.kind,
    area: info.area,
    title: info.title,
    totals: {},
    scores: { overall: round(r.overall), strength: round(r.strength), balance: round(r.balance), mobility: round(r.mobility) },
  }
}

// Patient · take an assessment. Runs the website's assessment in the app; the result is saved to the patient's account.
export default function AssessRun() {
  const { slug = '' } = useParams()
  const info = assessmentBySlug(slug)
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const saved = useRef(false)

  if (!info) return <Navigate to="/me/assess" replace />
  if (!patient) return null

  return (
    <WebFlow
      path={`/${info.slug}/`}
      title={`${info.title} assessment`}
      onBack={() => nav(-1)}
      // Known details, so the page doesn't ask again (it hides name/phone/email in the app).
      context={{ prefill: { name: patient.name, email: patient.email, phone: patient.phone, age: patient.age, sex: patient.sex } }}
      onMessage={(msg, reply) => {
        if (msg.type !== 'bh:assessment-result' || msg.result?.slug !== info.slug || saved.current) return
        saved.current = true
        const id = store.saveAssessment(patient.id, toInput(info, msg.result))
        reply({ type: 'bh:ack', id })
        haptic('success')
        nav(`/me/assess/result/${id}`, { replace: true, state: { fresh: true } })
      }}
    />
  )
}

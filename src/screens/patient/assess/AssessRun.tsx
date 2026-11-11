import { useRef } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { WebFlow } from '../../../components/WebFlow'
import { assessmentBySlug, toInput } from '../../../lib/assessments'
import { haptic } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

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

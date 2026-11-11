import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { WebFlow } from '../components/WebFlow'
import { isSitePath } from '../lib/web'

// A betterhood.in page shown inside the app (e.g. an assessment's full result page). /web?p=/result-…/&t=Title
export default function WebPage() {
  const [q] = useSearchParams()
  const nav = useNavigate()
  const path = q.get('p') ?? ''
  if (!isSitePath(path)) return <Navigate to="/" replace />
  return <WebFlow path={path} title={q.get('t') || 'betterhood'} onBack={() => nav(-1)} />
}

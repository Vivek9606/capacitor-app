import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { WebFlow } from '../components/WebFlow'
import { useMe } from '../lib/store'
import { isSitePath } from '../lib/web'

// A betterhood.in page shown inside the app (e.g. an assessment's full result page). /web?p=/result-…/&t=Title
export default function WebPage() {
  const [q] = useSearchParams()
  const nav = useNavigate()
  const { patient } = useMe()
  const path = q.get('p') ?? ''
  if (!isSitePath(path)) return <Navigate to="/" replace />
  // The page can't see the app's sign-in, so tell it who is reading (a result page greets them by name).
  const context = patient ? { prefill: { name: patient.name } } : undefined
  return (
    <WebFlow
      path={path}
      title={q.get('t') || 'betterhood'}
      context={context}
      onBack={() => nav(-1)}
      // Betty's product surprise on an article: open the product in the app's own shop.
      onMessage={(msg) => {
        if (msg.type === 'bh:open-product' && patient && /^[\w-]+$/.test(msg.handle)) nav(`/me/shop/${msg.handle}`)
      }}
    />
  )
}

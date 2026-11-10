import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/ui'
import { fmtPhone } from '../../lib/logic'
import { AuthLayout } from './AuthLayout'
import { RoleCards } from './Welcome'

/** New number that came in through "I already have an account": ask who they are before sign-up. */
export default function RoleChoice() {
  const nav = useNavigate()
  const state = useLocation().state as { phone?: string; signupToken?: string } | null
  if (!state?.phone) return <Navigate to="/welcome" replace />
  return (
    <AuthLayout>
      <PageHeader title="Create your account" onBack={() => nav('/welcome')} />
      <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">New to Betterhood?</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">There’s no account for {fmtPhone(state.phone)} yet. Tell us who you are and we’ll set it up.</p>
      <div className="mt-6">
        <RoleCards onPick={(role) => nav(role === 'physio' ? '/setup' : '/signup/patient', { replace: true, state })} />
      </div>
    </AuthLayout>
  )
}

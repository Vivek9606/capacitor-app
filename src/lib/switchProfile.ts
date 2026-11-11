import { useNavigate } from 'react-router-dom'
import { haptic, toast } from './platform'
import { useStore } from './store'

/**
 * Physio ↔ consumer on the same phone number. Switching to the consumer side creates a consumer profile the first
 * time; switching to the physio side without a physio account goes through quick setup.
 */
export function useSwitchProfile() {
  const store = useStore()
  const nav = useNavigate()
  return async (to: 'physio' | 'patient') => {
    try {
      const r = await store.switchRole(to)
      haptic('success')
      if ('setup' in r) {
        nav('/setup', { replace: true, state: r.setup })
        return
      }
      toast(to === 'physio' ? 'Switched to your physio profile' : 'Switched to your consumer profile')
      nav(to === 'physio' ? '/app' : '/me', { replace: true })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t switch profiles. Try again.')
    }
  }
}

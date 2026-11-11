import { useNavigate } from 'react-router-dom'
import { WebFlow } from '../../../components/WebFlow'
import { rememberListing } from '../../../lib/directory'
import { haptic, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

// Physio · betterhood.in directory listing. The form is the website's (/physio-directory/join/), shown in the app
// with the physio already signed in, so the website and the app share one listing flow.
export default function DirectoryListing() {
  const { physio, session } = useMe()
  const store = useStore()
  const nav = useNavigate()
  if (!physio) return null
  return (
    <WebFlow
      path="/physio-directory/join/"
      title="Directory profile"
      onBack={() => nav(-1)}
      context={{ token: session?.token }}
      onMessage={(msg) => {
        if (msg.type !== 'bh:directory-published') return
        rememberListing(physio.id, { slug: msg.slug, status: msg.status === 'hidden' ? 'hidden' : 'live', url: msg.url, updatedAt: new Date().toISOString() })
        haptic('success')
        toast(msg.created ? 'Profile published on betterhood.in' : 'Directory profile updated')
        // Qualification, experience, photo and registration are shared with the app profile.
        if (store.apiMode) void store.refresh()
      }}
    />
  )
}

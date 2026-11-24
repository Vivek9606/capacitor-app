// Community (physio forum): types and API calls. Server: capacitor-app-backend/src/routes/community.ts.
import { api } from './api'

export interface CAuthor {
  id: string
  name: string
  photo?: string
  qualification?: string
  verified?: boolean
  team?: boolean
}

export interface CPost {
  id: string
  channelId: string
  parentId?: string
  authorId: string
  body: string
  removed: boolean
  removedReason?: string
  createdAt: string
  editedAt?: string
  lastReplyAt?: string
  replyCount: number
  helpful: number
  mine: boolean
  reacted: boolean
  reports?: number
}

export interface CChannel {
  id: string
  name: string
  description: string
  isDefault: boolean
  pinned: boolean
  lastPostAt?: string
  posts: number
  unread: number
}

export interface CFeed {
  channel: { id: string; name: string; description: string; isDefault: boolean }
  posts: CPost[]
  authors: Record<string, CAuthor>
  more: boolean
}

export interface CThread {
  channel: { id: string; name: string }
  post: CPost
  replies: CPost[]
  authors: Record<string, CAuthor>
}

/** Physio-side calls. `base` is '' for physios and '/admin' for the admin dashboard (same shapes). */
export function communityApi(token: string | undefined, base: '' | '/admin' = '') {
  const t = { token }
  return {
    channels: () => api<{ channels: CChannel[] }>('/community/channels', t),
    feed: (id: string, before?: string) => api<CFeed>(`${base}/community/channels/${encodeURIComponent(id)}/posts${before ? `?before=${encodeURIComponent(before)}` : ''}`, t),
    thread: (id: string) => api<CThread>(`${base}/community/posts/${encodeURIComponent(id)}`, t),
    post: (channelId: string, body: string, parentId?: string) =>
      api<{ post: CPost; authors?: Record<string, CAuthor> }>(`${base}/community/channels/${encodeURIComponent(channelId)}/posts`, { ...t, body: { body, parentId } }),
    edit: (id: string, body: string) => api<{ post: CPost }>(`/community/posts/${encodeURIComponent(id)}`, { ...t, method: 'PATCH', body: { body } }),
    remove: (id: string) => api(`/community/posts/${encodeURIComponent(id)}`, { ...t, method: 'DELETE' }),
    helpful: (id: string) => api<{ reacted: boolean; helpful: number }>(`/community/posts/${encodeURIComponent(id)}/helpful`, { ...t, method: 'POST' }),
    report: (id: string, reason: string) => api(`/community/posts/${encodeURIComponent(id)}/report`, { ...t, body: { reason } }),
  }
}

/** "10:42", "Yesterday", "Mon", "12 Nov": short and readable in a chat list. */
export function postTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  if (days === 0) return time
  if (days === 1) return `Yesterday ${time}`
  if (days < 7) return `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${time}`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

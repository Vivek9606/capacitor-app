import { ArrowLeft, Archive, ArchiveRestore, Hash, MessageCircle, Pencil, Pin, PinOff, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Composer, PostItem } from '../../components/CommunityParts'
import { cx } from '../../components/ui'
import { api } from '../../lib/api'
import { type CAuthor, type CPost, type CThread, communityApi } from '../../lib/community'
import { toast } from '../../lib/platform'
import { ago, fmtInt, PageHeading, Panel, PanelHead, Tile } from './kit'
import { Btn, Pill } from './parts'

/**
 * Admin: Community. Open channels for new discussions, post as "Betterhood team", and review reported posts.
 * Physios only ever see what's here through the app; nothing is deleted (removed posts can be restored).
 */

interface AdminChannel {
  id: string
  name: string
  description: string
  isDefault: boolean
  pinned: boolean
  archived: boolean
  createdAt?: string
  lastPostAt?: string
  posts: number
  people: number
}
interface Report {
  id: string
  reason: string
  reporter: string
  createdAt?: string
  post: { id: string; body: string; channelId: string; channelName: string; parentId?: string; author: string; removed: boolean; createdAt?: string }
}
interface Overview {
  stats: { posts_7d: number; posters_7d: number; readers_7d: number; physios: number }
  channels: AdminChannel[]
  reports: Report[]
  blocked30d: { reason: string; n: number }[]
}

const BLOCK_LABEL: Record<string, string> = {
  contact_details: 'Phone or email',
  patient_identity: 'Identified a patient',
  abusive: 'Abusive',
  promotion: 'Advert or spam',
  other: 'Other',
}

export function CommunityScreen({ token }: { token?: string }) {
  const [data, setData] = useState<Overview>()
  const [error, setError] = useState('')
  const [open, setOpen] = useState<{ channel: string; thread?: string }>()
  const [editing, setEditing] = useState<AdminChannel | 'new'>()

  const load = useCallback(() => {
    api<Overview>('/admin/community', { token })
      .then((d) => (setData(d), setError('')))
      .catch((e) => setError(e instanceof Error ? e.message : 'Couldn’t load the community'))
  }, [token])
  useEffect(load, [load])

  const patchChannel = async (c: AdminChannel, body: Record<string, unknown>, done: string) => {
    try {
      await api(`/admin/community/channels/${c.id}`, { token, method: 'PATCH', body })
      toast(done)
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save')
    }
  }
  const moderate = async (postId: string, action: 'remove' | 'keep' | 'restore', reason?: string) => {
    try {
      await api(`/admin/community/posts/${postId}/${action}`, { token, body: action === 'remove' ? { reason: reason || 'Removed by the Betterhood team' } : {} })
      toast(action === 'remove' ? 'Post removed' : action === 'keep' ? 'Kept, report closed' : 'Post restored')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save')
    }
  }

  if (open && data) {
    const ch = data.channels.find((c) => c.id === open.channel)
    return <ChannelView token={token} channel={ch} threadId={open.thread} onOpenThread={(t) => setOpen({ channel: open.channel, thread: t })} onBack={() => (open.thread ? setOpen({ channel: open.channel }) : (setOpen(undefined), load()))} moderate={moderate} />
  }

  if (error) return <p className="text-[14px] text-danger">{error}</p>
  if (!data) return <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />

  const blockedTotal = data.blocked30d.reduce((n, b) => n + b.n, 0)
  const live = data.channels.filter((c) => !c.archived)
  const archived = data.channels.filter((c) => c.archived)

  return (
    <>
      <PageHeading title="Community" actions={<Btn tone="primary" onClick={() => setEditing('new')}><Plus size={16} /> New channel</Btn>}>
        Channels physios talk in. Everyone is in General; open a channel to start a focused discussion. You post as “Betterhood team”.
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Posts, last 7 days" value={fmtInt(data.stats.posts_7d)} note="By physios, incl. replies" />
        <Tile label="Physios posting" value={fmtInt(data.stats.posters_7d)} note="Last 7 days" />
        <Tile label="Physios reading" value={fmtInt(data.stats.readers_7d)} note={`Last 7 days, of ${fmtInt(data.stats.physios)} physios`} />
        <Tile label="Stopped by the safety check" value={fmtInt(blockedTotal)} note={data.blocked30d.length ? data.blocked30d.map((b) => `${BLOCK_LABEL[b.reason] ?? b.reason} ${b.n}`).join(' · ') : 'Last 30 days'} />
      </div>

      <Panel>
        <PanelHead title={`To review (${data.reports.length})`} desc="Posts physios reported, and posts that went out while the safety check was down. Remove or keep each one." />
        <div className="divide-y divide-line px-5 pb-2 pt-3">
          {data.reports.length === 0 && <p className="py-4 text-[14px] text-muted">Nothing to review.</p>}
          {data.reports.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 py-4 lg:flex-row lg:items-start lg:gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  <Pill tone={r.reporter === 'Safety check' ? 'warn' : 'bad'}>{r.reason || 'Reported'}</Pill>
                  <span>
                    by {r.reporter} · {ago(r.createdAt)}
                  </span>
                </div>
                <div className="mt-2 text-[14px] font-semibold">
                  {r.post.author} in #{r.post.channelName}
                  {r.post.parentId && <span className="font-normal text-muted"> (reply)</span>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">{r.post.body}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn onClick={() => setOpen({ channel: r.post.channelId, thread: r.post.parentId ?? r.post.id })}>
                  <MessageCircle size={15} /> View
                </Btn>
                <Btn tone="danger" onClick={() => moderate(r.post.id, 'remove', r.reason ? `Removed after a report: ${r.reason}` : undefined)}>
                  <Trash2 size={15} /> Remove
                </Btn>
                <Btn onClick={() => moderate(r.post.id, 'keep')}>Keep</Btn>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHead title="Channels" desc="Pinned channels show first. Archiving hides a channel from physios; its posts are kept and it can be brought back." />
        <div className="overflow-x-auto px-2 pb-3 pt-2">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 text-right font-medium">Posts</th>
                <th className="px-3 py-2 text-right font-medium">People</th>
                <th className="px-3 py-2 font-medium">Last post</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {[...live, ...archived].map((c) => (
                <tr key={c.id} className={cx('border-t border-line', c.archived && 'text-muted')}>
                  <td className="max-w-[420px] px-3 py-3">
                    <button onClick={() => setOpen({ channel: c.id })} className="flex items-center gap-1.5 font-semibold text-ink hover:text-brand cursor-pointer">
                      <Hash size={14} className="text-muted" /> {c.name}
                      {c.isDefault && <Pill tone="brand">Everyone</Pill>}
                      {c.pinned && !c.isDefault && <Pill tone="brand">Pinned</Pill>}
                      {c.archived && <Pill>Archived</Pill>}
                    </button>
                    {c.description && <div className="mt-0.5 truncate text-[13px] text-muted">{c.description}</div>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtInt(c.posts)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtInt(c.people)}</td>
                  <td className="px-3 py-3 text-muted">{c.lastPostAt ? ago(c.lastPostAt) : '–'}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <Btn tone="ghost" title="Edit" onClick={() => setEditing(c)}>
                        <Pencil size={15} />
                      </Btn>
                      {!c.isDefault && (
                        <Btn tone="ghost" title={c.pinned ? 'Unpin' : 'Pin to the top'} onClick={() => patchChannel(c, { pinned: !c.pinned }, c.pinned ? 'Unpinned' : 'Pinned')}>
                          {c.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                        </Btn>
                      )}
                      {!c.isDefault && (
                        <Btn tone="ghost" title={c.archived ? 'Bring back' : 'Archive'} onClick={() => patchChannel(c, { archived: !c.archived }, c.archived ? 'Channel is back' : 'Channel archived')}>
                          {c.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && <ChannelForm token={token} channel={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} onSaved={() => (setEditing(undefined), load())} />}
    </>
  )
}

function ChannelForm({ token, channel, onClose, onSaved }: { token?: string; channel?: AdminChannel; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(channel?.name ?? '')
  const [description, setDescription] = useState(channel?.description ?? '')
  const [pinned, setPinned] = useState(channel?.pinned ?? false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const save = async () => {
    setBusy(true)
    setErr('')
    try {
      if (channel) await api(`/admin/community/channels/${channel.id}`, { token, method: 'PATCH', body: { name, description, pinned } })
      else await api('/admin/community/channels', { token, body: { name, description, pinned } })
      toast(channel ? 'Channel saved' : 'Channel created. Physios see it now.')
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t save')
    } finally {
      setBusy(false)
    }
  }
  const field = 'mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-brand'
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <form
        className="w-full max-w-[460px] rounded-xl border border-line bg-surface p-5 shadow-float"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <h2 className="text-[16px] font-semibold">{channel ? 'Edit channel' : 'New channel'}</h2>
        <label className="mt-4 block text-[13px] font-medium text-muted">
          Name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. ACL rehab" autoFocus />
        </label>
        <label className="mt-3 block text-[13px] font-medium text-muted">
          What it’s for
          <textarea className={cx(field, 'resize-none')} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="One line physios see under the name" />
        </label>
        {!channel?.isDefault && (
          <label className="mt-3 flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top of the list
          </label>
        )}
        {err && <p className="mt-3 text-[14px] text-danger">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn tone="primary" type="submit" disabled={busy || name.trim().length < 2}>
            {busy ? 'Saving…' : channel ? 'Save' : 'Create channel'}
          </Btn>
        </div>
      </form>
    </div>
  )
}

/** A channel (or one thread in it) as physios see it, plus remove/restore on every post and posting as the team. */
function ChannelView({
  token,
  channel,
  threadId,
  onOpenThread,
  onBack,
  moderate,
}: {
  token?: string
  channel?: AdminChannel
  threadId?: string
  onOpenThread: (id: string) => void
  onBack: () => void
  moderate: (id: string, action: 'remove' | 'restore') => Promise<void>
}) {
  const a = useMemo(() => communityApi(token, '/admin'), [token])
  const [posts, setPosts] = useState<CPost[]>()
  const [authors, setAuthors] = useState<Record<string, CAuthor>>({})
  const [thread, setThread] = useState<CThread>()
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!channel) return
    try {
      if (threadId) setThread(await a.thread(threadId))
      else {
        const f = await a.feed(channel.id)
        setPosts(f.posts)
        setAuthors(f.authors)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t load')
    }
  }, [a, channel, threadId])
  useEffect(() => {
    load()
  }, [load])

  const act = async (p: CPost) => {
    await moderate(p.id, p.removed ? 'restore' : 'remove')
    load()
  }
  const adminRow = (p: CPost, au: Record<string, CAuthor>, replies: boolean) => (
    <div key={p.id} className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <PostItem post={p} author={au[p.authorId]} admin onReply={replies ? () => onOpenThread(p.id) : undefined} />
      </div>
      <Btn tone="ghost" title={p.removed ? 'Restore' : 'Remove'} onClick={() => act(p)}>
        {p.removed ? <RotateCcw size={15} /> : <Trash2 size={15} />}
      </Btn>
    </div>
  )

  return (
    <>
      <div className="flex items-center gap-3">
        <Btn onClick={onBack}>
          <ArrowLeft size={15} /> {threadId ? `#${channel?.name}` : 'Community'}
        </Btn>
        <h1 className="flex items-center gap-1 text-[22px] font-semibold tracking-tight">
          {threadId ? 'Thread' : <><Hash size={18} className="text-muted" /> {channel?.name}</>}
        </h1>
        {channel?.archived && <Pill>Archived</Pill>}
      </div>
      {err && <p className="text-[14px] text-danger">{err}</p>}
      <Panel className="mx-auto w-full max-w-[820px] px-4 py-3">
        {!threadId && posts?.length === 0 && <p className="py-6 text-center text-[14px] text-muted">No posts yet. Start the conversation below.</p>}
        {!threadId && posts?.map((p) => adminRow(p, authors, true))}
        {threadId && thread && (
          <>
            {adminRow(thread.post, thread.authors, false)}
            <div className="my-2 flex items-center gap-3 text-[13px] text-muted">
              {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
              <span className="h-px flex-1 bg-line" />
            </div>
            {thread.replies.map((r) => adminRow(r, thread.authors, false))}
          </>
        )}
        {channel && !channel.archived && (
          <div className="mt-2">
            <Composer
              placeholder={threadId ? 'Reply as Betterhood team…' : `Post in #${channel.name} as Betterhood team…`}
              busyLabel="Posting…"
              onSend={async (text) => {
                try {
                  await a.post(channel.id, text, threadId)
                  await load()
                  return true
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Couldn’t post')
                  return false
                }
              }}
            />
          </div>
        )}
      </Panel>
    </>
  )
}

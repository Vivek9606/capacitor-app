import { ChevronLeft, ChevronRight, Hash, MessageSquare, Pin, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Navigate, NavLink, useNavigate, useParams } from 'react-router-dom'
import { Composer, PostItem } from '../../components/CommunityParts'
import { Page } from '../../components/Shell'
import { Button, Chip, cx, Empty, Sheet, TextArea } from '../../components/ui'
import { ApiError, apiMode } from '../../lib/api'
import { type CAuthor, type CChannel, type CFeed, type CPost, type CThread, communityApi } from '../../lib/community'
import { haptic, toast } from '../../lib/platform'
import { useMe } from '../../lib/store'

/**
 * Community: Slack-style channels for physios.
 *  /physio-dashboard/community               channel list (phones) / list + intro (desktop)
 *  /physio-dashboard/community/c/:id         a channel: messages oldest → newest, message box at the bottom
 *  /physio-dashboard/community/t/:postId     a thread: the message and its replies
 * Everything is live from the API and refreshed every few seconds while open.
 */

const POLL_MS = 8000

function useApi() {
  const { session } = useMe()
  return useMemo(() => communityApi(session?.token), [session?.token])
}

/** Calls `fn` now and then every `ms` while the page is visible. */
function usePoll(fn: () => void, ms: number, deps: unknown[]) {
  useEffect(() => {
    fn()
    const t = setInterval(() => document.visibilityState === 'visible' && fn(), ms)
    const onVis = () => document.visibilityState === 'visible' && fn()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function useChannels() {
  const a = useApi()
  const [channels, setChannels] = useState<CChannel[]>()
  const [error, setError] = useState('')
  usePoll(
    () => {
      a.channels()
        .then((r) => (setChannels(r.channels), setError('')))
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Couldn’t load the community'))
    },
    POLL_MS * 2,
    [a],
  )
  return { channels, error }
}

function DemoNotice() {
  return (
    <Page>
      <h1 className="pb-4 font-display text-[26px] font-bold tracking-[-0.01em]">Community</h1>
      <Empty icon={<MessageSquare size={22} />} title="Community needs the live app" body="It isn’t available in demo mode." />
    </Page>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Channel list

function ChannelRow({ c, active, compact }: { c: CChannel; active?: boolean; compact?: boolean }) {
  return (
    <NavLink
      to={`/physio-dashboard/community/c/${c.id}`}
      className={cx(
        'flex items-center gap-3 rounded-2xl text-left cursor-pointer',
        compact ? 'px-3 py-2' : 'border border-line bg-surface px-4 py-3.5 hover:border-brand-line',
        compact && (active ? 'bg-brand-soft text-brand' : 'hover:bg-track/60'),
      )}
    >
      {!compact && (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-brand-soft text-brand">
          <Hash size={19} />
        </div>
      )}
      {compact && <Hash size={16} className="shrink-0 opacity-70" />}
      <div className="min-w-0 flex-1">
        <div className={cx('flex items-center gap-1.5 truncate', compact ? 'text-[14px]' : 'text-[15px]', c.unread > 0 ? 'font-bold' : 'font-semibold')}>
          <span className="truncate">{c.name}</span>
          {c.pinned && !c.isDefault && <Pin size={12} className="shrink-0 text-muted" aria-label="Pinned" />}
        </div>
        {!compact && c.description && <div className="mt-0.5 line-clamp-1 text-[13px] text-muted">{c.description}</div>}
      </div>
      {c.unread > 0 && <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[12px] font-bold text-white">{c.unread > 99 ? '99+' : c.unread}</span>}
      {!compact && c.unread === 0 && <ChevronRight size={18} className="shrink-0 text-faint" />}
    </NavLink>
  )
}

/** Desktop: channels down the left of every Community screen. */
function ChannelRail({ activeId }: { activeId?: string }) {
  const { channels } = useChannels()
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-line/70 px-3 py-6 lg:flex">
      <NavLink to="/physio-dashboard/community" className="px-3 font-display text-[20px] font-bold">
        Community
      </NavLink>
      <div className="mt-4 flex flex-col gap-0.5 overflow-y-auto">{channels?.map((c) => <ChannelRow key={c.id} c={c} compact active={c.id === activeId} />)}</div>
    </aside>
  )
}

export default function Community() {
  const { channels, error } = useChannels()
  if (!apiMode) return <DemoNotice />
  return (
    <Page wide>
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] lg:text-[28px]">Community</h1>
      <p className="mt-1 text-[15px] text-muted">Physios helping physios. Discuss cases, ask questions, share what works.</p>
      <div className="mt-5 lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">
        <div className="flex flex-col gap-2.5">
          {!channels && !error && [0, 1, 2].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-track/70" />)}
          {error && <Empty icon={<MessageSquare size={22} />} title="Couldn’t load the community" body={error} />}
          {channels?.map((c) => <ChannelRow key={c.id} c={c} />)}
        </div>
        <Guidelines className="mt-6 lg:mt-0" />
      </div>
    </Page>
  )
}

function Guidelines({ className }: { className?: string }) {
  return (
    <div className={cx('rounded-[22px] bg-brand-soft p-5 lg:self-start', className)}>
      <div className="flex items-center gap-2 font-semibold text-brand">
        <ShieldCheck size={18} /> Community guidelines
      </div>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[14px] leading-relaxed">
        <li>Never identify a patient: no names, phone numbers, addresses or faces. Age, sex, diagnosis and findings are fine.</li>
        <li>Give enough context for a useful answer: history, findings, what you’ve tried.</li>
        <li>Disagree with ideas, not people.</li>
        <li>No adverts. Mentioning your clinic in passing is fine.</li>
      </ul>
      <p className="mt-3 text-[13px] text-muted">Every message is checked before it’s posted, and you can report anything that breaks these rules.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Post actions (shared by channel and thread)

const REPORT_REASONS = ['Identifies a patient', 'Unsafe clinical advice', 'Rude or abusive', 'Spam or advert', 'Something else']

function usePostActions(onChanged: (p: CPost | { id: string; gone: true }) => void) {
  const a = useApi()
  const [menuFor, setMenuFor] = useState<CPost>()
  const [mode, setMode] = useState<'menu' | 'edit' | 'delete' | 'report'>('menu')
  const [draft, setDraft] = useState('')
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const open = (p: CPost) => {
    setMenuFor(p)
    setMode('menu')
    setDraft(p.body)
    setErr('')
  }
  const close = () => setMenuFor(undefined)

  const helpful = async (p: CPost) => {
    haptic('light')
    onChanged({ ...p, reacted: !p.reacted, helpful: p.helpful + (p.reacted ? -1 : 1) })
    try {
      const r = await a.helpful(p.id)
      onChanged({ ...p, reacted: r.reacted, helpful: r.helpful })
    } catch (e) {
      onChanged(p)
      toast(e instanceof Error ? e.message : 'Couldn’t save')
    }
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setErr('')
    try {
      await fn()
      close()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const sheet = (
    <Sheet open={!!menuFor} onClose={close} title={mode === 'edit' ? 'Edit message' : mode === 'delete' ? 'Delete this message?' : mode === 'report' ? 'Report this message' : undefined}>
      {menuFor && mode === 'menu' && (
        <div className="flex flex-col gap-2.5">
          {menuFor.mine ? (
            <>
              <Button block variant="secondary" onClick={() => setMode('edit')}>
                Edit
              </Button>
              <Button block variant="secondary" className="text-danger" onClick={() => setMode('delete')}>
                Delete
              </Button>
            </>
          ) : (
            <Button block variant="secondary" onClick={() => setMode('report')}>
              Report to the Betterhood team
            </Button>
          )}
          <Button block variant="secondary" onClick={() => (navigator.clipboard?.writeText(menuFor.body), toast('Copied'), close())}>
            Copy text
          </Button>
        </div>
      )}
      {menuFor && mode === 'edit' && (
        <div className="flex flex-col gap-3">
          <TextArea rows={6} value={draft} maxLength={4000} onChange={(e) => setDraft(e.target.value)} aria-label="Message" />
          {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-[14px] text-danger">{err}</p>}
          <Button block disabled={busy || draft.trim().length < 2} onClick={() => run(async () => onChanged((await a.edit(menuFor.id, draft.trim())).post))}>
            {busy ? 'Checking and saving…' : 'Save'}
          </Button>
        </div>
      )}
      {menuFor && mode === 'delete' && (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-muted">It disappears for everyone. Replies to it stay.</p>
          {err && <p className="text-[14px] text-danger">{err}</p>}
          <Button block variant="secondary" disabled={busy} className="border-danger/40 text-danger" onClick={() => run(async () => (await a.remove(menuFor.id), onChanged({ id: menuFor.id, gone: true }), toast('Message deleted')))}>
            Delete
          </Button>
          <Button block variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      )}
      {menuFor && mode === 'report' && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] text-muted">The Betterhood team reviews every report. The author isn’t told who reported it.</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <Chip key={r} selected={reason === r} onClick={() => setReason(r)}>
                {r}
              </Chip>
            ))}
          </div>
          {err && <p className="text-[14px] text-danger">{err}</p>}
          <Button block disabled={busy} onClick={() => run(async () => (await a.report(menuFor.id, reason), toast('Thanks, the team will review it')))}>
            Send report
          </Button>
        </div>
      )}
    </Sheet>
  )
  return { open, helpful, sheet }
}

/** "This can't be posted" message from the safety check, shown above the message box. */
function useSendError() {
  const [err, setErr] = useState('')
  const note = err ? (
    <div className="mb-2 flex items-start gap-2 rounded-2xl bg-warn-soft px-3.5 py-2.5 text-[14px]">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-warn" />
      <span className="flex-1">{err}</span>
      <button onClick={() => setErr('')} className="text-[13px] font-semibold text-muted cursor-pointer">
        OK
      </button>
    </div>
  ) : undefined
  return { setErr, note }
}

// ---------------------------------------------------------------------------------------------------------------
// Channel

/** Full-height column: header, scrolling messages, message box pinned to the bottom. */
function ChatFrame({ rail, header, children, composer, scrollRef, onScroll }: { rail: React.ReactNode; header: React.ReactNode; children: React.ReactNode; composer: React.ReactNode; scrollRef: React.RefObject<HTMLDivElement>; onScroll?: () => void }) {
  return (
    <div className="flex h-[calc(100dvh-env(safe-area-inset-top))]">
      {rail}
      <div className="mx-auto flex min-w-0 max-w-[820px] flex-1 flex-col lg:px-8">
        <div className="flex items-center gap-3 border-b border-line/70 px-4 py-3 lg:px-0">{header}</div>
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-3 lg:px-0">
          {children}
        </div>
        {composer}
      </div>
    </div>
  )
}

function BackButton({ to }: { to: string }) {
  const nav = useNavigate()
  return (
    <button aria-label="Back" onClick={() => nav(to)} className="pressable grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line/80 bg-surface shadow-card cursor-pointer lg:hidden">
      <ChevronLeft size={20} />
    </button>
  )
}

function mergePosts(prev: CPost[], incoming: CPost[]): CPost[] {
  const map = new Map(prev.map((p) => [p.id, p]))
  for (const p of incoming) map.set(p.id, p)
  return [...map.values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt))
}

export function CommunityChannel() {
  const { id = '' } = useParams()
  const a = useApi()
  const nav = useNavigate()
  const [feed, setFeed] = useState<CFeed>()
  const [posts, setPosts] = useState<CPost[]>([])
  const [authors, setAuthors] = useState<Record<string, CAuthor>>({})
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const [loadingOlder, setLoadingOlder] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true) // keep the view at the bottom while the reader is there
  const olderLoaded = useRef(false) // once older pages are loaded, "more" comes from them, not the poll
  const { setErr, note } = useSendError()

  useEffect(() => {
    setFeed(undefined)
    setPosts([])
    setError('')
    stick.current = true
    olderLoaded.current = false
  }, [id])

  usePoll(
    () => {
      a.feed(id)
        .then((f) => {
          setFeed(f)
          setAuthors((x) => ({ ...x, ...f.authors }))
          setPosts((prev) => {
            // Drop posts the latest page no longer has (deleted), but keep older pages we've loaded.
            const oldest = f.posts[0]?.createdAt
            const kept = prev.filter((p) => oldest && p.createdAt < oldest)
            return mergePosts(kept, f.posts)
          })
          if (!olderLoaded.current) setMore(f.more)
          setError('')
        })
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Couldn’t load messages'))
    },
    POLL_MS,
    [a, id],
  )

  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [posts.length, feed])

  const onScroll = () => {
    const el = scroller.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  const loadOlder = async () => {
    if (!posts[0]) return
    setLoadingOlder(true)
    const el = scroller.current
    const before = el ? el.scrollHeight - el.scrollTop : 0
    try {
      const f = await a.feed(id, posts[0].createdAt)
      setAuthors((x) => ({ ...x, ...f.authors }))
      stick.current = false
      setPosts((prev) => mergePosts(prev, f.posts))
      olderLoaded.current = true
      setMore(f.more)
      requestAnimationFrame(() => el && (el.scrollTop = el.scrollHeight - before))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t load older messages')
    } finally {
      setLoadingOlder(false)
    }
  }

  const onChanged = useCallback((p: CPost | { id: string; gone: true }) => {
    setPosts((prev) => ('gone' in p ? prev.filter((x) => x.id !== p.id) : prev.map((x) => (x.id === p.id ? p : x))))
  }, [])
  const actions = usePostActions(onChanged)

  if (!apiMode) return <DemoNotice />
  if (error && !feed) return <Navigate to="/physio-dashboard/community" replace />

  return (
    <ChatFrame
      rail={<ChannelRail activeId={id} />}
      scrollRef={scroller}
      onScroll={onScroll}
      header={
        <>
          <BackButton to="/physio-dashboard/community" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1 truncate font-display text-[20px] font-bold leading-tight">
              <Hash size={18} className="shrink-0 text-muted" />
              {feed?.channel.name ?? ' '}
            </h1>
            {feed?.channel.description && <p className="truncate text-[13px] text-muted">{feed.channel.description}</p>}
          </div>
        </>
      }
      composer={
        <Composer
          placeholder={`Message #${feed?.channel.name ?? ''}`}
          busyLabel="Checking and posting…"
          note={note}
          onSend={async (text) => {
            setErr('')
            try {
              const r = await a.post(id, text)
              setAuthors((x) => ({ ...x, ...r.authors }))
              stick.current = true
              setPosts((prev) => mergePosts(prev, [r.post]))
              haptic('light')
              return true
            } catch (e) {
              setErr(e instanceof Error ? e.message : 'Couldn’t post')
              return false
            }
          }}
        />
      }
    >
      {more && (
        <div className="flex justify-center pb-2">
          <Button size="sm" variant="secondary" disabled={loadingOlder} onClick={loadOlder}>
            {loadingOlder ? 'Loading…' : 'Load earlier messages'}
          </Button>
        </div>
      )}
      {!feed && [0, 1, 2].map((i) => <div key={i} className="mb-3 h-20 animate-pulse rounded-2xl bg-track/60" />)}
      {feed && posts.length === 0 && (
        <Empty
          icon={<MessageSquare size={22} />}
          title={feed.channel.isDefault ? 'Say hello' : `Start #${feed.channel.name}`}
          body={feed.channel.isDefault ? 'Introduce yourself: where you practise and what you treat most.' : 'Be the first to post here. Ask a question or share a case.'}
        />
      )}
      {posts.map((p) => (
        <PostItem key={p.id} post={p} author={authors[p.authorId]} onHelpful={() => actions.helpful(p)} onReply={() => nav(`/physio-dashboard/community/t/${p.id}`)} onMenu={() => actions.open(p)} />
      ))}
      {actions.sheet}
    </ChatFrame>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Thread

export function CommunityThread() {
  const { postId = '' } = useParams()
  const a = useApi()
  const [t, setT] = useState<CThread>()
  const [error, setError] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const { setErr, note } = useSendError()
  const [justSent, setJustSent] = useState(0)

  usePoll(
    () => {
      a.thread(postId)
        .then((x) => (setT(x), setError('')))
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Couldn’t load the thread'))
    },
    POLL_MS,
    [a, postId],
  )
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && justSent) el.scrollTop = el.scrollHeight
  }, [justSent, t?.replies.length])

  const onChanged = useCallback((p: CPost | { id: string; gone: true }) => {
    setT((x) => {
      if (!x) return x
      if ('gone' in p) return p.id === x.post.id ? { ...x, post: { ...x.post, removed: true, body: '' } } : { ...x, replies: x.replies.filter((r) => r.id !== p.id), post: { ...x.post, replyCount: x.post.replyCount - 1 } }
      return p.id === x.post.id ? { ...x, post: p } : { ...x, replies: x.replies.map((r) => (r.id === p.id ? p : r)) }
    })
  }, [])
  const actions = usePostActions(onChanged)

  if (!apiMode) return <DemoNotice />
  if (error && !t)
    return (
      <Page>
        <Empty icon={<MessageSquare size={22} />} title="This thread isn’t available" body={error} action={<Button onClick={() => history.back()}>Back</Button>} />
      </Page>
    )

  const back = t ? `/physio-dashboard/community/c/${t.channel.id}` : '/physio-dashboard/community'
  return (
    <ChatFrame
      rail={<ChannelRail activeId={t?.channel.id} />}
      scrollRef={scroller}
      header={
        <>
          <BackButton to={back} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[20px] font-bold leading-tight">Thread</h1>
            {t && (
              <NavLink to={back} className="flex items-center gap-0.5 truncate text-[13px] text-muted hover:text-brand">
                <Hash size={12} /> {t.channel.name}
              </NavLink>
            )}
          </div>
        </>
      }
      composer={
        t && !t.post.removed ? (
          <Composer
            placeholder="Reply…"
            busyLabel="Checking and posting…"
            note={note}
            onSend={async (text) => {
              setErr('')
              try {
                const r = await a.post(t.channel.id, text, t.post.id)
                setT((x) => (x ? { ...x, authors: { ...x.authors, ...r.authors }, replies: [...x.replies, r.post], post: { ...x.post, replyCount: x.post.replyCount + 1 } } : x))
                setJustSent((n) => n + 1)
                haptic('light')
                return true
              } catch (e) {
                setErr(e instanceof Error ? e.message : 'Couldn’t post')
                return false
              }
            }}
          />
        ) : null
      }
    >
      {!t && <div className="h-28 animate-pulse rounded-2xl bg-track/60" />}
      {t && (
        <>
          <PostItem post={t.post} author={t.authors[t.post.authorId]} onHelpful={t.post.removed ? undefined : () => actions.helpful(t.post)} onMenu={t.post.removed ? undefined : () => actions.open(t.post)} />
          <div className="my-2 flex items-center gap-3 px-1 text-[13px] text-muted">
            <span>
              {t.replies.length} {t.replies.length === 1 ? 'reply' : 'replies'}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          {t.replies.map((r) => (
            <PostItem key={r.id} post={r} author={t.authors[r.authorId]} onHelpful={() => actions.helpful(r)} onMenu={() => actions.open(r)} />
          ))}
        </>
      )}
      {actions.sheet}
    </ChatFrame>
  )
}

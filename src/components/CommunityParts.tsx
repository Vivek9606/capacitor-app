import { BadgeCheck, MessageCircle, MoreHorizontal, Send, ThumbsUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type CAuthor, type CPost, postTime } from '../lib/community'
import { Avatar, cx } from './ui'

const UNKNOWN: CAuthor = { id: '?', name: 'Former member' }

export function AuthorName({ author }: { author: CAuthor }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="truncate font-semibold">{author.name}</span>
      {author.verified && <BadgeCheck size={15} className="shrink-0 text-brand" aria-label="Verified physio" />}
      {author.team && <span className="shrink-0 rounded-full bg-brand px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">Team</span>}
    </span>
  )
}

function TeamAvatar({ size }: { size: number }) {
  return (
    <div className="grid shrink-0 place-items-center rounded-full bg-brand font-display font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      b
    </div>
  )
}

/**
 * One message in a channel or thread, Slack-style: avatar, name, time, text, then actions.
 * Callbacks that aren't passed hide their button (admins don't react; replies inside a thread don't open threads).
 */
export function PostItem({
  post,
  author = UNKNOWN,
  onReply,
  onHelpful,
  onMenu,
  highlight,
  admin,
}: {
  post: CPost
  author?: CAuthor
  onReply?: () => void
  onHelpful?: () => void
  onMenu?: () => void
  highlight?: boolean
  admin?: boolean
}) {
  if (post.removed && !admin)
    return (
      <div className="flex gap-3 px-1 py-2">
        <div className="h-9 w-9 shrink-0" />
        <div className="text-[14px] italic text-faint">This message was removed.</div>
      </div>
    )
  return (
    <div className={cx('group flex gap-3 rounded-2xl px-1 py-2', highlight && 'bg-brand-soft/50', post.removed && 'opacity-60')}>
      {author.team ? <TeamAvatar size={36} /> : <Avatar name={author.name} photo={author.photo} size={36} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-[14px]">
          <AuthorName author={author} />
          <span className="shrink-0 text-[12px] text-faint">
            {postTime(post.createdAt)}
            {post.editedAt && ' · edited'}
          </span>
          {onMenu && (
            <button onClick={onMenu} aria-label="More options" className="-my-1 ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint hover:bg-track hover:text-ink cursor-pointer">
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>
        {author.qualification && !author.team && <div className="truncate text-[12px] text-muted">{author.qualification}</div>}
        {admin && post.removed && <div className="mt-1 text-[12px] font-semibold text-danger">Removed{post.removedReason ? `: ${post.removedReason}` : ''}</div>}
        <div className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{post.body}</div>
        {(onHelpful || onReply || post.helpful > 0 || (admin && post.replyCount > 0)) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {onHelpful ? (
              <button
                onClick={onHelpful}
                aria-pressed={post.reacted}
                className={cx(
                  'pressable inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium cursor-pointer',
                  post.reacted ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-muted hover:text-ink',
                )}
              >
                <ThumbsUp size={14} /> Helpful{post.helpful > 0 && ` · ${post.helpful}`}
              </button>
            ) : (
              post.helpful > 0 && (
                <span className="inline-flex h-8 items-center gap-1.5 px-1 text-[13px] text-muted">
                  <ThumbsUp size={14} /> {post.helpful}
                </span>
              )
            )}
            {onReply && (
              <button onClick={onReply} className="pressable inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-medium text-brand hover:border-brand-line cursor-pointer">
                <MessageCircle size={14} />
                {post.replyCount > 0 ? `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}` : 'Reply'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Message box that grows with the text. Enter sends on desktop; Shift+Enter (or Enter on phones) adds a line. */
export function Composer({
  placeholder,
  onSend,
  busyLabel = 'Posting…',
  note,
}: {
  placeholder: string
  onSend: (text: string) => Promise<boolean>
  busyLabel?: string
  note?: React.ReactNode
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [text])
  const send = async () => {
    const t = text.trim()
    if (t.length < 2 || busy) return
    setBusy(true)
    const ok = await onSend(t)
    setBusy(false)
    if (ok) setText('')
  }
  const desktop = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches
  return (
    <div className="border-t border-line/70 bg-bg/95 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur lg:px-0">
      {note}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={4000}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (desktop && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-[180px] min-h-11 flex-1 resize-none rounded-[22px] border border-line bg-surface px-4 py-2.5 text-[15px] leading-snug outline-none focus:border-brand disabled:opacity-70"
        />
        <button aria-label="Send" disabled={text.trim().length < 2 || busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-40 cursor-pointer">
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-label={busyLabel} /> : <Send size={17} />}
        </button>
      </form>
      {busy && <div className="mt-1.5 px-2 text-[12px] text-muted">{busyLabel}</div>}
    </div>
  )
}

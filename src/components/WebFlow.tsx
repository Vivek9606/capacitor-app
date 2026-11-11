import { ArrowLeft, RotateCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { embedUrl, WEBSITE_ORIGIN, type WebMsg } from '../lib/web'
import { Button, IconButton } from './ui'

/**
 * Runs a betterhood.in page inside the app (an in-app frame, never the external browser).
 * The page runs in embed mode; when it says it's ready we send `context` (signed-in session, known details),
 * and every message it sends comes to `onMessage`. Only messages from this frame at the website's origin count.
 */
export function WebFlow({
  path,
  title,
  context,
  onMessage,
  onBack,
}: {
  path: string
  title: string
  context?: Record<string, unknown>
  onMessage?: (msg: WebMsg, reply: (msg: Record<string, unknown>) => void) => void
  onBack: () => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const src = useMemo(() => embedUrl(path), [path])

  // Latest handlers without re-subscribing.
  const latest = useRef({ context, onMessage })
  latest.current = { context, onMessage }

  useEffect(() => {
    const reply = (msg: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(msg, WEBSITE_ORIGIN)
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== WEBSITE_ORIGIN || e.source !== frame.current?.contentWindow) return
      const msg = e.data as WebMsg | null
      if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('bh:')) return
      if (msg.type === 'bh:ready') reply({ type: 'bh:context', ...(latest.current.context ?? {}) })
      latest.current.onMessage?.(msg, reply)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    setLoaded(false)
    setSlow(false)
    const t = setTimeout(() => setSlow(true), 15_000)
    return () => clearTimeout(t)
  }, [attempt])

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <IconButton aria-label="Back" onClick={onBack}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="min-w-0 flex-1 truncate text-[16px] font-semibold">{title}</div>
      </div>
      <div className="relative flex-1">
        <iframe
          key={attempt}
          ref={frame}
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full border-0 bg-bg"
          allow="clipboard-write"
        />
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center bg-bg">
            {slow ? (
              <div className="max-w-[300px] px-6 text-center">
                <p className="text-[15px] text-muted">This is taking longer than usual. Check your connection.</p>
                <Button variant="secondary" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
                  <RotateCw size={16} /> Try again
                </Button>
              </div>
            ) : (
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

import { CalendarCheck, ClipboardList, Gift, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Avatar, Button, Card } from '../../components/ui'
import { api, apiMode } from '../../lib/api'
import { useStore } from '../../lib/store'

// /join?ref=CODE — invite landing. Works in the browser; store badges are optional.
export default function Join() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { db } = useStore()
  const ref = params.get('ref')?.toUpperCase()
  const [remoteRef, setRemoteRef] = useState<{ name: string; photo?: string }>()
  const referrer = apiMode ? remoteRef : db.physios.find((p) => p.inviteCode === ref)

  useEffect(() => {
    if (!apiMode || !ref) return
    api<{ name: string; photo?: string }>(`/public/invite/${encodeURIComponent(ref)}`)
      .then(setRemoteRef)
      .catch(() => undefined)
  }, [ref])

  useEffect(() => {
    if (!ref) return
    try {
      sessionStorage.setItem('bh-ref', ref)
    } catch {
      /* ignore */
    }
  }, [ref])

  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col px-5 pb-8 pt-6 safe-top">
        <Logo tag="for Physios" />
        {referrer && (
          <div className="mt-8 flex items-center gap-3">
            <Avatar name={referrer.name} photo={referrer.photo} size={44} />
            <p className="text-[15px] leading-snug">
              <b>{referrer.name}</b> invited you to Betterhood
            </p>
          </div>
        )}
        <h1 className="mt-5 text-[32px] font-semibold leading-[1.1] tracking-[-0.02em]">Care that continues after the session.</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">Free for physiotherapists. Works in your browser — or get the app.</p>

        <div className="mt-6 flex flex-col gap-3">
          {[
            { icon: <ClipboardList size={18} />, t: 'Care plans in 2 minutes', s: 'Drag & drop from 30+ exercise videos, add a treatment plan, send on WhatsApp' },
            { icon: <CalendarCheck size={18} />, t: 'Bookings that confirm themselves', s: 'Automatic WhatsApp confirmations and reminders' },
            { icon: <MessageCircle size={18} />, t: 'See who’s doing their exercises', s: 'Adherence and pain scores, without chasing patients' },
          ].map((r) => (
            <div key={r.t} className="flex gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{r.icon}</div>
              <div>
                <div className="font-semibold">{r.t}</div>
                <div className="text-[14px] text-muted">{r.s}</div>
              </div>
            </div>
          ))}
        </div>

        {referrer && (
          <Card className="mt-6 flex items-center gap-3 border-accent/30 bg-accent-soft/60 p-4">
            <Gift className="shrink-0 text-accent" size={22} />
            <p className="text-[14px]">
              Sign up with code <b>{ref}</b> — you both get a month of Premium when you send your first care plan.
            </p>
          </Card>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Button block onClick={() => nav('/login', { state: { intent: 'signup' } })}>
            Get started on the web
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <a href="https://play.google.com/store" target="_blank" rel="noreferrer" className="rounded-xl bg-ink px-3 py-2.5 text-center text-white">
              <div className="text-[10px] opacity-70">GET IT ON</div>
              <div className="text-[15px] font-semibold">Google Play</div>
            </a>
            <a href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer" className="rounded-xl bg-ink px-3 py-2.5 text-center text-white">
              <div className="text-[10px] opacity-70">Download on the</div>
              <div className="text-[15px] font-semibold">App Store</div>
            </a>
          </div>
          <p className="text-center text-[12px] text-muted">Your invite code is applied automatically on this device.</p>
        </div>
      </div>
    </div>
  )
}

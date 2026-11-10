import { Check, Copy, Gift } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../../../components/Shell'
import { Avatar, Badge, Card, cx, PageHeader, Sheet, WhatsAppButton } from '../../../components/ui'
import { timeAgo } from '../../../lib/dates'
import { firstName } from '../../../lib/logic'
import { copyText, openWhatsApp, publicUrl, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

const MILESTONES = [
  { n: 1, label: '1 month Premium' },
  { n: 3, label: 'Ambassador badge' },
  { n: 5, label: 'Free course' },
  { n: 10, label: 'Community Champion' },
]

// G1 · Refer a physio
export default function Refer() {
  const { physio } = useMe()
  const { db } = useStore()
  const [how, setHow] = useState(false)
  if (!physio) return null
  const refs = db.referrals.filter((r) => r.referrerId === physio.id).sort((a, b) => b.at.localeCompare(a.at))
  const activated = refs.filter((r) => r.status === 'activated').length
  const nextIdx = MILESTONES.findIndex((m) => activated < m.n)
  const link = publicUrl(`/join?ref=${physio.inviteCode}`)
  const invite = () =>
    openWhatsApp(
      undefined,
      `Hey! I use Betterhood to send exercise plans and treatment plans to patients on WhatsApp — it’s free. Sign up with my code ${physio.inviteCode} and we both get a month of Premium: ${link}`,
    )

  return (
    <Page wide>
      <PageHeader
        title="Refer a physio"
        right={
          <button className="text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setHow(true)}>
            How it works
          </button>
        }
      />
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <div className="bg-hero rounded-[24px] shadow-brand p-5 text-white">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
              <Gift size={20} />
            </div>
            <div className="mt-3 font-display text-[22px] font-bold leading-tight">Give 1 month, get 1 month of Premium</div>
            <p className="mt-2 text-[14px] text-white/80">When a physio you invite sends their first care plan, you both get a month of Premium.</p>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-ink">
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-muted">YOUR INVITE CODE</div>
                <div className="font-display text-[20px] font-bold tracking-wide text-brand">{physio.inviteCode}</div>
              </div>
              <button className="flex items-center gap-1.5 text-[14px] font-semibold text-brand cursor-pointer" onClick={() => copyText(physio.inviteCode, 'Invite code copied')}>
                <Copy size={16} /> Copy
              </button>
            </div>
          </div>
          <WhatsAppButton block className="mt-3" onClick={invite}>
            Invite on WhatsApp
          </WhatsAppButton>
          <button className="mt-2 w-full py-2 text-[14px] font-semibold text-brand cursor-pointer" onClick={() => copyText(link, 'Invite link copied')}>
            Copy invite link
          </button>
        </div>

        <div>
          <div className="mb-3 mt-5 flex items-center justify-between lg:mt-0">
            <h2 className="text-[17px] font-semibold">Milestones</h2>
            <span className="text-[14px] font-semibold text-brand">{activated} activated</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MILESTONES.map((m, i) => {
              const done = activated >= m.n
              const next = i === nextIdx
              return (
                <div
                  key={m.n}
                  className={cx(
                    'flex flex-col items-center rounded-2xl border px-1.5 py-3 text-center',
                    done ? 'border-transparent bg-brand-soft' : next ? 'border-accent bg-surface' : 'border-line bg-surface',
                  )}
                >
                  <div
                    className={cx(
                      'grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold',
                      done ? 'bg-brand text-white' : next ? 'bg-accent text-white' : 'bg-track text-muted',
                    )}
                  >
                    {done ? <Check size={15} strokeWidth={3} /> : m.n}
                  </div>
                  <div className={cx('mt-1.5 text-[12px] leading-tight', done || next ? 'font-medium text-ink' : 'text-muted')}>{m.label}</div>
                </div>
              )
            })}
          </div>

          <Card className="mt-3 divide-y divide-line">
            {refs.length === 0 && <div className="p-4 text-[14px] text-muted">No invites yet. Physios you invite will show up here.</div>}
            {refs.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={r.name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{r.name}</div>
                  <div className="text-[13px] text-muted">
                    {r.status === 'activated' ? 'Sent first care plan' : r.status === 'joined' ? 'Joined · no plan yet' : `Invite sent ${timeAgo(r.at)}`}
                  </div>
                </div>
                {r.status === 'activated' ? (
                  <Badge tone="brand" icon={<Check size={12} strokeWidth={3} />}>
                    Activated
                  </Badge>
                ) : r.status === 'joined' ? (
                  <button onClick={() => toast(`Nudge sent to ${firstName(r.name)}`)} className="cursor-pointer">
                    <Badge tone="accent">Nudge</Badge>
                  </button>
                ) : (
                  <Badge tone="muted">Pending</Badge>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>
      <div className="h-6" />

      <Sheet open={how} onClose={() => setHow(false)} title="How referrals work">
        <ol className="flex flex-col gap-3 text-[15px]">
          {[
            'Share your code or link with a physio friend.',
            'They sign up with your code — in the browser or the app.',
            'When they send their first care plan, the invite is activated.',
            'You both get a month of Premium. More activations unlock badges and a free course.',
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-muted">Only activated invites count, which keeps rewards fair.</p>
      </Sheet>
    </Page>
  )
}

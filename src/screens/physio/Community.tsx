import { Bot, Check, ClipboardList, MessageSquare, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../../components/Shell'
import { Button, Chip, cx, Sheet } from '../../components/ui'
import { haptic, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

const TOPICS = ['LBP in desk workers', 'ACL return-to-sport', 'Pricing your sessions', 'Pelvic floor rehab', 'Frozen shoulder', 'Starting a clinic']

// C1 · Community (coming soon) + C2 · Waitlist joined
export default function Community() {
  const { physio } = useMe()
  const store = useStore()
  const [sheet, setSheet] = useState(false)
  const [topics, setTopics] = useState<string[]>(physio?.communityTopics ?? [])
  if (!physio) return null
  const joined = physio.communityWaitlist

  return (
    <Page wide>
      <h1 className="pb-4 font-display text-[26px] font-bold tracking-[-0.01em] lg:text-[28px]">Community</h1>
      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        <div className="rounded-[22px] bg-brand-soft p-4 lg:self-start">
          <div className="rounded-2xl bg-surface p-4">
            <div className="flex gap-2">
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">CASE</span>
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-medium text-brand">Knee · Post-op</span>
            </div>
            <div className="mt-2.5 text-[15px] font-semibold leading-snug">Post-ACL, 6 wks, quad lag persists — what has worked for you?</div>
            <div className="mt-1 text-[12px] text-muted">Age 28 · Hamstring graft · ROM 0–120°</div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {['RK', 'MS', 'PN'].map((x, i) => (
                  <span key={x} className={cx('grid h-6 w-6 place-items-center rounded-full border-2 border-brand-soft text-[9px] font-bold', i === 1 ? 'bg-accent-soft text-accent' : 'bg-surface text-brand')}>
                    {x}
                  </span>
                ))}
              </div>
              <span className="text-[13px] font-medium">12 physios replied</span>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-brand">
              <ShieldCheck size={13} /> Bot-moderated
            </span>
          </div>
        </div>

        <div>
          <span className="mt-6 inline-block rounded-full bg-accent px-2.5 py-1 text-[12px] font-bold tracking-wide text-white lg:mt-0">COMING SOON</span>
          <h2 className="mt-3 font-display text-[26px] font-bold leading-tight tracking-[-0.01em]">The Physio Forum is coming soon</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">Discuss real cases with peers and build a searchable knowledge base for Indian physios.</p>
          <div className="mt-5 flex flex-col gap-3.5">
            {[
              { icon: <ClipboardList size={18} />, t: 'Structured case templates', s: 'Every question comes with enough clinical context' },
              { icon: <Bot size={18} />, t: 'Bot-moderated', s: 'Keeps it professional and patient-safe' },
              { icon: <MessageSquare size={18} />, t: 'Expert threads & AMAs', s: 'Topic discussions led by the Betterhood team' },
            ].map((r) => (
              <div key={r.t} className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-brand">{r.icon}</div>
                <div>
                  <div className="text-[15px] font-semibold">{r.t}</div>
                  <div className="text-[13px] text-muted">{r.s}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {['AK', 'SV', 'RN', '+'].map((x, i) => (
                <span key={x} className={cx('grid h-7 w-7 place-items-center rounded-full border-2 border-bg text-[10px] font-bold', i === 1 || i === 3 ? 'bg-accent-soft text-accent' : 'bg-brand-soft text-brand')}>
                  {x}
                </span>
              ))}
            </div>
            <span className="text-[14px] font-medium">{(1240 + (joined ? 1 : 0)).toLocaleString('en-IN')} physios on the waitlist</span>
          </div>
          <div className="mt-5 pb-6">
            {joined ? (
              <div className="flex items-center gap-3 rounded-2xl bg-ok-soft p-4 text-[14px]">
                <Check size={18} className="text-ok" />
                <div className="flex-1">
                  You’re on the list. We’ll tell you on WhatsApp the day it opens.
                  {physio.communityTopics.length > 0 && <div className="mt-1 text-muted">Your topics: {physio.communityTopics.join(', ')}</div>}
                </div>
                <button className="text-[13px] font-semibold text-brand cursor-pointer" onClick={() => setSheet(true)}>
                  Edit
                </button>
              </div>
            ) : (
              <Button
                block
                onClick={() => {
                  store.updatePhysio(physio.id, { communityWaitlist: true })
                  haptic('success')
                  setSheet(true)
                }}
              >
                Notify me when it’s live
              </Button>
            )}
          </div>
        </div>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <div className="flex flex-col items-center text-center">
          <div className="anim-pop grid h-14 w-14 place-items-center rounded-full bg-ok text-white">
            <Check size={28} strokeWidth={3} />
          </div>
          <h2 className="mt-4 font-display text-[22px] font-bold">You’re on the list</h2>
          <p className="mt-1 text-[14px] text-muted">We’ll tell you on WhatsApp the day it opens. Early members get a Founding Member badge.</p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <div className="mb-3 text-[15px] font-semibold">What should we discuss first?</div>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <Chip key={t} selected={topics.includes(t)} onClick={() => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])}>
                {t}
              </Chip>
            ))}
          </div>
        </div>
        <Button
          block
          className="mt-4"
          disabled={topics.length === 0}
          onClick={() => {
            store.updatePhysio(physio.id, { communityTopics: topics })
            setSheet(false)
            toast('Thanks — topic submitted')
          }}
        >
          Submit topic
        </Button>
        <Button block variant="ghost" className="mt-1" onClick={() => setSheet(false)}>
          Maybe later
        </Button>
      </Sheet>
    </Page>
  )
}

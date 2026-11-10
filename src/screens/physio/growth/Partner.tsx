import { Box, Check, Link2, Store, Star, Video } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, cx, Footer, IconTile, PageHeader } from '../../../components/ui'
import { haptic, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

const OPTIONS = [
  { id: 'content', icon: <Video size={18} />, title: 'Content co-creation', sub: 'Exercise videos & articles · revenue share' },
  { id: 'product', icon: <Box size={18} />, title: 'Product co-creation', sub: 'Shape Betterhood products and devices' },
  { id: 'affiliate', icon: <Link2 size={18} />, title: 'Affiliate partner', sub: 'Earn when patients buy recommended products' },
  { id: 'cobrand', icon: <Store size={18} />, title: 'Clinic co-branding', sub: 'Co-branded kit, signage and listing priority' },
]

const PERKS = ['Priority in Betterhood patient lead routing', 'Verified “Betterhood Partner” badge on profile', 'Featured on Betterhood social and blog', 'Early access to new tools and courses']

// G2 · Partner with Betterhood
export default function Partner() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [sel, setSel] = useState<string[]>(physio?.partnerOptIns ?? [])
  if (!physio) return null
  const submitted = physio.partnerOptIns.length > 0
  const changed = sel.slice().sort().join() !== physio.partnerOptIns.slice().sort().join()

  return (
    <Page wide>
      <PageHeader title="Partner with Betterhood" subtitle="Pick what interests you · no commitment" />
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-3">
          {OPTIONS.map((o) => {
            const on = sel.includes(o.id)
            return (
              <button
                key={o.id}
                onClick={() => {
                  haptic('light')
                  setSel(on ? sel.filter((x) => x !== o.id) : [...sel, o.id])
                }}
                className={cx(
                  'flex items-center gap-3 rounded-2xl border bg-surface p-4 text-left transition-colors cursor-pointer',
                  on ? 'border-brand' : 'border-line hover:border-brand-line',
                )}
              >
                <span className={cx('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border', on ? 'border-brand bg-brand text-white' : 'border-faint/70')}>
                  {on && <Check size={15} strokeWidth={3} />}
                </span>
                <IconTile className="h-9 w-9">{o.icon}</IconTile>
                <span>
                  <span className="block text-[15px] font-semibold">{o.title}</span>
                  <span className="block text-[13px] text-muted">{o.sub}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 rounded-2xl bg-brand-soft p-4 lg:mt-0 lg:self-start">
          <div className="mb-2 text-[16px] font-semibold text-brand">Partners unlock</div>
          {PERKS.map((p) => (
            <div key={p} className="flex items-center gap-2 py-1 text-[14px]">
              <Star size={15} className="shrink-0 text-accent" /> {p}
            </div>
          ))}
          {submitted && !changed && <p className="mt-3 text-[13px] font-medium text-brand">✓ Interest submitted — the partnerships team will reach out on WhatsApp.</p>}
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button
          block
          className="lg:w-[400px]"
          disabled={sel.length === 0 || (submitted && !changed)}
          onClick={() => {
            store.updatePhysio(physio.id, { partnerOptIns: sel })
            haptic('success')
            toast('Thanks! We’ll be in touch on WhatsApp.')
            nav(-1)
          }}
        >
          {submitted ? 'Update interest' : 'Submit interest'} ({sel.length} selected)
        </Button>
      </Footer>
    </Page>
  )
}

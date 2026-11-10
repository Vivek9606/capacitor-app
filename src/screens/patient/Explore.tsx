import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Page } from '../../components/Shell'
import { Chip, cx, PageHeader, SectionTitle } from '../../components/ui'
import { PRODUCTS, recommendedFor, SHOP, TOOLS } from '../../lib/explore'
import { openLink } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import { ProductCard, ToolCard } from './care'

function readTab(): 'store' | 'tools' {
  try {
    return localStorage.getItem('bh-explore-tab') === 'tools' ? 'tools' : 'store'
  } catch {
    return 'store'
  }
}

// Patient · Explore: the betterhood store (buy on shop.betterhood.in) and care tools
export default function Explore() {
  const { patient } = useMe()
  const store = useStore()
  const [tab, setTabState] = useState(readTab)
  const [type, setType] = useState('All')
  if (!patient) return null
  const setTab = (t: 'store' | 'tools') => {
    setTabState(t)
    try {
      localStorage.setItem('bh-explore-tab', t)
    } catch {
      /* ignore */
    }
  }

  const latest = store.db.assessments.filter((a) => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const recs = recommendedFor(latest)
  const recSet = new Set(recs.map((p) => p.handle))
  const types = ['All', ...Array.from(new Set(PRODUCTS.map((p) => p.type).filter(Boolean))).sort()]
  const rest = PRODUCTS.filter((p) => !recSet.has(p.handle) && (type === 'All' || p.type === type))
  const recShown = recs.filter((p) => type === 'All' || p.type === type)

  return (
    <Page wide>
      <PageHeader back={false} title="Explore" subtitle="Products and tools from Betterhood" />
      <div className="mb-4 inline-flex rounded-full bg-track p-1">
        {(['store', 'tools'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx('h-9 rounded-full px-5 text-[14px] font-semibold transition-colors cursor-pointer', tab === t ? 'bg-surface text-brand shadow-card' : 'text-muted')}
          >
            {t === 'store' ? 'Store' : 'Care tools'}
          </button>
        ))}
      </div>

      {tab === 'store' ? (
        <div key="store" className="anim-page">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {types.map((t) => (
              <Chip key={t} selected={type === t} onClick={() => setType(t)} className="h-9 text-[13px]">
                {t}
              </Chip>
            ))}
          </div>
          {recShown.length > 0 && (
            <>
              <SectionTitle>Recommended for your {latest!.area}</SectionTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {recShown.map((p) => (
                  <ProductCard key={p.handle} p={p} />
                ))}
              </div>
            </>
          )}
          <SectionTitle>{recShown.length ? 'More from the store' : 'All products'}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rest.map((p) => (
              <ProductCard key={p.handle} p={p} />
            ))}
          </div>
          <button onClick={() => openLink(SHOP)} className="mx-auto mt-5 flex items-center gap-1.5 text-[14px] font-semibold text-brand cursor-pointer">
            Open shop.betterhood.in <ArrowUpRight size={15} />
          </button>
          <p className="mt-2 text-center text-[12px] text-faint">Checkout happens securely on the Betterhood shop.</p>
        </div>
      ) : (
        <div key="tools" className="anim-page grid gap-3 lg:grid-cols-2">
          {TOOLS.map((t) => (
            <ToolCard key={t.key} t={t} />
          ))}
        </div>
      )}
      <div className="h-8" />
    </Page>
  )
}

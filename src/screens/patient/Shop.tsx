import { useState } from 'react'
import { Page } from '../../components/Shell'
import { Chip, PageHeader, SectionTitle } from '../../components/ui'
import { PRODUCTS, recommendedFor } from '../../lib/explore'
import { useMe, useStore } from '../../lib/store'
import { ProductCard } from './care'

// Patient · Shop: the betterhood store, browsed in the app. Product pages open in the app (Product.tsx).
export default function Shop() {
  const { patient } = useMe()
  const store = useStore()
  const [type, setType] = useState('All')
  if (!patient) return null

  const latest = store.db.assessments.filter((a) => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const recs = recommendedFor(latest)
  const recSet = new Set(recs.map((p) => p.handle))
  const types = ['All', ...Array.from(new Set(PRODUCTS.map((p) => p.type).filter(Boolean))).sort()]
  const rest = PRODUCTS.filter((p) => !recSet.has(p.handle) && (type === 'All' || p.type === type))
  const recShown = recs.filter((p) => type === 'All' || p.type === type)

  return (
    <Page wide>
      <PageHeader back={false} title="Shop" subtitle="Supports and recovery products picked by physios" />
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
      <p className="mt-5 text-center text-[12px] text-faint">Checkout happens securely on the betterhood shop.</p>
      <div className="h-8" />
    </Page>
  )
}

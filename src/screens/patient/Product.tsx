import { Minus, Plus, ShieldCheck, Star, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Button, Chip, cx, Footer, PageHeader } from '../../components/ui'
import { checkoutUrl, PRODUCTS, SHOP } from '../../lib/explore'
import { haptic, isNative, openInApp } from '../../lib/platform'

/** What shop.betterhood.in/products/{handle}.js returns (Shopify's public product JSON; CORS is open). */
interface ShopifyProduct {
  title: string
  description: string
  images: string[]
  options: { name: string; values: string[] }[]
  variants: { id: number; title: string; available: boolean; price: number; compare_at_price: number | null; options: string[] }[]
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

/** The store's own description HTML, without scripts, frames, styles or inline handlers. */
function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,iframe,object,embed,form,link,meta').forEach((n) => n.remove())
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name) || a.name === 'style' || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name)
    }
    if (el.tagName === 'A') el.setAttribute('target', '_blank')
  })
  return doc.body.innerHTML
}

// Patient · a product page in the app. Shopify doesn't allow its pages in a frame, so we render the product here
// and open only the checkout (cart permalink) in an in-app browser sheet.
export default function Product() {
  const { handle = '' } = useParams()
  const base = PRODUCTS.find((p) => p.handle === handle)
  const [data, setData] = useState<ShopifyProduct>()
  const [failed, setFailed] = useState(false)
  const [img, setImg] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [qty, setQty] = useState(1)

  useEffect(() => {
    let live = true
    fetch(`${SHOP}/products/${encodeURIComponent(handle)}.js`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: ShopifyProduct) => {
        if (!live) return
        setData(d)
        const first = d.variants.find((v) => v.available) ?? d.variants[0]
        setPicked(first?.options ?? [])
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [handle])

  const variant = useMemo(() => data?.variants.find((v) => v.options.every((o, i) => o === picked[i])), [data, picked])
  const description = useMemo(() => (data?.description ? cleanHtml(data.description) : ''), [data])
  if (!base && failed) return <Navigate to="/me/shop" replace />

  const images = data?.images.length ? data.images.map((u) => (u.startsWith('//') ? `https:${u}` : u)) : base ? [base.image] : []
  const price = variant ? variant.price / 100 : base?.price ?? 0
  const compare = variant?.compare_at_price ? variant.compare_at_price / 100 : base?.compare
  const off = compare && compare > price ? Math.round((1 - price / compare) * 100) : 0
  const realOptions = (data?.options ?? []).filter((o) => !(o.values.length === 1 && /^(default|title)/i.test(o.values[0])))

  const buy = () => {
    if (!variant) return
    haptic('light')
    openInApp(checkoutUrl(variant.id, qty))
  }

  return (
    <Page wide>
      <PageHeader title={base?.type || 'Product'} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[22px] bg-[#f6f1ea]">
            {images[img] && <img src={images[img]} alt="" className="h-full w-full object-cover" />}
            {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[12px] font-bold text-white">{off}% off</span>}
          </div>
          {images.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {images.slice(0, 10).map((u, i) => (
                <button key={u} onClick={() => setImg(i)} className={cx('h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 cursor-pointer', i === img ? 'border-brand' : 'border-transparent')}>
                  <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 lg:mt-0">
          <h1 className="font-display text-[22px] font-bold leading-tight tracking-[-0.01em]">{data?.title ?? base?.title}</h1>
          {base?.rating ? (
            <div className="mt-1.5 flex items-center gap-1 text-[13px] text-muted">
              <Star size={13} className="fill-sun text-sun" /> {base.rating.toFixed(1)}
              {base.reviews ? <span>· {base.reviews} reviews</span> : null}
            </div>
          ) : null}
          <div className="mt-3 flex items-end gap-2">
            <span className="font-display text-[26px] font-bold text-brand">{inr(price)}</span>
            {off > 0 && <span className="pb-1 text-[14px] text-faint line-through">{inr(compare!)}</span>}
          </div>

          {realOptions.map((o, oi) => (
            <div key={o.name} className="mt-4">
              <div className="mb-2 text-[13px] font-semibold text-muted">{o.name}</div>
              <div className="flex flex-wrap gap-2">
                {o.values.map((v) => (
                  <Chip key={v} selected={picked[data!.options.indexOf(o)] === v} onClick={() => setPicked((cur) => cur.map((x, i) => (i === data!.options.indexOf(o) ? v : x)))}>
                    {v}
                  </Chip>
                ))}
              </div>
              {oi === realOptions.length - 1 && variant && !variant.available && <p className="mt-2 text-[13px] text-danger">This option is out of stock.</p>}
            </div>
          ))}

          <div className="mt-4 flex items-center gap-3">
            <span className="text-[13px] font-semibold text-muted">Quantity</span>
            <div className="flex items-center gap-3 rounded-full border border-line bg-surface px-1.5 py-1">
              <button aria-label="Less" className="grid h-8 w-8 place-items-center rounded-full hover:bg-bg cursor-pointer" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus size={15} />
              </button>
              <span className="w-5 text-center font-semibold">{qty}</span>
              <button aria-label="More" className="grid h-8 w-8 place-items-center rounded-full hover:bg-bg cursor-pointer" onClick={() => setQty((q) => Math.min(10, q + 1))}>
                <Plus size={15} />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] text-muted">
            <div className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5">
              <ShieldCheck size={16} className="shrink-0 text-brand" /> Picked by physios
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-bg px-3 py-2.5">
              <Truck size={16} className="shrink-0 text-brand" /> Delivered across India
            </div>
          </div>

          {!data && !failed && <div className="mt-6 h-24 animate-pulse rounded-2xl bg-track" />}
          {description && <div className="product-copy mt-6 text-[14px] leading-relaxed text-ink/85" dangerouslySetInnerHTML={{ __html: description }} />}
        </div>
      </div>

      <Footer>
        <Button block disabled={!variant || !variant.available} onClick={buy}>
          {variant && !variant.available ? 'Out of stock' : `Buy now · ${inr(price * qty)}`}
        </Button>
        <p className="mt-2 text-center text-[12px] text-faint">{isNative ? 'Secure checkout opens on top of the app.' : 'Secure checkout on shop.betterhood.in.'}</p>
      </Footer>
    </Page>
  )
}

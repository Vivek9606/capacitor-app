import products from '../data/products.json'
import recommendations from '../data/recommendations.json'
import type { Assessment } from './types'

/** The betterhood store (Shopify) and care tools from betterhood.in. */
export interface Product {
  handle: string
  title: string
  type: string
  price: number
  compare?: number
  image: string
  tags: string[]
  rating?: number
  reviews?: number
}

export const SHOP = 'https://shop.betterhood.in'
export const productUrl = (handle: string) => `${SHOP}/products/${handle}`
export const PRODUCTS = products as Product[]

const RECS = recommendations as Record<string, string[]>
const CORNER: Record<string, string> = {
  back: 'better-you-corner-back-health',
  neck: 'better-you-corner-neck-health',
  shoulder: 'better-you-corner-shoulder-health',
  knee: 'better-you-corner-knee-health',
}

/** Products picked for this result on betterhood.in (result page first, then the area's corner). */
export function recommendedFor(a?: Pick<Assessment, 'result' | 'area'>): Product[] {
  if (!a) return []
  const handles = [...(a.result ? (RECS[a.result] ?? []) : []), ...(RECS[CORNER[a.area]] ?? [])]
  const seen = new Set<string>()
  return handles.flatMap((h) => {
    if (seen.has(h)) return []
    seen.add(h)
    const p = PRODUCTS.find((x) => x.handle === h)
    return p ? [p] : []
  })
}

/** Shopify cart permalink: straight to checkout with this variant. */
export const checkoutUrl = (variantId: number, qty = 1) => `${SHOP}/cart/${variantId}:${qty}`

/** Tools, grouped by what the person wants to do. `to` is an app screen; `site` a betterhood.in page shown in the app. */
export type ToolGroupKey = 'check' | 'relief' | 'care' | 'learn'

export const TOOL_GROUPS: { key: ToolGroupKey; title: string; sub: string }[] = [
  { key: 'check', title: 'Check yourself', sub: 'Find out what’s causing the pain' },
  { key: 'relief', title: 'Feel better', sub: 'Routines and products that help' },
  { key: 'care', title: 'Get care', sub: 'Physios near you' },
  { key: 'learn', title: 'Learn', sub: 'Short guides written by physios' },
]

export interface Tool {
  key: string
  group: ToolGroupKey
  label: string
  desc: string
  to?: string
  site?: string
}

export const TOOLS: Tool[] = [
  { key: 'assess', group: 'check', label: 'Assessments', desc: 'Physio-designed pain checks and health scores for your back, neck, shoulder or knee.', to: '/me/assess' },
  { key: 'diagnostics', group: 'check', label: 'Diagnostics', desc: 'What each common condition means, what causes it and what helps.', to: '/me/diagnostics' },
  { key: 'slouch', group: 'check', label: 'Slouch Catcher', desc: 'Catch a friend slouching and reveal their posture animal.', site: '/slouch-catcher/' },
  { key: 'corner', group: 'relief', label: 'betterYou corner', desc: 'Routines and reading for back, neck, shoulder and knee health.', site: '/better-you-corner-back-health/' },
  { key: 'shop', group: 'relief', label: 'Shop', desc: 'Supports, cushions and recovery products picked by physios.', to: '/me/shop' },
  { key: 'directory', group: 'care', label: 'Physio directory', desc: 'Find physiotherapists near you.', site: '/physio-directory/' },
  { key: 'learn', group: 'learn', label: 'Learn', desc: 'Short, physio-written guides on pain, posture and recovery.', to: '/me/learn' },
]

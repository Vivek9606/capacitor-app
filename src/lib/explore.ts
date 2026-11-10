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

export interface Tool {
  key: string
  label: string
  desc: string
  href?: string
  to?: string
}

export const TOOLS: Tool[] = [
  { key: 'slouch', label: 'Slouch Catcher', desc: 'Catch a friend slouching and reveal their posture animal.', href: 'https://betterhood.in/slouch-catcher/' },
  { key: 'assess', label: 'Pain assessments', desc: 'A 5-minute, physio-designed check of your back, neck, shoulder or knee.', to: '/me/assess' },
  { key: 'corner', label: 'betterYou corner', desc: 'Routines and reading for back, neck, shoulder and knee health.', href: 'https://betterhood.in/better-you-corner-back-health/' },
  { key: 'directory', label: 'Physio directory', desc: 'Find betterhood-certified physiotherapists near you.', href: 'https://betterhood.in/physio-directory/' },
  { key: 'learn', label: 'Learn', desc: 'Short, physio-written guides on pain, posture and recovery.', href: 'https://betterhood.in/learn/' },
]

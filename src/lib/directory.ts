import { useEffect, useState } from 'react'
import { api, apiMode } from './api'
import { useMe } from './store'

/** The physio's public profile on the betterhood.in directory (made with the website's listing form). */
export interface DirectoryListing {
  slug: string
  status: 'live' | 'hidden'
  url: string
  updatedAt: string
}

let cache: { physioId: string; listing: DirectoryListing | null } | undefined
const subs = new Set<() => void>()

export function rememberListing(physioId: string, listing: DirectoryListing | null) {
  cache = { physioId, listing }
  subs.forEach((f) => f())
}

/** undefined while loading (or in demo mode), null when they haven't listed themselves yet. */
export function useDirectoryListing(): DirectoryListing | null | undefined {
  const { session, physio } = useMe()
  const mine = () => (cache && cache.physioId === physio?.id ? cache.listing : undefined)
  const [listing, setListing] = useState(mine)
  useEffect(() => {
    const f = () => setListing(mine())
    subs.add(f)
    return () => void subs.delete(f)
  })
  useEffect(() => {
    if (!apiMode || !session?.token || !physio) return
    api<{ listing: DirectoryListing | null }>('/directory/me', { token: session.token })
      .then((r) => rememberListing(physio.id, r.listing ? { slug: r.listing.slug, status: r.listing.status, url: r.listing.url, updatedAt: r.listing.updatedAt } : null))
      .catch(() => {})
  }, [session?.token, physio?.id])
  return listing
}

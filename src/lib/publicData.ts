import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, apiMode } from './api'
import type { Calendar } from './slots'
import { useStore } from './store'
import type { Block, Booking, GroupSession, Physio, VisitType } from './types'

/** What GET /public/physios/:slug returns: no patient names, only busy times. */
export interface PublicPhysioResponse {
  physio: Physio
  busy: { date: string; time: string; minutes?: number; visitType?: VisitType }[]
  blocks?: { date: string; start?: string; end?: string }[]
  groups?: (Omit<GroupSession, 'participants'> & { seatsTaken: number })[]
}

/** A physio's public profile + calendar, from the API or (demo mode) the local store. */
export function usePublicPhysio(slug: string | undefined) {
  const store = useStore()
  const [remote, setRemote] = useState<PublicPhysioResponse | null>()
  const load = useCallback(() => {
    if (!apiMode || !slug) return
    api<PublicPhysioResponse>(`/public/physios/${encodeURIComponent(slug)}`)
      .then(setRemote)
      .catch(() => setRemote(null))
  }, [slug])
  useEffect(load, [load])

  const physio = apiMode ? remote?.physio : store.db.physios.find((p) => p.slug === slug)
  const cal = useMemo<Calendar | undefined>(() => {
    if (!physio) return undefined
    if (!apiMode) return store.db
    if (!remote) return undefined
    const bookings: Booking[] = remote.busy.map((b, i) => ({
      id: `busy_${i}`,
      physioId: physio.id,
      patientName: '',
      patientPhone: '',
      date: b.date,
      time: b.time,
      minutes: b.minutes,
      visitType: b.visitType ?? 'in_clinic',
      isNewPatient: false,
      status: 'confirmed',
      sendConfirmation: false,
      reminder: false,
      source: 'physio',
      createdAt: '',
      hidden: true,
    }))
    const blocks: Block[] = (remote.blocks ?? []).map((b, i) => ({ id: `blk_${i}`, physioId: physio.id, ...b }))
    const groups: GroupSession[] = (remote.groups ?? []).map(({ seatsTaken, ...g }) => ({
      ...g,
      participants: Array.from({ length: seatsTaken }, (_, i) => ({ id: `seat_${i}`, name: '', phone: '', status: 'booked' as const, joinedAt: '' })),
    }))
    return { bookings, blocks, groups }
  }, [physio, remote, store.db])

  return { physio, cal, loading: apiMode && remote === undefined, reload: load }
}

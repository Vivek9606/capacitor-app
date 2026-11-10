import type { DB, Physio } from './types'

/**
 * Suggest a physio for a self-signed-up patient from their assessment.
 * Mirrors the API (capacitor-app-backend/src/match.ts):
 *   specialty (nerve → Neuro, else Orthopaedic/Sports) + city match; ties go to the physio with fewer patients.
 */
export function wantedFocus(cat?: string): string[] {
  return cat === 'nerve' ? ['Neuro', 'Orthopaedic'] : ['Orthopaedic', 'Sports']
}

export function physioPlace(p: Physio): string {
  return [p.clinic?.address, p.clinic?.area, p.practice?.serviceArea, ...(p.practice?.locations ?? []).map((l) => l.address)].filter(Boolean).join(' ')
}

export function suggestPhysio(db: DB, cat: string | undefined, city: string | undefined): string | undefined {
  const want = wantedFocus(cat)
  const c = city?.trim().toLowerCase()
  let best: { id: string; score: number; n: number } | undefined
  for (const p of db.physios) {
    const focusHit = want.findIndex((w) => p.focusAreas.includes(w))
    const cityHit = !!c && physioPlace(p).toLowerCase().includes(c)
    const score = (cityHit ? 3 : 0) + (focusHit === 0 ? 2 : focusHit > 0 ? 1 : 0)
    if (score === 0) continue
    const n = db.patients.filter((x) => x.physioId === p.id).length
    if (!best || score > best.score || (score === best.score && n < best.n)) best = { id: p.id, score, n }
  }
  return best?.id
}

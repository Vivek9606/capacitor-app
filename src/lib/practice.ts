import type { Physio, PracticeMode } from './types'

export const PRACTICE_MODES: { id: PracticeMode; title: string; sub: string; label: string }[] = [
  { id: 'clinic', title: 'Clinic', sub: 'Patients come to my clinic', label: 'Own clinic' },
  { id: 'home', title: 'Home visits', sub: 'I treat patients at their homes', label: 'Home visits' },
  { id: 'individual', title: 'Individual practice', sub: 'I consult independently — at hospitals, gyms, sports clubs or other clinics', label: 'Individual practice' },
]

/** Practice modes, falling back to the older free-text settings. */
export function modesOf(p: Pick<Physio, 'practice' | 'practiceSettings'>): PracticeMode[] {
  if (p.practice?.modes?.length) return p.practice.modes
  const s = p.practiceSettings ?? []
  const out: PracticeMode[] = []
  if (s.includes('Own clinic') || s.includes('Clinic') || s.includes('Hospital')) out.push('clinic')
  if (s.includes('Home visits')) out.push('home')
  if (s.includes('Individual practice') || s.includes('Online')) out.push('individual')
  return out.length ? out : ['clinic']
}

export const modeLabels = (modes: PracticeMode[]) => PRACTICE_MODES.filter((m) => modes.includes(m.id)).map((m) => m.label)

/** Is the location part of the profile done for the way this physio practises? */
export function practiceLocationDone(p: Physio): boolean {
  const modes = modesOf(p)
  return modes.every((m) =>
    m === 'clinic' ? !!p.clinic?.address : m === 'home' ? !!p.practice?.serviceArea?.trim() : (p.practice?.locations?.length ?? 0) > 0,
  )
}

export function practiceStepLabel(p: Physio): string {
  const modes = modesOf(p)
  if (modes.length === 1 && modes[0] === 'home') return 'Home-visit area & fees'
  if (modes.length === 1 && modes[0] === 'individual') return 'Where you consult'
  return modes.includes('clinic') ? 'Clinic location & map tag' : 'Practice locations'
}

/** Where an in-person (non-home) visit happens, for confirmations and the booking page. */
export function visitPlace(p: Physio): string | undefined {
  if (p.clinic?.address) return `${p.clinic.name}, ${p.clinic.area || p.clinic.address}`
  const loc = p.practice?.locations?.[0]
  return loc ? `${loc.name}, ${loc.address}` : undefined
}

import type { PlanItem } from '../../../lib/types'

export interface Template {
  id: string
  title: string
  region: string
  items: PlanItem[]
  daysPerWeek: number
  weeks: number
}

// Phase 2: templates table, curated in the admin tool + each physio's own saved templates.
export const TEMPLATES: Template[] = [
  {
    id: 'tpl-lbp',
    title: 'Core stability',
    region: 'Lumbar',
    daysPerWeek: 5,
    weeks: 3,
    items: [
      { exerciseId: 'pelvic-tilt', sets: 3, reps: 10, holdSec: 5 },
      { exerciseId: 'bird-dog', sets: 3, reps: 8, perSide: true },
      { exerciseId: 'glute-bridge', sets: 3, reps: 12 },
      { exerciseId: 'dead-bug', sets: 2, reps: 10 },
    ],
  },
  {
    id: 'tpl-acl',
    title: 'ACL early rehab',
    region: 'Knee',
    daysPerWeek: 6,
    weeks: 4,
    items: [
      { exerciseId: 'quad-set', sets: 3, reps: 10, holdSec: 5 },
      { exerciseId: 'slr', sets: 3, reps: 10, perSide: true },
      { exerciseId: 'heel-slide', sets: 3, reps: 10 },
      { exerciseId: 'ankle-pumps', sets: 3, reps: 20 },
    ],
  },
  {
    id: 'tpl-shoulder',
    title: 'Shoulder mobility',
    region: 'Shoulder',
    daysPerWeek: 6,
    weeks: 4,
    items: [
      { exerciseId: 'pendulum', sets: 2, reps: 20 },
      { exerciseId: 'table-slide', sets: 2, reps: 10 },
      { exerciseId: 'wall-slide', sets: 3, reps: 10 },
      { exerciseId: 'er-band', sets: 3, reps: 12, perSide: true },
    ],
  },
  {
    id: 'tpl-neck',
    title: 'Neck posture reset',
    region: 'Neck',
    daysPerWeek: 5,
    weeks: 3,
    items: [
      { exerciseId: 'chin-tuck', sets: 3, reps: 10, holdSec: 5 },
      { exerciseId: 'upper-trap-stretch', sets: 2, reps: 3, holdSec: 30, perSide: true },
      { exerciseId: 'scap-squeeze', sets: 3, reps: 10, holdSec: 5 },
    ],
  },
  {
    id: 'tpl-postnatal',
    title: 'Post-natal core',
    region: 'Core',
    daysPerWeek: 4,
    weeks: 6,
    items: [
      { exerciseId: 'diaphragm-breath', sets: 2, reps: 10 },
      { exerciseId: 'kegel', sets: 3, reps: 10, holdSec: 5 },
      { exerciseId: 'pelvic-tilt', sets: 3, reps: 10, holdSec: 5 },
      { exerciseId: 'glute-bridge', sets: 2, reps: 10 },
    ],
  },
]

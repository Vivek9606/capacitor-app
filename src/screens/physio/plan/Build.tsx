import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ExerciseMedia } from '../../../components/ExerciseMedia'
import { Page } from '../../../components/Shell'
import { Button, Card, Checkbox, Chip, cx, Footer, Input, Label, PageHeader, Sheet } from '../../../components/ui'
import { doseLabel, REGIONS } from '../../../lib/exercises'
import { firstName } from '../../../lib/logic'
import { haptic, toast } from '../../../lib/platform'
import { useStore } from '../../../lib/store'
import type { Exercise, PlanItem } from '../../../lib/types'
import { TEMPLATES } from './templates'

// R2 · Protocol builder (step 1 of 3)
export default function Build() {
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const draft = db.draft
  const [q, setQ] = useState('')
  const [region, setRegion] = useState<string>()
  const [editing, setEditing] = useState<number>()
  const [tplOpen, setTplOpen] = useState(false)
  const [schedOpen, setSchedOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!draft) return <Navigate to="/app/patients" replace />
  const patient = db.patients.find((p) => p.id === draft.patientId)
  if (!patient) return <Navigate to="/app/patients" replace />

  const exById = (id: string) => db.exercises.find((e) => e.id === id)
  const inPlan = new Set(draft.items.map((i) => i.exerciseId))
  const library = db.exercises.filter(
    (e) => (!region || e.region === region) && (!q || `${e.name} ${e.region} ${e.category}`.toLowerCase().includes(q.toLowerCase())),
  )
  const setItems = (items: PlanItem[]) => store.updateDraft({ items })

  const add = (e: Exercise) => {
    if (inPlan.has(e.id)) return
    haptic('light')
    setItems([...draft.items, { exerciseId: e.id, ...e.dose }])
  }
  const remove = (idx: number) => setItems(draft.items.filter((_, i) => i !== idx))
  const onDragEnd = (ev: DragEndEvent) => {
    const { active, over } = ev
    if (!over || active.id === over.id) return
    const from = draft.items.findIndex((i) => i.exerciseId === active.id)
    const to = draft.items.findIndex((i) => i.exerciseId === over.id)
    haptic('medium')
    setItems(arrayMove(draft.items, from, to))
  }

  const libraryView = (
    <>
      <div className="flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 focus-within:border-brand">
        <Search size={18} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${db.exercises.length} exercises`} className="h-full flex-1 bg-transparent outline-none placeholder:text-faint" />
      </div>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0">
        <Chip selected={!region} onClick={() => setRegion(undefined)}>
          All
        </Chip>
        {REGIONS.map((r) => (
          <Chip key={r} selected={region === r} onClick={() => setRegion(region === r ? undefined : r)}>
            {r}
          </Chip>
        ))}
      </div>
    </>
  )

  const libCard = (e: Exercise, cls?: string) => {
    const added = inPlan.has(e.id)
    return (
      <div key={e.id} className={cx('rounded-2xl border border-line bg-surface p-2.5', cls)}>
        <ExerciseMedia region={e.region} className="h-[72px]" />
        <div className="mt-2 flex items-end justify-between gap-2 px-0.5">
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">{e.name}</div>
            <div className="truncate text-[12px] text-muted">{e.category}</div>
          </div>
          <button
            aria-label={added ? `${e.name} added` : `Add ${e.name}`}
            onClick={() => add(e)}
            className={cx(
              'grid h-7 w-7 shrink-0 place-items-center rounded-full cursor-pointer',
              added ? 'bg-brand-soft text-brand' : 'bg-brand text-white',
            )}
          >
            {added ? <Check size={15} strokeWidth={3} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    )
  }

  const planView = (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between lg:mt-0">
        <h2 className="text-[17px] font-semibold">
          Your plan · {draft.items.length} exercise{draft.items.length === 1 ? '' : 's'}
        </h2>
        {draft.items.length > 1 && (
          <span className="flex items-center gap-1 text-[13px] text-muted">
            <GripVertical size={14} /> Drag to reorder
          </span>
        )}
      </div>
      {draft.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-line bg-brand-soft/40 p-6 text-center text-[14px] text-muted">
          Tap <b className="text-brand">+</b> on an exercise to add it, or start from a template.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} onDragStart={() => haptic('light')}>
          <SortableContext items={draft.items.map((i) => i.exerciseId)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2.5">
              {draft.items.map((item, idx) => {
                const ex = exById(item.exerciseId)
                return ex ? <SortableRow key={item.exerciseId} item={item} ex={ex} onEdit={() => setEditing(idx)} /> : null
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <div className="mt-4">
        <Input label="Plan name" value={draft.title} onChange={(e) => store.updateDraft({ title: e.target.value })} placeholder="e.g. Core stability" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="mr-1 text-[14px] text-muted">Schedule</span>
        <Chip selected onClick={() => setSchedOpen(true)}>
          {draft.daysPerWeek} days / wk
        </Chip>
        <Chip selected onClick={() => setSchedOpen(true)}>
          {draft.weeks} weeks
        </Chip>
      </div>
    </>
  )

  const editingItem = editing !== undefined ? draft.items[editing] : undefined

  return (
    <Page wide>
      <PageHeader
        title="Build care plan"
        subtitle={`For ${firstName(patient.name)} · Step 1 of 3`}
        onBack={() => nav(`/app/patients/${patient.id}`)}
        right={
          <button className="text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setTplOpen(true)}>
            Templates
          </button>
        }
      />

      {/* Phone layout */}
      <div className="lg:hidden">
        {libraryView}
        <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">{library.map((e) => libCard(e, 'w-[150px] shrink-0'))}</div>
        {planView}
      </div>

      {/* Desktop layout: library grid + sticky plan panel */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
        <div>
          {libraryView}
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">{library.map((e) => libCard(e))}</div>
        </div>
        <div className="sticky top-6 self-start rounded-3xl border border-line bg-bg p-5">{planView}</div>
      </div>

      <Footer className="lg:mt-6 lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={draft.items.length === 0} onClick={() => nav('/app/plan/rx')}>
          Next: add Rx notes
        </Button>
      </Footer>

      <Sheet open={editing !== undefined} onClose={() => setEditing(undefined)} title={editingItem ? exById(editingItem.exerciseId)?.name : ''}>
        {editingItem && (
          <DoseEditor
            item={editingItem}
            onSave={(it) => {
              setItems(draft.items.map((x, i) => (i === editing ? it : x)))
              setEditing(undefined)
            }}
            onRemove={() => {
              remove(editing!)
              setEditing(undefined)
            }}
          />
        )}
      </Sheet>

      <Sheet open={schedOpen} onClose={() => setSchedOpen(false)} title="Schedule">
        <Label>Days per week</Label>
        <div className="flex flex-wrap gap-2">
          {[3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} selected={draft.daysPerWeek === n} onClick={() => store.updateDraft({ daysPerWeek: n })}>
              {n} days
            </Chip>
          ))}
        </div>
        <div className="mt-5">
          <Label>Duration</Label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 6, 8].map((n) => (
              <Chip key={n} selected={draft.weeks === n} onClick={() => store.updateDraft({ weeks: n })}>
                {n} week{n > 1 ? 's' : ''}
              </Chip>
            ))}
          </div>
        </div>
        <Button block className="mt-6" onClick={() => setSchedOpen(false)}>
          Done
        </Button>
      </Sheet>

      <Sheet open={tplOpen} onClose={() => setTplOpen(false)} title="Templates">
        <div className="flex flex-col gap-2.5">
          {[...db.templates.filter((t) => t.physioId === patient.physioId).map((t) => ({ ...t, region: 'My template' })), ...TEMPLATES].map((t) => (
            <Card
              key={t.id}
              className="p-4"
              onClick={() => {
                store.updateDraft({ items: t.items, daysPerWeek: t.daysPerWeek, weeks: t.weeks, title: t.title })
                setTplOpen(false)
                toast(`“${t.title}” loaded — tweak as needed`)
              }}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{t.title}</div>
                <span className="text-[12px] text-muted">{t.region}</span>
              </div>
              <div className="mt-1 text-[13px] text-muted">
                {t.items.length} exercises · {t.daysPerWeek} days/wk · {t.weeks} weeks
              </div>
            </Card>
          ))}
        </div>
      </Sheet>
    </Page>
  )
}

function SortableRow({ item, ex, onEdit }: { item: PlanItem; ex: Exercise; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.exerciseId })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        'flex items-center gap-3 rounded-2xl border bg-surface p-2.5 pr-3',
        isDragging ? 'z-10 border-brand shadow-lg' : 'border-line',
      )}
    >
      <button {...attributes} {...listeners} aria-label={`Reorder ${ex.name}`} className="touch-none cursor-grab px-1 text-faint active:cursor-grabbing">
        <GripVertical size={18} />
      </button>
      <ExerciseMedia region={ex.region} size="sm" className="h-11 w-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{ex.name}</div>
        <div className="truncate text-[13px] text-muted">{doseLabel(item)}</div>
      </div>
      <button aria-label={`Edit ${ex.name}`} onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-bg cursor-pointer">
        <Pencil size={17} />
      </button>
    </div>
  )
}

function Stepper({ label, value, onChange, min = 0, max = 60, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[15px]">{label}</span>
      <div className="flex items-center gap-3">
        <button className="h-9 w-9 rounded-full border border-line bg-surface text-[18px] cursor-pointer" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </button>
        <span className="w-8 text-center text-[16px] font-semibold">{value}</span>
        <button className="h-9 w-9 rounded-full border border-line bg-surface text-[18px] cursor-pointer" onClick={() => onChange(Math.min(max, value + step))}>
          +
        </button>
      </div>
    </div>
  )
}

function DoseEditor({ item, onSave, onRemove }: { item: PlanItem; onSave: (i: PlanItem) => void; onRemove: () => void }) {
  const [it, setIt] = useState(item)
  return (
    <div>
      <Card className="divide-y divide-line px-4">
        <Stepper label="Sets" value={it.sets} min={1} max={10} onChange={(sets) => setIt({ ...it, sets })} />
        <Stepper label="Reps" value={it.reps} min={1} max={50} onChange={(reps) => setIt({ ...it, reps })} />
        <Stepper label="Hold (sec)" value={it.holdSec ?? 0} max={120} step={5} onChange={(h) => setIt({ ...it, holdSec: h || undefined })} />
      </Card>
      <div className="mt-4">
        <Checkbox checked={!!it.perSide} onChange={(perSide) => setIt({ ...it, perSide })} label="Each side" />
      </div>
      <div className="mt-4">
        <Input label="Note for patient (optional)" value={it.note ?? ''} onChange={(e) => setIt({ ...it, note: e.target.value || undefined })} placeholder="e.g. Go slow on the way down" />
      </div>
      <p className="mt-3 text-[13px] text-muted">Patient sees: {doseLabel(it)}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="secondary" onClick={onRemove} aria-label="Remove from plan">
          <Trash2 size={18} />
        </Button>
        <Button block onClick={() => onSave(it)}>
          Save
        </Button>
      </div>
    </div>
  )
}

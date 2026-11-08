import { ChevronRight, Search, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Avatar, Badge, Button, Card, Empty, PageHeader } from '../../components/ui'
import { adherence } from '../../lib/logic'
import { useMe, useStore } from '../../lib/store'

export type PickMode = 'plan' | 'rx' | undefined

export function usePick(): PickMode {
  const loc = useLocation()
  return (loc.state as { pick?: PickMode } | null)?.pick
}

/** Starts a plan/Rx draft for a patient and routes into the builder. */
export function useStartPlan() {
  const store = useStore()
  const nav = useNavigate()
  return (patientId: string, mode: 'plan' | 'rx') => {
    store.startDraft(patientId, mode === 'rx' ? { items: [], title: 'Prescription' } : {})
    nav(mode === 'rx' ? '/app/plan/rx' : '/app/plan/build')
  }
}

// Patients list (+ "choose a patient" mode from the Create sheet)
export default function Patients() {
  const { physio } = useMe()
  const { db } = useStore()
  const nav = useNavigate()
  const pick = usePick()
  const startPlan = useStartPlan()
  const [q, setQ] = useState('')
  if (!physio) return null

  const list = db.patients
    .filter((p) => p.physioId === physio.id)
    .filter((p) => !q || `${p.name} ${p.phone} ${p.condition ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Page wide>
      <PageHeader
        back={!!pick}
        title={pick ? 'Choose a patient' : 'Patients'}
        subtitle={pick === 'plan' ? 'Who is this care plan for?' : pick === 'rx' ? 'Who is this prescription for?' : `${list.length} patients`}
        right={
          <Button size="sm" variant="soft" onClick={() => nav('/app/patients/new', { state: { pick } })}>
            <UserPlus size={16} /> Add
          </Button>
        }
      />
      <div className="mb-4 flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 focus-within:border-brand lg:max-w-md">
        <Search size={18} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, mobile or condition" className="h-full flex-1 bg-transparent outline-none placeholder:text-faint" />
      </div>
      {list.length === 0 ? (
        <Card>
          <Empty
            icon={<Users size={20} />}
            title={q ? 'No matches' : 'No patients yet'}
            body={q ? 'Try a different name or number.' : 'Add a patient with just a name and mobile number.'}
            action={!q && <Button size="md" onClick={() => nav('/app/patients/new', { state: { pick } })}>Add patient</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((p) => {
            const plan = db.plans.find((pl) => pl.patientId === p.id && pl.status === 'active')
            const adh = plan && adherence(plan, db.sessions)
            return (
              <Card key={p.id} className="flex items-center gap-3 p-4" onClick={() => (pick ? startPlan(p.id, pick) : nav(`/app/patients/${p.id}`))}>
                <Avatar name={p.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{p.name}</div>
                  <div className="truncate text-[13px] text-muted">{p.condition ?? 'No diagnosis yet'}</div>
                </div>
                {plan ? (
                  plan.openedAt ? (
                    <Badge tone={adh && adh.pct >= 70 ? 'brand' : 'accent'}>{adh?.pct ?? 0}% adherence</Badge>
                  ) : (
                    <Badge tone="accent">Not opened</Badge>
                  )
                ) : (
                  <Badge tone="muted">No active plan</Badge>
                )}
                <ChevronRight size={18} className="text-muted" />
              </Card>
            )
          })}
        </div>
      )}
    </Page>
  )
}

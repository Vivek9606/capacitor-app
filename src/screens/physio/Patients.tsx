import { ChevronRight, ClipboardCheck, Search, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Avatar, Badge, Button, Card, Empty, PageHeader } from '../../components/ui'
import { adherence } from '../../lib/logic'
import { shareLink } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import { inviteLink } from '../../lib/web'

export type PickMode = 'plan' | 'rx' | 'consent' | undefined

export function usePick(): PickMode {
  const loc = useLocation()
  return (loc.state as { pick?: PickMode } | null)?.pick
}

/** Starts a plan/Rx draft for a patient. Both start with the consultation, then the treatment plan. */
export function useStartPlan() {
  const store = useStore()
  const nav = useNavigate()
  return (patientId: string, mode: 'plan' | 'rx', opts: { replace?: boolean } = {}) => {
    store.startDraft(patientId, mode === 'rx' ? { items: [], title: 'Treatment plan', mode: 'rx' } : { mode: 'plan' })
    nav('/physio-dashboard/plan/consult', { replace: opts.replace })
  }
}

/** Share this physio's personal assessment link (WhatsApp / share sheet / copy). */
export function invitePatients(physio: { slug: string; name: string }) {
  shareLink({
    title: 'Free pain assessment',
    text: `Hi! Before your visit, please take this free 5-minute pain assessment. Save your result at the end and it comes straight to me, so we can make the most of your first session. – ${physio.name}`,
    url: inviteLink(physio.slug),
  })
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
    .sort((a, b) => Number(!!a.dischargedAt) - Number(!!b.dischargedAt) || a.name.localeCompare(b.name))

  return (
    <Page wide>
      <PageHeader
        back={!!pick}
        title={pick ? 'Choose a patient' : 'Patients'}
        subtitle={pick === 'plan' ? 'Who is this care plan for?' : pick === 'rx' ? 'Who is this treatment plan for?' : pick === 'consent' ? 'Who is signing the consent form?' : `${list.length} patients`}
        right={
          <div className="flex gap-2">
            {!pick && (
              <Button size="sm" variant="secondary" onClick={() => invitePatients(physio)}>
                <ClipboardCheck size={16} /> Invite
              </Button>
            )}
            <Button size="sm" variant="soft" onClick={() => nav('/physio-dashboard/patients/new', { state: { pick } })}>
              <UserPlus size={16} /> Add
            </Button>
          </div>
        }
      />
      {!pick && (
        <Card className="mb-4 flex items-center gap-3 p-4" onClick={() => invitePatients(physio)}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <ClipboardCheck size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">Send the free pain assessment before a first visit</div>
            <div className="text-[13px] text-muted">Patients who save their result from your link join this list with their answers ready.</div>
          </div>
          <ChevronRight size={18} className="text-muted" />
        </Card>
      )}
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
            action={!q && <Button size="md" onClick={() => nav('/physio-dashboard/patients/new', { state: { pick } })}>Add patient</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((p) => {
            const plan = db.plans.find((pl) => pl.patientId === p.id && pl.status === 'active')
            const adh = plan && adherence(plan, db.sessions)
            return (
              <Card key={p.id} className="flex items-center gap-3 p-4" onClick={() => (pick === 'consent' ? nav(`/physio-dashboard/patients/${p.id}/consent`) : pick ? startPlan(p.id, pick) : nav(`/physio-dashboard/patients/${p.id}`))}>
                <Avatar name={p.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold">{p.name}</span>
                    {p.invitedBy === physio.id && <Badge tone="brand">From your link</Badge>}
                  </div>
                  <div className="truncate text-[13px] text-muted">{p.condition ?? 'No diagnosis yet'}</div>
                </div>
                {p.dischargedAt ? (
                  <Badge tone="ok">Discharged</Badge>
                ) : plan ? (
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

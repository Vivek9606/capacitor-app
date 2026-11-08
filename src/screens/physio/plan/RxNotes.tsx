import { Navigate, useNavigate } from 'react-router-dom'
import { RxDocument } from '../../../components/RxDocument'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, Input, Label, PageHeader, TextArea, Toggle } from '../../../components/ui'
import { addDays, today } from '../../../lib/dates'
import { firstName } from '../../../lib/logic'
import { useMe, useStore } from '../../../lib/store'
import type { Rx } from '../../../lib/types'

const MODALITIES = ['Heat', 'IFT', 'TENS', 'Ultrasound', 'Taping', 'Dry needling', 'Manual therapy']

// R3 · Prescription & notes (step 2 of 3, or step 1 of 2 for "Prescription only")
export default function RxNotes() {
  const store = useStore()
  const { physio } = useMe()
  const nav = useNavigate()
  const draft = store.db.draft
  if (!draft || !physio) return <Navigate to="/app/patients" replace />
  const patient = store.db.patients.find((p) => p.id === draft.patientId)
  if (!patient) return <Navigate to="/app/patients" replace />
  const rxOnly = draft.items.length === 0
  const rx = draft.rx
  const set = (patch: Partial<Rx>) => store.updateDraft({ rx: { ...rx, ...patch } })
  const valid = rxOnly ? !!(rx.diagnosis.trim() || rx.advice.trim()) : true

  return (
    <Page wide>
      <PageHeader title="Prescription & notes" subtitle={rxOnly ? `For ${firstName(patient.name)} · Step 1 of 2` : 'Step 2 of 3'} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <Input label="Diagnosis" value={rx.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} placeholder="Mechanical LBP, L4–L5" />
          <TextArea
            label="Advice for patient"
            rows={4}
            value={rx.advice}
            onChange={(e) => set({ advice: e.target.value })}
            placeholder="Avoid sitting > 40 min. Heat for 15 min before exercises…"
          />
          <div>
            <h3 className="mb-3 text-[16px] font-semibold">Modalities in clinic</h3>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((m) => (
                <Chip
                  key={m}
                  selected={rx.modalities.includes(m)}
                  onClick={() => set({ modalities: rx.modalities.includes(m) ? rx.modalities.filter((x) => x !== m) : [...rx.modalities, m] })}
                >
                  {m}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-[16px] font-semibold">Follow-up</h3>
            <div className="flex flex-wrap gap-2">
              <Chip selected={rx.followUp === '1w'} onClick={() => set({ followUp: '1w' })}>
                1 week
              </Chip>
              <Chip selected={rx.followUp === '2w'} onClick={() => set({ followUp: '2w' })}>
                2 weeks
              </Chip>
              <Chip selected={rx.followUp === 'custom'} onClick={() => set({ followUp: 'custom', followUpDate: rx.followUpDate ?? addDays(today(), 10) })}>
                Pick date
              </Chip>
              <Chip selected={rx.followUp === 'none'} onClick={() => set({ followUp: 'none', autoBook: false })}>
                As needed
              </Chip>
            </div>
            {rx.followUp === 'custom' && (
              <div className="mt-3 max-w-[220px]">
                <Label>Follow-up date</Label>
                <input
                  type="date"
                  min={today()}
                  value={rx.followUpDate}
                  onChange={(e) => set({ followUpDate: e.target.value })}
                  className="h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand"
                />
              </div>
            )}
          </div>
          <Card className="divide-y divide-line px-4">
            <div className="flex items-center gap-3 py-3.5">
              <div className="flex-1">
                <div className="text-[15px] font-semibold">Auto-book follow-up</div>
                <div className="text-[13px] text-muted">Sends a WhatsApp reminder too</div>
              </div>
              <Toggle label="Auto-book follow-up" checked={rx.autoBook} disabled={rx.followUp === 'none'} onChange={(v) => set({ autoBook: v })} />
            </div>
            <div className="flex items-center gap-3 py-3.5">
              <div className="flex-1">
                <div className="text-[15px] font-semibold">Letterhead & signature</div>
                <div className="text-[13px] text-muted">
                  {physio.clinic?.name ?? 'Your name'}
                  {physio.councilRegNo ? ' · Reg. no. added' : ' · add reg. no. in Profile'}
                </div>
              </div>
              <Toggle label="Letterhead and signature" checked={rx.letterhead} onChange={(v) => set({ letterhead: v })} />
            </div>
          </Card>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <div className="mb-2 text-[13px] font-medium text-muted">Live preview · PDF the patient can download</div>
            <RxDocument rx={rx} physio={physio} patient={patient} items={draft.items} exercises={store.db.exercises} date={today()} />
          </div>
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={!valid} onClick={() => nav('/app/plan/preview')}>
          Preview what {firstName(patient.name)} sees
        </Button>
      </Footer>
    </Page>
  )
}

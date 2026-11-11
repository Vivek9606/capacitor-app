import { FileSignature } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { RxDocument } from '../../../components/RxDocument'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, Input, Label, PageHeader, TextArea, Toggle } from '../../../components/ui'
import { addDays, today } from '../../../lib/dates'
import { hasConsent, missingForModalities } from '../../../lib/consents'
import { firstName } from '../../../lib/logic'
import { useMe, useStore } from '../../../lib/store'
import type { Patient, PlanDraft, Rx } from '../../../lib/types'

const MODALITIES = ['Heat', 'IFT', 'TENS', 'Ultrasound', 'Taping', 'Dry needling', 'Manual therapy']

/**
 * The plan flow, in the order a visit happens:
 *   1 Consultation (complaint, findings, diagnosis, consent) → 2 Treatment plan (modalities, advice, follow-up)
 *   → 3 Care plan (home exercises) → 4 Preview & send.
 * "Treatment plan only" skips step 3. Moving between steps replaces the history entry, so the whole flow is one
 * entry: Back after sending returns to where the physio started, not into a finished flow.
 */
export const isRxOnly = (d: PlanDraft) => d.mode === 'rx' || (!d.mode && d.items.length === 0 && !d.editPlanId)

export function stepLabel(d: PlanDraft, step: 'consult' | 'rx' | 'build' | 'preview') {
  if (isRxOnly(d)) return `Step ${{ consult: 1, rx: 2, build: 2, preview: 3 }[step]} of 3`
  return `Step ${{ consult: 1, rx: 2, build: 3, preview: 4 }[step]} of 4`
}

function useFlow() {
  const store = useStore()
  const { physio } = useMe()
  const draft = store.db.draft
  const patient = draft ? store.db.patients.find((p) => p.id === draft.patientId) : undefined
  return { store, physio, draft, patient }
}

/** Banner for a consent the patient still has to sign. Opens the consent screen; signing comes back here. */
function ConsentNeeded({ patient, formId, title }: { patient: Patient; formId: string; title: string }) {
  const nav = useNavigate()
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-accent-soft p-3.5">
      <FileSignature size={18} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1 text-[14px]">
        <b>{title}</b> needs signed consent from {firstName(patient.name)}.
      </div>
      <button className="shrink-0 text-[13px] font-semibold text-brand cursor-pointer" onClick={() => nav(`/app/patients/${patient.id}/consent`, { state: { formId, returnToFlow: true } })}>
        Take consent
      </button>
    </div>
  )
}

// Step 1 · Consultation
export function Consult() {
  const { store, physio, draft, patient } = useFlow()
  const nav = useNavigate()
  if (!draft || !physio || !patient) return <Navigate to="/app/patients" replace />
  const rx = draft.rx
  const set = (patch: Partial<Rx>) => store.updateDraft({ rx: { ...rx, ...patch } })
  const needsGeneral = !hasConsent(store.db.consents, patient.id, 'general')

  return (
    <Page wide>
      <PageHeader title="Consultation" subtitle={`${patient.name} · ${stepLabel(draft, 'consult')}`} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          {needsGeneral && <ConsentNeeded patient={patient} formId="general" title="Treatment consent" />}
          <TextArea label="Presenting complaint" rows={3} value={rx.complaint ?? ''} onChange={(e) => set({ complaint: e.target.value })} placeholder="Lower back pain for 3 weeks, worse after sitting" />
          <TextArea
            label="Examination findings"
            rows={4}
            value={rx.findings ?? ''}
            onChange={(e) => set({ findings: e.target.value })}
            placeholder="Flexion limited to 50%, SLR negative, tender L4–L5 paraspinals"
          />
          <Input label="Diagnosis" value={rx.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} placeholder="Mechanical LBP, L4–L5" />
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <div className="mb-2 text-[13px] font-medium text-muted">Live preview · the treatment plan PDF the patient can download</div>
            <RxDocument rx={rx} physio={physio} patient={patient} items={draft.items} exercises={store.db.exercises} date={today()} />
          </div>
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" onClick={() => nav('/app/plan/rx', { replace: true })}>
          Next: treatment plan
        </Button>
      </Footer>
    </Page>
  )
}

// Step 2 · Treatment plan
export default function RxNotes() {
  const { store, physio, draft, patient } = useFlow()
  const nav = useNavigate()
  if (!draft || !physio || !patient) return <Navigate to="/app/patients" replace />
  const rxOnly = isRxOnly(draft)
  const rx = draft.rx
  const set = (patch: Partial<Rx>) => store.updateDraft({ rx: { ...rx, ...patch } })
  const missing = missingForModalities(store.db.consents, patient.id, rx.modalities)
  const valid = rxOnly ? !!(rx.diagnosis.trim() || rx.advice.trim()) : true

  return (
    <Page wide>
      <PageHeader title="Treatment plan" subtitle={`${firstName(patient.name)} · ${stepLabel(draft, 'rx')}`} onBack={() => nav('/app/plan/consult', { replace: true })} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
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
            <div className="mt-3 flex flex-col gap-2">
              {missing.map((f) => (
                <ConsentNeeded key={f.id} patient={patient} formId={f.id} title={f.title} />
              ))}
            </div>
          </div>
          <TextArea
            label="Advice for patient"
            rows={4}
            value={rx.advice}
            onChange={(e) => set({ advice: e.target.value })}
            placeholder="Avoid sitting > 40 min. Heat for 15 min before exercises…"
          />
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
            <div className="mb-2 text-[13px] font-medium text-muted">Live preview · the treatment plan PDF the patient can download</div>
            <RxDocument rx={rx} physio={physio} patient={patient} items={draft.items} exercises={store.db.exercises} date={today()} />
          </div>
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={!valid} onClick={() => nav(rxOnly ? '/app/plan/preview' : '/app/plan/build', { replace: true })}>
          {rxOnly ? `Preview what ${firstName(patient.name)} sees` : 'Next: care plan exercises'}
        </Button>
      </Footer>
    </Page>
  )
}

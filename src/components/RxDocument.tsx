import { doseLabel } from '../lib/exercises'
import { fmtShort } from '../lib/dates'
import type { Exercise, Patient, Physio, PlanItem, Rx } from '../lib/types'
import { cx } from './ui'

const FOLLOW: Record<Rx['followUp'], string> = { '1w': 'In 1 week', '2w': 'In 2 weeks', custom: 'On the date below', none: 'As needed' }

/** Letterhead prescription. Used in the R3 live preview, the patient's Rx view, and print-to-PDF. */
export function RxDocument({
  rx,
  physio,
  patient,
  items = [],
  exercises,
  date,
  className,
}: {
  rx: Rx
  physio: Physio
  patient: Patient
  items?: PlanItem[]
  exercises: Exercise[]
  date: string
  className?: string
}) {
  return (
    <div className={cx('rounded-2xl border border-line bg-white p-6 text-[14px] leading-relaxed text-ink', className)}>
      {rx.letterhead && (
        <div className="flex items-start justify-between border-b-2 border-brand pb-4">
          <div>
            <div className="text-[18px] font-semibold text-brand">{physio.clinic?.name ?? physio.name}</div>
            <div className="text-[13px] text-muted">
              {physio.name}, PT{physio.qualification ? ` · ${physio.qualification}` : ''}
            </div>
            {physio.councilRegNo && <div className="text-[12px] text-muted">Reg. no. {physio.councilRegNo}</div>}
          </div>
          <div className="text-right text-[12px] text-muted">
            {physio.clinic?.address && <div className="max-w-[200px]">{physio.clinic.address}</div>}
            <div>+91 {physio.phone}</div>
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-between text-[13px]">
        <div>
          <span className="text-muted">Patient: </span>
          <b>{patient.name}</b>
          {patient.age ? ` · ${patient.age}` : ''}
          {patient.sex ? ` · ${patient.sex}` : ''}
        </div>
        <div className="text-muted">{fmtShort(date)}</div>
      </div>
      <Section title="Diagnosis">{rx.diagnosis || '—'}</Section>
      {rx.advice && <Section title="Advice">{rx.advice}</Section>}
      {rx.modalities.length > 0 && <Section title="In-clinic modalities">{rx.modalities.join(', ')}</Section>}
      {items.length > 0 && (
        <Section title="Home exercise programme">
          <ol className="list-decimal pl-5">
            {items.map((it) => (
              <li key={it.exerciseId}>
                {exercises.find((e) => e.id === it.exerciseId)?.name} — {doseLabel(it)}
              </li>
            ))}
          </ol>
        </Section>
      )}
      <Section title="Follow-up">
        {FOLLOW[rx.followUp]}
        {rx.followUp === 'custom' && rx.followUpDate ? ` — ${fmtShort(rx.followUpDate)}` : ''}
      </Section>
      {rx.letterhead && (
        <div className="mt-8 flex justify-end">
          <div className="text-center">
            <div className="font-[cursive] text-[20px] text-brand">{physio.name.replace(/^Dr\.?\s*/, '')}</div>
            <div className="mt-1 border-t border-line pt-1 text-[12px] text-muted">{physio.name}, PT</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

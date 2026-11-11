import { useState } from 'react'
import { Button, Chip, Label, Sheet, TextArea } from '../../components/ui'
import { firstName } from '../../lib/logic'
import { haptic, openWhatsApp, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import type { DischargeOutcome, Patient } from '../../lib/types'

export const OUTCOMES: { v: DischargeOutcome; label: string }[] = [
  { v: 'goals_met', label: 'Goals met' },
  { v: 'improved', label: 'Improved' },
  { v: 'referred', label: 'Referred on' },
  { v: 'stopped', label: 'Stopped coming' },
  { v: 'other', label: 'Other' },
]
export const outcomeLabel = (v?: DischargeOutcome) => OUTCOMES.find((o) => o.v === v)?.label ?? 'Discharged'

/**
 * Discharge: the episode of care ends. The active plan is completed, the outcome and home advice are saved to the
 * patient's record, and the physio can send the advice on their own WhatsApp.
 */
export function DischargeSheet({ patient, open, onClose }: { patient: Patient; open: boolean; onClose: () => void }) {
  const store = useStore()
  const { physio } = useMe()
  const name = firstName(patient.name)
  const active = store.db.plans.find((pl) => pl.patientId === patient.id && pl.status === 'active')
  const upcoming = store.db.bookings.filter((b) => b.patientId === patient.id && b.date >= new Date().toISOString().slice(0, 10) && ['requested', 'awaiting', 'confirmed', 'reminder_sent'].includes(b.status))
  const [outcome, setOutcome] = useState<DischargeOutcome>('goals_met')
  const [note, setNote] = useState('')
  const [advice, setAdvice] = useState('')

  const discharge = (tell: boolean) => {
    store.dischargePatient(patient.id, { outcome, note: note.trim(), advice: advice.trim() })
    if (tell && physio)
      openWhatsApp(
        patient.phone,
        `Hi ${name}, it was great working with you. You’ve been discharged from your physiotherapy with me.${advice.trim() ? `\n\nTo keep it that way:\n${advice.trim()}` : ''}\n\nIf anything flares up, message me here. – ${physio.name}`,
      )
    haptic('success')
    toast(`${name} discharged${active ? ' · plan completed' : ''}`)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Discharge ${name}`}>
      <p className="text-[14px] text-muted">
        Ends this episode of care. {active ? `“${active.title}” is marked completed. ` : ''}Their history stays, and you can take them on again any time.
      </p>
      {upcoming.length > 0 && <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-[13px]">{name} still has {upcoming.length} upcoming visit{upcoming.length === 1 ? '' : 's'}. Cancel {upcoming.length === 1 ? 'it' : 'them'} from the schedule if needed.</p>}
      <div className="mt-4">
        <Label>Outcome</Label>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <Chip key={o.v} selected={outcome === o.v} onClick={() => setOutcome(o.v)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <TextArea label="Discharge summary (for your records)" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pain 7 → 1/10, full ROM, back to running" />
        <TextArea label={`Home advice for ${name}`} rows={3} maxLength={1000} value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Keep the core routine 3 times a week. Take a break every 40 minutes of sitting." />
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <Button block onClick={() => discharge(false)}>
          Discharge {name}
        </Button>
        <Button block variant="ghost" size="md" onClick={() => discharge(true)}>
          Discharge and send advice on my WhatsApp
        </Button>
      </div>
    </Sheet>
  )
}

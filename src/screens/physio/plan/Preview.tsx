import { History, Lock, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, Footer, PageHeader, TextArea, WhatsAppButton } from '../../../components/ui'
import { WhatsAppPreview } from '../../../components/WhatsAppPreview'
import { addDays, fmtTime, today } from '../../../lib/dates'
import { firstName } from '../../../lib/logic'
import { haptic, openWhatsApp, publicUrl, shareLink, toast, WEB_HOST } from '../../../lib/platform'
import { planDiff } from '../../../lib/planChanges'
import { useMe, useStore } from '../../../lib/store'
import type { Patient, Plan } from '../../../lib/types'
import { isRxOnly, stepLabel } from './RxNotes'

// R4 · Preview & send
export default function Preview() {
  const store = useStore()
  const { physio } = useMe()
  const nav = useNavigate()
  const [sending, setSending] = useState(false)
  const draft = store.db.draft
  if (!draft || !physio) return <Navigate to="/app/patients" replace />
  const patient = store.db.patients.find((p) => p.id === draft.patientId)
  if (!patient) return <Navigate to="/app/patients" replace />

  const editing = draft.editPlanId ? store.db.plans.find((p) => p.id === draft.editPlanId && p.status === 'active') : undefined
  if (editing) return <SaveChanges plan={editing} patient={patient} />

  const rxOnly = isRxOnly(draft) || draft.items.length === 0
  const hasRx = !!(draft.rx.diagnosis || draft.rx.advice)
  const path = `/plan/${patient.linkToken}`
  const now = new Date()
  const time = fmtTime(`${now.getHours()}:${now.getMinutes()}`)
  const name = firstName(patient.name)
  const docName = `Dr. ${firstName(physio.name)}`
  const msg = rxOnly
    ? `Hi ${name}, here’s your treatment plan from ${physio.name}. Tap below to view or download it.`
    : `Hi ${name}, here’s your plan${hasRx ? ' and treatment plan' : ''}. Tap below to start today’s session.`

  /** `ownWhatsApp`: the physio shares the link themselves, so the server doesn't message the patient. */
  const send = (ownWhatsApp = false) => {
    setSending(true)
    // The API sends the care_plan_shared / rx_shared WhatsApp template.
    const followUp = draft.rx.autoBook && draft.rx.followUp !== 'none'
    const followDate =
      draft.rx.followUp === '1w' ? addDays(today(), 7) : draft.rx.followUp === '2w' ? addDays(today(), 14) : draft.rx.followUpDate ?? addDays(today(), 7)
    setTimeout(() => {
      const planId = store.sendDraft(physio.id, { whatsapp: !ownWhatsApp })
      if (followUp)
        store.addBooking({
          physioId: physio.id,
          patientId: patient.id,
          patientName: patient.name,
          patientPhone: patient.phone,
          date: followDate,
          time: '10:30',
          visitType: 'in_clinic',
          reason: 'Follow-up',
          isNewPatient: false,
          status: 'awaiting',
          sendConfirmation: true,
          reminder: true,
          source: 'physio',
        })
      haptic('success')
      toast(`${ownWhatsApp ? `Plan saved for ${name}` : `Sent to ${name} on WhatsApp`}${followUp ? ' · follow-up booked' : ''}`)
      nav(planId && !rxOnly ? `/app/plans/${planId}` : `/app/patients/${patient.id}`, { replace: true })
    }, 600)
  }

  return (
    <Page>
      <PageHeader title="Preview" subtitle={`${stepLabel(draft, 'preview')} · exactly what ${name} will see`} onBack={() => nav(rxOnly ? '/app/plan/rx' : '/app/plan/build', { replace: true })} />
      <WhatsAppPreview
        onBehalfOf={physio.name}
        time={time}
        buttons={rxOnly ? ['View treatment plan', `Ask ${docName} a question`] : ['Start today’s session', `Ask ${docName} a question`]}
      >
        <div className="mb-2 overflow-hidden rounded-lg bg-surface">
          <div className="bg-brand px-3.5 py-3 text-white">
            <div className="text-[17px] font-semibold">{rxOnly ? 'Your treatment plan' : `Your ${draft.weeks}-week care plan`}</div>
            <div className="text-[12px] text-white/80">
              {rxOnly
                ? draft.rx.diagnosis || 'From your physio'
                : `${draft.items.length} exercises · ${draft.daysPerWeek} days a week${hasRx ? ' · treatment plan included' : ''}`}
            </div>
          </div>
          <div className="px-3.5 py-2.5">
            <div className="text-[13px] font-semibold">From {physio.name}, PT</div>
            <div className="text-[13px] text-wa">
              {WEB_HOST}
              {path}
            </div>
          </div>
        </div>
        {msg}
      </WhatsAppPreview>
      <div className="mt-4 flex gap-3 rounded-2xl bg-brand-soft/70 p-4 text-[14px] leading-snug text-brand">
        <Lock size={18} className="mt-0.5 shrink-0" />
        {patient.consentAt
          ? `${name} has already given consent, so the plan opens straight away. Progress syncs back to you.`
          : `${name} gives consent once before the plan opens — in the browser or the app. Progress then syncs back to you.`}
      </div>

      <Footer className="flex flex-col gap-2">
        <WhatsAppButton block disabled={sending} onClick={() => send()}>
          {sending ? 'Sending…' : 'Send on WhatsApp'}
        </WhatsAppButton>
        <div className="flex items-center justify-center gap-1">
          {!rxOnly && (
            <Button
              variant="ghost"
              size="md"
              className="whitespace-nowrap px-3 text-[14px]"
              onClick={() => {
                store.saveDraftAsTemplate(physio.id)
                toast('Saved as your template')
              }}
            >
              Save as template
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            className="whitespace-nowrap px-3 text-[14px]"
            disabled={sending}
            onClick={() => {
              // Free fallback: the physio sends the link from their own WhatsApp; we still record the plan.
              openWhatsApp(patient.phone, `${msg} ${publicUrl(path)}`)
              send(true)
            }}
          >
            Use my WhatsApp
          </Button>
          <Button
            variant="ghost"
            size="md"
            aria-label="Share another way"
            onClick={() => shareLink({ title: 'Care plan', text: msg, url: publicUrl(path) })}
          >
            <Share2 size={18} />
          </Button>
        </div>
      </Footer>
    </Page>
  )
}

/** Adjusting the active plan: same plan, same start date and progress; the reason is logged and shown to the patient. */
function SaveChanges({ plan, patient }: { plan: Plan; patient: Patient }) {
  const store = useStore()
  const nav = useNavigate()
  const [reason, setReason] = useState('')
  const draft = store.db.draft!
  const summary = planDiff(plan, draft, store.db.exercises)
  const name = firstName(patient.name)
  const ok = reason.trim().length >= 3 && summary.length > 0

  const save = (tell: boolean) => {
    const why = reason.trim()
    store.saveDraftEdits(why, summary)
    if (tell) openWhatsApp(patient.phone, `Hi ${name}, I’ve updated your care plan: ${why}. Open it here: ${publicUrl(`/plan/${patient.linkToken}`)}`)
    haptic('success')
    toast(`Plan updated for ${name}`)
    nav(`/app/plans/${plan.id}`, { replace: true })
  }

  return (
    <Page>
      <PageHeader title="Save changes" subtitle={`${name}’s current plan · progress is kept`} onBack={() => nav('/app/plan/build', { replace: true })} />
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-muted">What’s changing</div>
        {summary.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">Nothing has changed yet. Go back to adjust exercises, doses or the schedule.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">
            {summary.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {s}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="mt-4">
        <TextArea
          label="Why are you changing the plan? *"
          placeholder={`e.g. ${name} reported less pain, progressing to the next level`}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
          <History size={13} /> Saved in the plan’s change log. {name} sees it with the updated plan.
        </p>
      </div>
      <Footer className="flex flex-col gap-2">
        <Button block disabled={!ok} onClick={() => save(false)}>
          Save changes
        </Button>
        <Button variant="ghost" size="md" disabled={!ok} onClick={() => save(true)}>
          Save and tell {name} on my WhatsApp
        </Button>
      </Footer>
    </Page>
  )
}

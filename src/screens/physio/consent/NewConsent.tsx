import { Check, Clock, FileSignature, MessageCircle, Tablet } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConsentSigner } from '../../../components/ConsentSigner'
import { Page } from '../../../components/Shell'
import { Badge, Button, Card, cx, IconTile, PageHeader, WhatsAppButton } from '../../../components/ui'
import { CONSENT_FORMS, formById } from '../../../lib/consents'
import { firstName } from '../../../lib/logic'
import { haptic, openWhatsApp, publicUrl, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

// Take a treatment consent: pick a form, then the patient signs here or on their phone.
export default function NewConsent() {
  const { id } = useParams()
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const st = (useLocation().state ?? {}) as { formId?: string; returnToFlow?: boolean }
  // Opened from the plan flow: go back to the step the physio was on, with everything they typed.
  const done = () => (st.returnToFlow ? nav(-1) : nav(`/app/patients/${id}`, { replace: true, state: { tab: 'Consents' } }))
  const [formId, setFormId] = useState<string | undefined>(st.formId)
  const [mode, setMode] = useState<'choose' | 'sign'>('choose')
  const patient = store.db.patients.find((p) => p.id === id)
  if (!physio) return null
  if (!patient) return <Navigate to="/app/patients" replace />
  const mine = store.db.consents.filter((c) => c.patientId === patient.id)
  const form = formId ? formById(formId) : undefined
  const name = firstName(patient.name)

  const statusOf = (fid: string) => {
    const list = mine.filter((c) => c.formId === fid)
    if (list.some((c) => c.status === 'signed')) return 'signed'
    if (list.some((c) => c.status === 'pending')) return 'pending'
    return undefined
  }

  if (!form)
    return (
      <Page>
        <PageHeader title="Consent form" subtitle={`For ${patient.name}`} />
        <div className="flex flex-col gap-2.5">
          {CONSENT_FORMS.map((f) => {
            const s = statusOf(f.id)
            return (
              <button
                key={f.id}
                onClick={() => setFormId(f.id)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-brand-line cursor-pointer"
              >
                <IconTile>
                  <FileSignature size={18} />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{f.title}</div>
                  <div className="text-[13px] text-muted">{f.sub}</div>
                </div>
                {s === 'signed' && (
                  <Badge tone="ok" icon={<Check size={12} strokeWidth={3} />}>
                    Signed
                  </Badge>
                )}
                {s === 'pending' && (
                  <Badge tone="accent" icon={<Clock size={12} />}>
                    Sent
                  </Badge>
                )}
              </button>
            )
          })}
        </div>
      </Page>
    )

  const body = form.body(physio)

  const sendRemote = (ownWhatsApp: boolean) => {
    store.requestConsent(physio.id, patient.id, form.id, undefined, !ownWhatsApp)
    haptic('success')
    const url = publicUrl(`/plan/${patient.linkToken}`)
    if (ownWhatsApp) openWhatsApp(patient.phone, `Hi ${name}, please read and sign the “${form.title}” consent form before your treatment: ${url}`)
    toast(ownWhatsApp ? 'Consent form saved — send the message in WhatsApp' : `Sent to ${name} on WhatsApp`)
    done()
  }

  return (
    <Page wide>
      <PageHeader title={form.title} subtitle={`Consent · ${patient.name}`} onBack={() => (mode === 'sign' ? setMode('choose') : setFormId(undefined))} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <Card className="max-h-[46vh] overflow-y-auto p-5 lg:max-h-none">
          <div className="whitespace-pre-line text-[14px] leading-relaxed">{body}</div>
        </Card>
        <div className="mt-5 lg:mt-0">
          {mode === 'choose' ? (
            <div className="flex flex-col gap-3">
              <button onClick={() => setMode('sign')} className={cx('flex items-center gap-3 rounded-2xl border border-brand bg-brand-soft/50 p-4 text-left cursor-pointer')}>
                <IconTile>
                  <Tablet size={18} />
                </IconTile>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">{name} is here — sign now</div>
                  <div className="text-[13px] text-muted">Hand over your phone or tablet. They read the form and sign with a finger.</div>
                </div>
              </button>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <IconTile tone="lime">
                    <MessageCircle size={18} />
                  </IconTile>
                  <div className="flex-1">
                    <div className="text-[15px] font-semibold">Send to {name}’s phone</div>
                    <div className="text-[13px] text-muted">They sign in the browser from the WhatsApp link — no app needed.</div>
                  </div>
                </div>
                <WhatsAppButton block size="md" className="mt-3" onClick={() => sendRemote(false)}>
                  Send on WhatsApp
                </WhatsAppButton>
                <Button block variant="ghost" size="md" className="mt-1" onClick={() => sendRemote(true)}>
                  Use my WhatsApp
                </Button>
              </Card>
            </div>
          ) : (
            <ConsentSigner
              patientName={patient.name}
              patientAge={patient.age}
              submitLabel="Save signed consent"
              onSubmit={(v) => {
                store.requestConsent(physio.id, patient.id, form.id, v)
                haptic('success')
                toast('Consent signed and saved to the patient record')
                done()
              }}
            />
          )}
        </div>
      </div>
      <div className="h-8" />
    </Page>
  )
}

import { Printer } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ConsentDocument } from '../../../components/Documents'
import { ConsentSigner } from '../../../components/ConsentSigner'
import { Page } from '../../../components/Shell'
import { Button, PageHeader, Sheet, WhatsAppButton } from '../../../components/ui'
import { firstName } from '../../../lib/logic'
import { haptic, isNative, openWhatsApp, publicUrl, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

// A consent on the patient record: view, sign in clinic if still pending, print, or withdraw.
export default function ConsentView() {
  const { id } = useParams()
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [signing, setSigning] = useState(false)
  const c = store.db.consents.find((x) => x.id === id)
  const patient = c && store.db.patients.find((p) => p.id === c.patientId)
  if (!physio) return null
  if (!c || !patient) return <Navigate to="/app/patients" replace />

  return (
    <Page>
      <div className="no-print">
        <PageHeader
          title={c.title}
          subtitle={patient.name}
          right={
            c.status === 'signed' && !isNative ? (
              <Button size="sm" variant="soft" onClick={() => window.print()}>
                <Printer size={15} /> PDF
              </Button>
            ) : undefined
          }
        />
      </div>
      <ConsentDocument consent={c} physio={physio} patient={patient} />
      <div className="no-print mt-5 flex flex-col gap-2">
        {c.status === 'pending' && (
          <>
            <Button block onClick={() => setSigning(true)}>
              {firstName(patient.name)} is here — sign now
            </Button>
            <WhatsAppButton
              block
              size="md"
              onClick={() => openWhatsApp(patient.phone, `Hi ${firstName(patient.name)}, a reminder to sign the “${c.title}” consent form: ${publicUrl(`/plan/${patient.linkToken}`)}`)}
            >
              Remind on WhatsApp
            </WhatsAppButton>
          </>
        )}
        {c.status === 'signed' && (
          <Button
            variant="ghost"
            size="md"
            className="text-danger"
            onClick={() => {
              store.setConsentStatus(c.id, 'revoked')
              toast('Consent marked as withdrawn')
            }}
          >
            Patient withdrew consent
          </Button>
        )}
        {(c.status === 'declined' || c.status === 'revoked') && (
          <Button variant="secondary" size="md" onClick={() => nav(`/app/patients/${patient.id}/consent`, { state: { formId: c.formId } })}>
            Take this consent again
          </Button>
        )}
      </div>
      <div className="h-8" />
      <Sheet open={signing} onClose={() => setSigning(false)} title="Sign consent">
        <ConsentSigner
          patientName={patient.name}
          patientAge={patient.age}
          submitLabel="Save signed consent"
          onSubmit={(v) => {
            store.signConsent(c.id, v)
            haptic('success')
            setSigning(false)
            toast('Consent signed')
          }}
        />
      </Sheet>
    </Page>
  )
}

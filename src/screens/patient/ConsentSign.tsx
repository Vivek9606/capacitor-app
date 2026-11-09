import { Printer } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ConsentDocument } from '../../components/Documents'
import { ConsentSigner } from '../../components/ConsentSigner'
import { Page } from '../../components/Shell'
import { Button, Card, PageHeader } from '../../components/ui'
import { firstName } from '../../lib/logic'
import { haptic, isNative, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

// Patient · read and sign (or decline) a consent form their physio sent
export default function ConsentSign() {
  const { id } = useParams()
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const c = store.db.consents.find((x) => x.id === id && x.patientId === patient?.id)
  if (!patient) return null
  if (!c) return <Navigate to="/me" replace />
  const physio = store.db.physios.find((p) => p.id === c.physioId)!
  const doc = `Dr. ${firstName(physio.name)}`

  return (
    <Page>
      <div className="no-print">
        <PageHeader
          title={c.title}
          subtitle={`From ${physio.name}`}
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
      <div className="no-print mt-5">
        {c.status === 'pending' ? (
          <ConsentSigner
            patientName={patient.name}
            patientAge={patient.age}
            submitLabel="I agree — sign"
            onSubmit={(v) => {
              store.signConsent(c.id, v)
              haptic('success')
              toast(`Signed — ${doc} has a copy`)
              nav('/me', { replace: true })
            }}
            onDecline={() => {
              store.setConsentStatus(c.id, 'declined')
              toast(`${doc} will talk it through with you at your visit`)
              nav('/me', { replace: true })
            }}
          />
        ) : c.status === 'signed' ? (
          <Card className="p-4 text-[14px]">
            You can withdraw this consent at any time. {doc} will be told and will not use this treatment until you agree again.
            <Button
              block
              variant="secondary"
              size="md"
              className="mt-3"
              onClick={() => {
                store.setConsentStatus(c.id, 'revoked')
                toast('Consent withdrawn')
              }}
            >
              Withdraw consent
            </Button>
          </Card>
        ) : null}
      </div>
      <div className="h-8" />
    </Page>
  )
}

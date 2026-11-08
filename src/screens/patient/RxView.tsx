import { Download } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { RxDocument } from '../../components/RxDocument'
import { Page } from '../../components/Shell'
import { Button, PageHeader } from '../../components/ui'
import { isNative, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

// Patient · prescription with PDF download
export default function RxView() {
  const { id } = useParams()
  const { patient } = useMe()
  const { db } = useStore()
  const plan = db.plans.find((p) => p.id === id && p.patientId === patient?.id)
  if (!patient || !plan?.rx) return <Navigate to="/me/plan" replace />
  const physio = db.physios.find((p) => p.id === plan.physioId)!

  const download = () => {
    // Web: browser print dialog → "Save as PDF". Phase 2: server-rendered PDF (also used in the app).
    if (isNative) toast('PDF download in the app arrives with the backend — use the web link for now')
    else window.print()
  }

  return (
    <Page>
      <div className="no-print">
        <PageHeader
          title="Prescription"
          subtitle={physio.name}
          right={
            <Button size="sm" variant="soft" onClick={download}>
              <Download size={15} /> PDF
            </Button>
          }
        />
      </div>
      <RxDocument rx={plan.rx} physio={physio} patient={patient} items={plan.items} exercises={db.exercises} date={plan.sentAt.slice(0, 10)} />
      <div className="h-8" />
    </Page>
  )
}

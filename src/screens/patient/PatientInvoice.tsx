import { Printer } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { InvoiceDocument } from '../../components/Documents'
import { Page } from '../../components/Shell'
import { Button, PageHeader } from '../../components/ui'
import { inr, upiLink } from '../../lib/invoices'
import { isNative } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

// Patient · a bill from their physio, with UPI pay link
export default function PatientInvoice() {
  const { id } = useParams()
  const { patient } = useMe()
  const { db } = useStore()
  const inv = db.invoices.find((i) => i.id === id && i.patientId === patient?.id)
  if (!patient) return null
  if (!inv) return <Navigate to="/me/appointments" replace />
  const physio = db.physios.find((p) => p.id === inv.physioId)!
  const upi = inv.status === 'unpaid' ? upiLink(physio, inv) : undefined

  return (
    <Page>
      <div className="no-print">
        <PageHeader
          title={`Invoice ${inv.number}`}
          subtitle={physio.name}
          right={
            !isNative ? (
              <Button size="sm" variant="soft" onClick={() => window.print()}>
                <Printer size={15} /> PDF
              </Button>
            ) : undefined
          }
        />
      </div>
      <InvoiceDocument invoice={inv} physio={physio} />
      {upi && (
        <div className="no-print mt-5">
          <a href={upi} className="flex h-12 w-full items-center justify-center rounded-xl bg-brand text-[16px] font-semibold text-white">
            Pay {inr(inv.total)} with UPI
          </a>
          <p className="mt-2 text-center text-[13px] text-muted">Opens GPay, PhonePe or Paytm. Your physio marks it paid once received.</p>
        </div>
      )}
      <div className="h-8" />
    </Page>
  )
}

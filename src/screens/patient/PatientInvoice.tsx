import { Download } from 'lucide-react'
import { useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { InvoiceDocument } from '../../components/Documents'
import { Page } from '../../components/Shell'
import { Button, PageHeader } from '../../components/ui'
import { inr, upiLink } from '../../lib/invoices'
import { elementToPdf, savePdf } from '../../lib/pdf'
import { toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

// Patient · a bill from their physio, with UPI pay link
export default function PatientInvoice() {
  const { id } = useParams()
  const { patient } = useMe()
  const { db } = useStore()
  const [busy, setBusy] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)
  const inv = db.invoices.find((i) => i.id === id && i.patientId === patient?.id)
  if (!patient) return null
  if (!inv) return <Navigate to="/me/appointments" replace />
  const physio = db.physios.find((p) => p.id === inv.physioId)!
  const upi = inv.status === 'unpaid' ? upiLink(physio, inv) : undefined

  async function download() {
    if (!docRef.current) return
    setBusy(true)
    try {
      await savePdf(await elementToPdf(docRef.current), `${inv!.number}.pdf`, `Invoice ${inv!.number}`)
    } catch (e) {
      toast(e instanceof Error ? `Couldn’t make the PDF: ${e.message}` : 'Couldn’t make the PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <div className="no-print">
        <PageHeader
          title={`Invoice ${inv.number}`}
          subtitle={physio.name}
          right={
            <Button size="sm" variant="soft" disabled={busy} onClick={download}>
              <Download size={15} /> {busy ? 'Making…' : 'PDF'}
            </Button>
          }
        />
      </div>
      <div ref={docRef}>
        <InvoiceDocument invoice={inv} physio={physio} />
      </div>
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

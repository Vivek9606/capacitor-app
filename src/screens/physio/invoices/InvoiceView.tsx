import { Download } from 'lucide-react'
import { useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { InvoiceDocument } from '../../../components/Documents'
import { Page } from '../../../components/Shell'
import { Button, Chip, PageHeader, Sheet, WhatsAppButton } from '../../../components/ui'
import { invoiceMessage, PAYMENT_LABEL } from '../../../lib/invoices'
import { elementToPdf, savePdf, sharePdf } from '../../../lib/pdf'
import { haptic, isNative, openWhatsApp, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'
import type { PaymentMethod } from '../../../lib/types'

const pdfError = (e: unknown) => toast(e instanceof Error ? `Couldn’t make the PDF: ${e.message}` : 'Couldn’t make the PDF')

export default function InvoiceView() {
  const { id } = useParams()
  const { physio } = useMe()
  const store = useStore()
  const [paying, setPaying] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [busy, setBusy] = useState<'send' | 'save'>()
  const docRef = useRef<HTMLDivElement>(null)
  const inv = store.db.invoices.find((x) => x.id === id)
  if (!physio) return null
  if (!inv) return <Navigate to="/app/invoices" replace />

  const fileName = `${inv.number}.pdf`
  const title = `Invoice ${inv.number}`
  const makePdf = () => {
    if (!docRef.current) throw new Error('Invoice isn’t on screen yet')
    return elementToPdf(docRef.current)
  }

  /** Share sheet with the PDF attached and the bill details as the message. */
  async function sendPdf() {
    setBusy('send')
    try {
      const text = invoiceMessage(physio!, inv!)
      const r = await sharePdf(await makePdf(), fileName, { title, text })
      if (r === 'cancelled') return
      store.updateInvoice(inv!.id, { sent: true })
      if (r === 'downloaded') {
        // Desktop browsers can't attach a file to a WhatsApp link: download it and open the chat.
        toast('PDF downloaded. Attach it in the WhatsApp chat.')
        openWhatsApp(inv!.patientPhone, text)
      }
    } catch (e) {
      pdfError(e)
    } finally {
      setBusy(undefined)
    }
  }

  async function savePdfNow() {
    setBusy('save')
    try {
      await savePdf(await makePdf(), fileName, title)
    } catch (e) {
      pdfError(e)
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <Page>
      <div className="no-print">
        <PageHeader
          title={inv.number}
          subtitle={inv.patientName}
          right={
            <Button size="sm" variant="soft" disabled={!!busy} onClick={savePdfNow}>
              <Download size={15} /> {busy === 'save' ? 'Making…' : 'PDF'}
            </Button>
          }
        />
      </div>
      <div ref={docRef}>
        <InvoiceDocument invoice={inv} physio={physio} />
      </div>
      <div className="no-print mt-5 flex flex-col gap-2">
        {inv.status === 'unpaid' && (
          <Button block onClick={() => setPaying(true)}>
            Record payment
          </Button>
        )}
        {inv.status !== 'void' && (
          <>
            <WhatsAppButton block size="md" disabled={!!busy} onClick={sendPdf}>
              {busy === 'send'
                ? 'Making PDF…'
                : inv.status === 'paid'
                  ? 'Send receipt PDF on WhatsApp'
                  : inv.sentAt
                    ? 'Send reminder with PDF'
                    : 'Send invoice PDF on WhatsApp'}
            </WhatsAppButton>
            <p className="text-center text-[12px] text-muted">
              {isNative ? 'Pick WhatsApp, then the patient’s chat. The bill details go along as the message.' : 'Opens the share menu with the PDF attached.'}
            </p>
            <Button
              variant="ghost"
              size="md"
              className="text-muted"
              onClick={() => {
                openWhatsApp(inv.patientPhone, invoiceMessage(physio, inv))
                store.updateInvoice(inv.id, { sent: true })
              }}
            >
              Send as text message instead
            </Button>
          </>
        )}
        {inv.sentAt && <p className="text-center text-[12px] text-muted">Last sent {new Date(inv.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
        {inv.status === 'unpaid' && (
          <Button
            variant="ghost"
            size="md"
            className="text-danger"
            onClick={() => {
              store.updateInvoice(inv.id, { status: 'void' })
              toast('Invoice voided')
            }}
          >
            Void invoice
          </Button>
        )}
        {inv.status === 'paid' && (
          <Button variant="ghost" size="md" className="text-muted" onClick={() => (store.updateInvoice(inv.id, { status: 'unpaid' }), toast('Marked as unpaid'))}>
            Undo payment
          </Button>
        )}
      </div>
      <div className="h-8" />
      <Sheet open={paying} onClose={() => setPaying(false)} title="Record payment">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
            <Chip key={m} selected={method === m} onClick={() => setMethod(m)}>
              {PAYMENT_LABEL[m]}
            </Chip>
          ))}
        </div>
        <Button
          block
          className="mt-5"
          onClick={() => {
            haptic('success')
            store.updateInvoice(inv.id, { status: 'paid', method })
            setPaying(false)
            toast('Payment recorded')
          }}
        >
          Mark paid · {PAYMENT_LABEL[method]}
        </Button>
      </Sheet>
    </Page>
  )
}

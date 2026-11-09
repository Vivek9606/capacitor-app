import { Printer } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { InvoiceDocument } from '../../../components/Documents'
import { Page } from '../../../components/Shell'
import { Button, Chip, PageHeader, Sheet, WhatsAppButton } from '../../../components/ui'
import { invoiceMessage, PAYMENT_LABEL } from '../../../lib/invoices'
import { haptic, isNative, openWhatsApp, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'
import type { PaymentMethod } from '../../../lib/types'

export default function InvoiceView() {
  const { id } = useParams()
  const { physio } = useMe()
  const store = useStore()
  const [paying, setPaying] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const inv = store.db.invoices.find((x) => x.id === id)
  if (!physio) return null
  if (!inv) return <Navigate to="/app/invoices" replace />

  return (
    <Page>
      <div className="no-print">
        <PageHeader
          title={inv.number}
          subtitle={inv.patientName}
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
      <div className="no-print mt-5 flex flex-col gap-2">
        {inv.status === 'unpaid' && (
          <Button block onClick={() => setPaying(true)}>
            Record payment
          </Button>
        )}
        {inv.status !== 'void' && (
          <WhatsAppButton
            block
            size="md"
            onClick={() => {
              openWhatsApp(inv.patientPhone, invoiceMessage(physio, inv))
              store.updateInvoice(inv.id, { sent: true })
            }}
          >
            {inv.status === 'paid' ? 'Send receipt on WhatsApp' : inv.sentAt ? 'Send reminder on WhatsApp' : 'Send on WhatsApp'}
          </WhatsAppButton>
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

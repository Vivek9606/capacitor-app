import { Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { VISIT_LABEL } from '../../../components/bits'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, Input, Label, PageHeader, TextArea, Toggle, WhatsAppButton } from '../../../components/ui'
import { fmtShort, today } from '../../../lib/dates'
import { billingOf, inr, invoiceMessage, nextInvoiceNumber, PAYMENT_LABEL, totals } from '../../../lib/invoices'
import { fmtPhone } from '../../../lib/logic'
import { haptic, openWhatsApp, toast } from '../../../lib/platform'
import { visitFee } from '../../../lib/slots'
import { useMe, useStore } from '../../../lib/store'
import type { Invoice, InvoiceItem, PaymentMethod } from '../../../lib/types'

const EXTRAS = ['IFT', 'TENS', 'Ultrasound', 'Taping', 'Dry needling', 'Manual therapy', 'Exercise band', 'Session package']

// New invoice — prefilled from a visit, a walk-in or a group seat.
export default function NewInvoice() {
  const { physio } = useMe()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const st = (useLocation().state ?? {}) as { bookingId?: string; patientId?: string; groupId?: string; participantId?: string }
  const booking = st.bookingId ? db.bookings.find((b) => b.id === st.bookingId) : undefined
  const group = st.groupId ? db.groups.find((g) => g.id === st.groupId) : undefined
  const seat = group?.participants.find((p) => p.id === st.participantId)

  const [patientId, setPatientId] = useState<string | undefined>(booking?.patientId ?? seat?.patientId ?? st.patientId)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (!physio) return []
    if (group) return [{ description: `${group.title} · ${fmtShort(group.date)}`, qty: 1, rate: group.fee }]
    const vt = booking?.visitType ?? 'in_clinic'
    return [{ description: `Physiotherapy session · ${VISIT_LABEL[vt].toLowerCase()}${booking ? ` · ${fmtShort(booking.date)}` : ''}`, qty: 1, rate: visitFee(physio, vt) }]
  })
  const [discount, setDiscount] = useState('')
  const [taxPct, setTaxPct] = useState(() => String(physio ? billingOf(physio).taxPct || '' : ''))
  const [notes, setNotes] = useState('')
  const [paid, setPaid] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>('upi')

  const mine = useMemo(() => db.patients.filter((p) => p.physioId === physio?.id), [db.patients, physio?.id])
  if (!physio) return null
  const patient = mine.find((p) => p.id === patientId)
  const t = totals(items, Number(discount) || 0, Number(taxPct) || 0)
  const valid = !!patient && items.length > 0 && items.every((i) => i.description.trim() && i.qty > 0) && t.total > 0
  const matches = (q ? mine.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase())) : mine).slice(0, 6)
  const setItem = (i: number, patch: Partial<InvoiceItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  const save = (send: 'server' | 'own' | false) => {
    if (!patient) return
    haptic('success')
    const input = {
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      date: today(),
      items: items.map((i) => ({ ...i, description: i.description.trim() })),
      discount: Number(discount) || 0,
      taxPct: Number(taxPct) || 0,
      notes: notes.trim() || undefined,
      bookingId: booking?.id,
      groupSessionId: group?.id,
      status: (paid ? 'paid' : 'unpaid') as Invoice['status'],
      method: paid ? method : undefined,
      send: send === 'server',
    }
    const id = store.createInvoice(physio.id, input)
    if (send === 'own') {
      // The new invoice isn't in this render's db yet, so build the message from the input.
      const number = nextInvoiceNumber(db.invoices, physio, input.date)
      openWhatsApp(patient.phone, invoiceMessage(physio, { ...input, id, number, total: t.total, physioId: physio.id, createdAt: '' }))
      store.updateInvoice(id, { sent: true })
    }
    toast(send ? `Invoice sent to ${patient.name.split(' ')[0]}` : 'Invoice saved')
    nav(`/app/invoices/${id}`, { replace: true })
  }

  return (
    <Page wide>
      <PageHeader title="New invoice" subtitle={booking ? `For the visit on ${fmtShort(booking.date)}` : group ? group.title : undefined} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div>
          <Label>Bill to</Label>
          {patient ? (
            <button
              onClick={() => !booking && !seat && setPatientId(undefined)}
              className="flex h-[52px] w-full items-center justify-between rounded-xl border border-line bg-surface px-4 text-left text-[16px] cursor-pointer"
            >
              <span className="truncate">
                {patient.name} · {fmtPhone(patient.phone)}
              </span>
              {!booking && !seat && <span className="text-[13px] font-semibold text-brand">Change</span>}
            </button>
          ) : (
            <Card className="overflow-hidden">
              <div className="flex h-12 items-center gap-2 border-b border-line px-4">
                <Search size={17} className="text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients" className="h-full flex-1 bg-transparent outline-none placeholder:text-faint" autoFocus />
              </div>
              {matches.map((p) => (
                <button key={p.id} onClick={() => setPatientId(p.id)} className="block w-full px-4 py-2.5 text-left hover:bg-bg cursor-pointer">
                  <div className="text-[15px] font-medium">{p.name}</div>
                  <div className="text-[12px] text-muted">{fmtPhone(p.phone)}</div>
                </button>
              ))}
              <button onClick={() => nav('/app/patients/new')} className="block w-full px-4 py-3 text-left text-[14px] font-semibold text-brand hover:bg-bg cursor-pointer">
                + Add a new patient
              </button>
            </Card>
          )}

          <h3 className="mb-3 mt-6 text-[16px] font-semibold">Items</h3>
          <div className="flex flex-col gap-3">
            {items.map((it, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input aria-label="Description" value={it.description} placeholder="Description" onChange={(e) => setItem(i, { description: e.target.value })} />
                  </div>
                  <button aria-label="Remove item" onClick={() => setItems(items.filter((_, j) => j !== i))} className="grid h-[52px] w-10 place-items-center text-muted hover:text-danger cursor-pointer">
                    <Trash2 size={17} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-[80px_1fr_auto] items-end gap-2">
                  <Input label="Qty" inputMode="numeric" value={String(it.qty)} onChange={(e) => setItem(i, { qty: Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
                  <Input label="Rate (₹)" inputMode="numeric" value={String(it.rate)} onChange={(e) => setItem(i, { rate: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                  <div className="pb-4 text-right text-[15px] font-semibold">{inr(it.qty * it.rate)}</div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXTRAS.map((e) => (
              <Chip
                key={e}
                className="h-8 px-3 text-[13px]"
                onClick={() =>
                  setItems([...items, e === 'Session package' ? { description: 'Package · 6 sessions', qty: 1, rate: visitFee(physio, 'in_clinic') * 6 } : { description: e, qty: 1, rate: 0 }])
                }
              >
                <Plus size={13} className="mr-1" /> {e}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:mt-0">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Discount (₹)" inputMode="numeric" value={discount} placeholder="0" onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ''))} />
            <Input label="GST %" inputMode="numeric" value={taxPct} placeholder="0" onChange={(e) => setTaxPct(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </div>
          <TextArea label="Note on invoice (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Card className="p-4 text-[14px]">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{inr(t.sub)}</span>
            </div>
            {t.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Discount</span>
                <span>−{inr(t.discount)}</span>
              </div>
            )}
            {t.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">GST {taxPct}%</span>
                <span>{inr(t.tax)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-[18px] font-semibold">
              <span>Total</span>
              <span>{inr(t.total)}</span>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[15px] font-semibold">Already paid</div>
                <div className="text-[13px] text-muted">Record the payment now</div>
              </div>
              <Toggle label="Already paid" checked={paid} onChange={setPaid} />
            </div>
            {paid && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                  <Chip key={m} selected={method === m} onClick={() => setMethod(m)}>
                    {PAYMENT_LABEL[m]}
                  </Chip>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <Footer className="flex flex-col gap-2 lg:items-end">
        <WhatsAppButton block className="lg:w-[400px]" disabled={!valid} onClick={() => save('server')}>
          Save & send on WhatsApp
        </WhatsAppButton>
        <div className="flex justify-center gap-1 lg:w-[400px]">
          <Button variant="ghost" size="md" disabled={!valid} onClick={() => save('own')}>
            Use my WhatsApp
          </Button>
          <Button variant="ghost" size="md" disabled={!valid} onClick={() => save(false)}>
            Save only
          </Button>
        </div>
      </Footer>
    </Page>
  )
}

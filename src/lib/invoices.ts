import type { Billing, Invoice, InvoiceItem, PaymentMethod, Physio } from './types'

export const DEFAULT_BILLING: Billing = { invoicePrefix: 'INV', taxPct: 0 }

export const billingOf = (p: Physio): Billing => ({ ...DEFAULT_BILLING, ...p.billing })

export const PAYMENT_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', upi: 'UPI', card: 'Card', bank: 'Bank transfer', other: 'Other' }

export function subtotal(items: InvoiceItem[]) {
  return items.reduce((s, i) => s + i.qty * i.rate, 0)
}

export function totals(items: InvoiceItem[], discount: number, taxPct: number) {
  const sub = subtotal(items)
  const afterDiscount = Math.max(0, sub - discount)
  const tax = Math.round((afterDiscount * taxPct) / 100)
  return { sub, discount: Math.min(discount, sub), tax, total: afterDiscount + tax }
}

/** Next invoice number for the year, e.g. INV-2026-0007. The server assigns the final number. */
export function nextInvoiceNumber(invoices: Invoice[], physio: Physio, date: string) {
  const prefix = billingOf(physio).invoicePrefix || 'INV'
  const year = date.slice(0, 4)
  const n = invoices.filter((i) => i.physioId === physio.id && i.date.startsWith(year)).length + 1
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** UPI deep link (opens GPay / PhonePe / Paytm) for the amount due. */
export function upiLink(physio: Physio, inv: Invoice) {
  const b = billingOf(physio)
  if (!b.upiId) return undefined
  const params = new URLSearchParams({ pa: b.upiId, pn: physio.clinic?.name || physio.name, am: String(inv.total), cu: 'INR', tn: `${inv.number}` })
  return `upi://pay?${params.toString()}`
}

export function invoiceMessage(physio: Physio, inv: Invoice) {
  const b = billingOf(physio)
  const first = inv.patientName.split(' ')[0]
  const lines = [
    `Hi ${first}, here is your invoice ${inv.number} from ${physio.clinic?.name || physio.name}.`,
    '',
    ...inv.items.map((i) => `• ${i.description}${i.qty > 1 ? ` × ${i.qty}` : ''} — ${inr(i.qty * i.rate)}`),
    inv.discount ? `Discount: −${inr(inv.discount)}` : '',
    inv.taxPct ? `GST (${inv.taxPct}%) included` : '',
    `Total: ${inr(inv.total)}`,
    '',
    inv.status === 'paid' ? `Paid${inv.method ? ` by ${PAYMENT_LABEL[inv.method]}` : ''} — thank you!` : b.upiId ? `Pay by UPI to ${b.upiId}` : 'Please pay at your next visit.',
  ]
  return lines.filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n')
}

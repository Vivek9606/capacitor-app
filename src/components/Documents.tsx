import { fmtShort } from '../lib/dates'
import { billingOf, inr, PAYMENT_LABEL, totals } from '../lib/invoices'
import type { Consent, Invoice, Patient, Physio } from '../lib/types'
import { cx } from './ui'

function Letterhead({ physio, title, right }: { physio: Physio; title: string; right: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 border-brand pb-4">
      <div>
        <div className="text-[18px] font-semibold text-brand">{physio.clinic?.name ?? physio.name}</div>
        <div className="text-[13px] text-muted">
          {physio.name}, PT{physio.qualification ? ` · ${physio.qualification}` : ''}
        </div>
        {physio.councilRegNo && <div className="text-[12px] text-muted">Reg. no. {physio.councilRegNo}</div>}
        {physio.clinic?.address && <div className="max-w-[260px] text-[12px] text-muted">{physio.clinic.address}</div>}
        <div className="text-[12px] text-muted">+91 {physio.phone}</div>
      </div>
      <div className="text-right">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-muted">{title}</div>
        <div className="mt-1 text-[13px]">{right}</div>
      </div>
    </div>
  )
}

/** Printable invoice (physio view, patient view and print-to-PDF). */
export function InvoiceDocument({ invoice: inv, physio, className }: { invoice: Invoice; physio: Physio; className?: string }) {
  const b = billingOf(physio)
  const t = totals(inv.items, inv.discount, inv.taxPct)
  return (
    <div className={cx('rounded-2xl border border-line bg-white p-6 text-[14px] leading-relaxed text-ink', className)}>
      <Letterhead
        physio={physio}
        title="Invoice"
        right={
          <>
            <div className="font-semibold">{inv.number}</div>
            <div className="text-muted">{fmtShort(inv.date)}</div>
            {b.gstin && <div className="text-[12px] text-muted">GSTIN {b.gstin}</div>}
          </>
        }
      />
      <div className="mt-4 text-[13px]">
        <span className="text-muted">Billed to: </span>
        <b>{inv.patientName}</b> · +91 {inv.patientPhone}
      </div>
      <table className="mt-4 w-full text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="py-2 font-semibold">Item</th>
            <th className="w-12 py-2 text-right font-semibold">Qty</th>
            <th className="w-20 py-2 text-right font-semibold">Rate</th>
            <th className="w-24 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={i} className="border-b border-line/60">
              <td className="py-2">{it.description}</td>
              <td className="py-2 text-right">{it.qty}</td>
              <td className="py-2 text-right">{inr(it.rate)}</td>
              <td className="py-2 text-right">{inr(it.qty * it.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-3 w-full max-w-[240px] text-[13px]">
        <Row label="Subtotal" value={inr(t.sub)} />
        {t.discount > 0 && <Row label="Discount" value={`−${inr(t.discount)}`} />}
        {inv.taxPct > 0 && <Row label={`GST ${inv.taxPct}%`} value={inr(t.tax)} />}
        <div className="mt-1 flex justify-between border-t border-ink pt-2 text-[16px] font-semibold">
          <span>Total</span>
          <span>{inr(inv.total)}</span>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        {inv.status === 'paid' ? (
          <span className="rounded-lg border-2 border-ok px-3 py-1 text-[13px] font-bold uppercase tracking-wider text-ok">
            Paid{inv.method ? ` · ${PAYMENT_LABEL[inv.method]}` : ''}
            {inv.paidAt ? ` · ${fmtShort(inv.paidAt.slice(0, 10))}` : ''}
          </span>
        ) : inv.status === 'void' ? (
          <span className="rounded-lg border-2 border-muted px-3 py-1 text-[13px] font-bold uppercase tracking-wider text-muted">Void</span>
        ) : (
          <span className="text-[13px] text-muted">{b.upiId ? `Pay by UPI: ${b.upiId}` : 'Payment due'}</span>
        )}
      </div>
      {inv.notes && <p className="mt-4 text-[13px] text-muted">{inv.notes}</p>}
      {b.footer && <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">{b.footer}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  )
}

/** Signed (or pending) consent form, as the patient saw it. */
export function ConsentDocument({ consent: c, physio, patient, className }: { consent: Consent; physio: Physio; patient: Patient; className?: string }) {
  return (
    <div className={cx('rounded-2xl border border-line bg-white p-6 text-[14px] leading-relaxed text-ink', className)}>
      <Letterhead physio={physio} title="Consent form" right={<div className="font-semibold">{c.title}</div>} />
      <div className="mt-4 text-[13px]">
        <span className="text-muted">Patient: </span>
        <b>{patient.name}</b>
        {patient.age ? ` · ${patient.age}` : ''}
        {patient.sex ? ` · ${patient.sex}` : ''} · +91 {patient.phone}
      </div>
      <div className="mt-4 whitespace-pre-line">{c.body}</div>
      <div className="mt-6 border-t border-line pt-4">
        {c.status === 'signed' ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {c.signature ? (
                <img src={c.signature} alt={`Signature of ${c.signedName}`} className="h-16 max-w-[220px] object-contain" />
              ) : (
                <div className="font-[cursive] text-[22px] text-brand">{c.signedName}</div>
              )}
              <div className="mt-1 border-t border-line pt-1 text-[12px] text-muted">
                {c.guardian ? `${c.guardian}, parent/guardian of ${patient.name}` : c.signedName}
              </div>
            </div>
            <div className="text-right text-[12px] text-muted">
              Signed {c.signedAt ? new Date(c.signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
              <div>{c.method === 'in_clinic' ? 'In clinic' : 'In the Betterhood app'}</div>
            </div>
          </div>
        ) : (
          <div className="text-[13px] font-semibold text-accent">
            {c.status === 'pending' ? 'Awaiting signature' : c.status === 'declined' ? 'Declined by patient' : 'Withdrawn'}
          </div>
        )}
      </div>
    </div>
  )
}

import { Plus, ReceiptIndianRupee, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Badge, Button, Card, Chip, cx, Empty, IconButton, Input, PageHeader, Sheet } from '../../../components/ui'
import { fmtShort, today } from '../../../lib/dates'
import { billingOf, inr } from '../../../lib/invoices'
import { toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

type Filter = 'all' | 'unpaid' | 'paid'

export default function Invoices() {
  const { physio } = useMe()
  const { db } = useStore()
  const nav = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [settings, setSettings] = useState(false)
  if (!physio) return null
  const month = today().slice(0, 7)
  const mine = db.invoices.filter((i) => i.physioId === physio.id && i.status !== 'void').sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))
  const thisMonth = mine.filter((i) => i.date.startsWith(month))
  const billed = thisMonth.reduce((s, i) => s + i.total, 0)
  const collected = mine.filter((i) => i.status === 'paid' && (i.paidAt ?? i.date).startsWith(month)).reduce((s, i) => s + i.total, 0)
  const outstanding = mine.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.total, 0)
  const list = mine.filter((i) => filter === 'all' || i.status === filter)
  const b = billingOf(physio)

  return (
    <Page wide>
      <PageHeader
        title="Invoices"
        subtitle={b.upiId ? `UPI ${b.upiId}` : 'Add your UPI ID so patients can pay instantly'}
        right={
          <div className="flex gap-2">
            <IconButton aria-label="Billing settings" onClick={() => setSettings(true)}>
              <Settings2 size={18} />
            </IconButton>
            <Button size="sm" onClick={() => nav('/app/invoices/new')}>
              <Plus size={16} /> New
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        <Summary label="Billed this month" value={inr(billed)} />
        <Summary label="Collected" value={inr(collected)} tone="ok" />
        <Summary label="Outstanding" value={inr(outstanding)} tone={outstanding ? 'accent' : undefined} />
      </div>
      {!b.upiId && (
        <button onClick={() => setSettings(true)} className="mt-3 w-full rounded-2xl bg-accent-soft p-4 text-left text-[14px] cursor-pointer">
          <b>Set up billing</b> — add your UPI ID (and GSTIN if you have one) so every invoice has a pay link.
        </button>
      )}
      <div className="mb-3 mt-5 flex gap-2">
        {(['all', 'unpaid', 'paid'] as Filter[]).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'unpaid' ? 'Unpaid' : 'Paid'}
          </Chip>
        ))}
      </div>
      {list.length === 0 ? (
        <Card>
          <Empty
            icon={<ReceiptIndianRupee size={20} />}
            title={mine.length ? 'Nothing here' : 'No invoices yet'}
            body="Bill a visit right after it ends and send it on WhatsApp with your UPI ID."
            action={!mine.length && <Button size="md" onClick={() => nav('/app/invoices/new')}>Create invoice</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((i) => (
            <Card key={i.id} className="flex items-center gap-3 p-4" onClick={() => nav(`/app/invoices/${i.id}`)}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{i.patientName}</div>
                <div className="truncate text-[13px] text-muted">
                  {i.number} · {fmtShort(i.date)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-semibold">{inr(i.total)}</div>
                <Badge tone={i.status === 'paid' ? 'ok' : 'accent'} className="mt-1">
                  {i.status === 'paid' ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
      <div className="h-6" />
      <BillingSheet open={settings} onClose={() => setSettings(false)} />
    </Page>
  )
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'accent' }) {
  return (
    <Card className="px-3 py-3 lg:p-4">
      <div className={cx('text-[17px] font-semibold lg:text-[22px]', tone === 'ok' && 'text-ok', tone === 'accent' && 'text-accent')}>{value}</div>
      <div className="text-[12px] leading-tight text-muted lg:text-[13px]">{label}</div>
    </Card>
  )
}

export function BillingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { physio } = useMe()
  const store = useStore()
  const [f, setF] = useState(() => {
    const b = physio ? billingOf(physio) : { invoicePrefix: 'INV', taxPct: 0 }
    return { upiId: b.upiId ?? '', gstin: b.gstin ?? '', invoicePrefix: b.invoicePrefix, taxPct: String(b.taxPct || ''), footer: b.footer ?? '' }
  })
  if (!physio) return null
  const upiOk = !f.upiId.trim() || /^[\w.-]{2,}@[a-z]{2,}$/i.test(f.upiId.trim())
  const gstOk = !f.gstin.trim() || /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(f.gstin.trim())
  return (
    <Sheet open={open} onClose={onClose} title="Billing settings">
      <div className="flex flex-col gap-3">
        <Input label="UPI ID (for the pay link)" placeholder="yourname@okhdfc" value={f.upiId} onChange={(e) => setF({ ...f, upiId: e.target.value })} />
        {!upiOk && <p className="-mt-1 text-[13px] text-danger">That doesn’t look like a UPI ID.</p>}
        <Input label="GSTIN (optional)" placeholder="29ABCDE1234F1Z5" value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
        {!gstOk && <p className="-mt-1 text-[13px] text-danger">GSTIN should be 15 characters, e.g. 29ABCDE1234F1Z5.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice prefix" value={f.invoicePrefix} maxLength={8} onChange={(e) => setF({ ...f, invoicePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} />
          <Input label="Default GST %" inputMode="numeric" placeholder="0" value={f.taxPct} onChange={(e) => setF({ ...f, taxPct: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
        </div>
        <p className="text-[12px] text-muted">Physiotherapy by registered practitioners is usually GST-exempt — leave GST at 0 unless your CA advises otherwise.</p>
        <Input label="Invoice footer (optional)" placeholder="Thank you! Cancellation within 4 hrs is charged." value={f.footer} onChange={(e) => setF({ ...f, footer: e.target.value })} />
        <Button
          block
          disabled={!upiOk || !gstOk || !f.invoicePrefix}
          onClick={() => {
            store.updatePhysio(physio.id, {
              billing: { upiId: f.upiId.trim() || undefined, gstin: f.gstin.trim() || undefined, invoicePrefix: f.invoicePrefix || 'INV', taxPct: Number(f.taxPct) || 0, footer: f.footer.trim() || undefined },
            })
            toast('Billing settings saved')
            onClose()
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  )
}

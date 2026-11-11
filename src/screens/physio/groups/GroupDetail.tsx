import { Check, MapPin, Pencil, ReceiptIndianRupee, Search, Share2, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Badge, Button, Card, cx, Empty, Input, PageHeader, Progress, SectionTitle, Sheet, WhatsAppButton } from '../../../components/ui'
import { fmtDay, fmtShort, fmtTime, today } from '../../../lib/dates'
import { inr } from '../../../lib/invoices'
import { firstName, fmtPhone } from '../../../lib/logic'
import { haptic, openWhatsApp, publicUrl, shareLink, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'
import type { GroupParticipant } from '../../../lib/types'
import { EditGroupSheet } from './EditGroup'
import { seatsTaken } from './Groups'

export default function GroupDetail() {
  const { id } = useParams()
  const { physio } = useMe()
  const store = useStore()
  const { db } = store
  const nav = useNavigate()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const g = db.groups.find((x) => x.id === id)
  if (!physio) return null
  if (!g) return <Navigate to="/app/groups" replace />

  const active = g.participants.filter((p) => p.status !== 'cancelled')
  const n = active.length
  const started = g.date <= today()
  const series = g.seriesId ? db.groups.filter((x) => x.seriesId === g.seriesId).sort((a, b) => a.date.localeCompare(b.date)) : []
  const bookUrl = publicUrl(`/dr/${physio.slug}/book?group=${g.id}`)
  const invite = `Join my “${g.title}” on ${fmtDay(g.date)} at ${fmtTime(g.time)} (${g.minutes} min${g.fee ? `, ${inr(g.fee)}` : ''}) — ${g.location}. Book your seat: ${bookUrl}`
  const invoiced = (p: GroupParticipant) => db.invoices.some((i) => i.groupSessionId === g.id && i.patientPhone === p.phone && i.status !== 'void')

  return (
    <Page wide>
      <PageHeader
        title={g.title}
        subtitle={`${fmtDay(g.date)} · ${fmtTime(g.time)} · ${g.minutes} min`}
        right={
          <div className="flex gap-2">
            {g.status === 'scheduled' && (
              <Button size="sm" variant="soft" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Edit
              </Button>
            )}
            <Button size="sm" variant="soft" onClick={() => shareLink({ title: g.title, text: invite, url: bookUrl })}>
              <Share2 size={15} /> Invite
            </Button>
          </div>
        }
      />
      <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-muted">Seats</span>
              <span className="font-semibold">
                {n} of {g.capacity}
              </span>
            </div>
            <Progress value={(n / g.capacity) * 100} className="mt-2" />
            <div className="mt-3 flex items-start gap-2 text-[14px] text-muted">
              <MapPin size={15} className="mt-0.5 shrink-0" /> {g.location}
            </div>
            <div className="mt-1 text-[14px] text-muted">
              {g.fee ? `${inr(g.fee)} per person` : 'Free'} · {g.publicBooking ? 'Open on booking page' : 'Invite only'}
            </div>
            {g.description && <p className="mt-3 text-[14px] leading-relaxed">{g.description}</p>}
            {g.status !== 'scheduled' && (
              <Badge tone="muted" className="mt-3">
                {g.status === 'cancelled' ? 'Cancelled' : 'Completed'}
              </Badge>
            )}
          </Card>
          {g.status === 'scheduled' && (
            <>
              <WhatsAppButton block size="md" onClick={() => shareLink({ title: g.title, text: invite, url: bookUrl })}>
                Share invite on WhatsApp
              </WhatsAppButton>
              <div className="grid grid-cols-2 gap-2">
                {started ? (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      // Anyone not marked is counted as attended when the session is closed.
                      g.participants.filter((p) => p.status === 'booked').forEach((p) => store.setParticipantStatus(g.id, p.id, 'attended'))
                      store.updateGroup(g.id, { status: 'done' })
                      toast('Session completed')
                    }}
                  >
                    Mark completed
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  variant="secondary"
                  size="md"
                  className="text-danger"
                  onClick={() => {
                    store.updateGroup(g.id, { status: 'cancelled' })
                    toast(n ? `Session cancelled — let the ${n} participant${n === 1 ? '' : 's'} know on WhatsApp` : 'Session cancelled')
                  }}
                >
                  Cancel session
                </Button>
              </div>
            </>
          )}
          {series.length > 1 && (
            <Card className="p-4">
              <div className="mb-2 text-[14px] font-semibold">Weekly series</div>
              <div className="flex flex-wrap gap-1.5">
                {series.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => nav(`/app/groups/${s.id}`, { replace: true })}
                    className={cx(
                      'rounded-full border px-3 py-1 text-[13px] cursor-pointer',
                      s.id === g.id ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-line',
                      s.status === 'cancelled' && 'line-through opacity-60',
                    )}
                  >
                    {fmtShort(s.date)} · {seatsTaken(s)}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          <SectionTitle
            className="lg:mt-0"
            right={
              g.status === 'scheduled' && n < g.capacity ? (
                <Button size="sm" variant="soft" onClick={() => setAdding(true)}>
                  <UserPlus size={15} /> Add
                </Button>
              ) : undefined
            }
          >
            Participants
          </SectionTitle>
          {g.participants.length === 0 ? (
            <Card>
              <Empty icon={<UserPlus size={20} />} title="No one yet" body="Add patients, or share the invite — they book a seat from your booking page." />
            </Card>
          ) : (
            <Card className="divide-y divide-line">
              {g.participants.map((p) => (
                <div key={p.id} className={cx('px-4 py-3', p.status === 'cancelled' && 'opacity-50')}>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-semibold">{p.name}</div>
                      <div className="text-[12px] text-muted">{fmtPhone(p.phone)}</div>
                    </div>
                    {p.status === 'attended' && <Badge tone="ok">Attended</Badge>}
                    {p.status === 'no_show' && <Badge tone="warn">No-show</Badge>}
                    {p.status === 'cancelled' && <Badge tone="muted">Cancelled</Badge>}
                  </div>
                  {p.status !== 'cancelled' && g.status !== 'cancelled' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {started && (
                        <>
                          <Button size="sm" variant={p.status === 'attended' ? 'primary' : 'secondary'} onClick={() => store.setParticipantStatus(g.id, p.id, 'attended')}>
                            <Check size={14} /> Present
                          </Button>
                          <Button size="sm" variant={p.status === 'no_show' ? 'primary' : 'secondary'} onClick={() => store.setParticipantStatus(g.id, p.id, 'no_show')}>
                            <X size={14} /> No-show
                          </Button>
                        </>
                      )}
                      {g.fee > 0 &&
                        (invoiced(p) ? (
                          <Badge tone="brand" className="h-9">
                            Invoiced
                          </Badge>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => nav('/app/invoices/new', { state: { groupId: g.id, participantId: p.id } })}>
                            <ReceiptIndianRupee size={14} /> Invoice
                          </Button>
                        ))}
                      <Button size="sm" variant="ghost" onClick={() => openWhatsApp(p.phone, `Hi ${firstName(p.name)}, a reminder about “${g.title}” on ${fmtDay(g.date)} at ${fmtTime(g.time)} — ${g.location}.`)}>
                        WhatsApp
                      </Button>
                      {!started && (
                        <Button size="sm" variant="ghost" className="text-muted" onClick={() => (store.setParticipantStatus(g.id, p.id, 'cancelled'), toast(`${firstName(p.name)} removed`))}>
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
      <div className="h-6" />
      <AddParticipant open={adding} onClose={() => setAdding(false)} groupId={g.id} />
      {editing && <EditGroupSheet g={g} open={editing} onClose={() => setEditing(false)} />}
    </Page>
  )
}

function AddParticipant({ open, onClose, groupId }: { open: boolean; onClose: () => void; groupId: string }) {
  const { physio } = useMe()
  const store = useStore()
  const [q, setQ] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const g = store.db.groups.find((x) => x.id === groupId)
  const already = new Set(g?.participants.filter((p) => p.status !== 'cancelled').map((p) => p.phone))
  const mine = useMemo(() => store.db.patients.filter((p) => p.physioId === physio?.id && !already.has(p.phone)), [store.db.patients, physio?.id, already])
  if (!physio || !g) return null
  const matches = (q ? mine.filter((p) => `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase())) : mine).slice(0, 6)
  const digits = phone.replace(/\D/g, '')
  const add = (p: { patientId?: string; name: string; phone: string }) => {
    haptic('success')
    store.addParticipant(groupId, p)
    toast(`${firstName(p.name)} added`)
    setQ('')
    setName('')
    setPhone('')
    setIsNew(false)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add participant">
      {isNew ? (
        <div className="flex flex-col gap-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input prefix="+91" inputMode="numeric" placeholder="Mobile (WhatsApp)" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} />
          <Button
            block
            disabled={name.trim().length < 2 || !/^[6-9]\d{9}$/.test(digits)}
            onClick={() => {
              const patientId = store.addPatient(physio.id, { name: name.trim(), phone: digits })
              add({ patientId, name: name.trim(), phone: digits })
            }}
          >
            Add to session
          </Button>
          <button className="text-[14px] font-semibold text-brand cursor-pointer" onClick={() => setIsNew(false)}>
            Choose an existing patient
          </button>
        </div>
      ) : (
        <div>
          <div className="flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-4">
            <Search size={17} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patients" className="h-full flex-1 bg-transparent outline-none placeholder:text-faint" />
          </div>
          <div className="mt-2 flex flex-col">
            {matches.map((p) => (
              <button key={p.id} onClick={() => add({ patientId: p.id, name: p.name, phone: p.phone })} className="rounded-xl px-3 py-2.5 text-left hover:bg-surface cursor-pointer">
                <div className="text-[15px] font-medium">{p.name}</div>
                <div className="text-[12px] text-muted">{p.condition ?? fmtPhone(p.phone)}</div>
              </button>
            ))}
          </div>
          <Button variant="soft" size="md" className="mt-3" onClick={() => setIsNew(true)}>
            + New person
          </Button>
        </div>
      )}
    </Sheet>
  )
}

import { useState } from 'react'
import { Button, Checkbox, Input, Label, Sheet, TextArea, Toggle } from '../../../components/ui'
import { today } from '../../../lib/dates'
import { haptic, toast } from '../../../lib/platform'
import { useStore } from '../../../lib/store'
import type { GroupSession } from '../../../lib/types'

type Fields = Pick<GroupSession, 'title' | 'description' | 'date' | 'time' | 'minutes' | 'capacity' | 'fee' | 'location' | 'publicBooking'>

/** Edit a group session. For weekly series, the change (except the date) can go to every upcoming session. */
export function EditGroupSheet({ g, open, onClose }: { g: GroupSession; open: boolean; onClose: () => void }) {
  const store = useStore()
  const booked = g.participants.filter((p) => p.status !== 'cancelled').length
  const [f, setF] = useState<Fields>(() => ({
    title: g.title,
    description: g.description ?? '',
    date: g.date,
    time: g.time,
    minutes: g.minutes,
    capacity: g.capacity,
    fee: g.fee,
    location: g.location,
    publicBooking: g.publicBooking,
  }))
  const upcoming = g.seriesId ? store.db.groups.filter((x) => x.seriesId === g.seriesId && x.id !== g.id && x.status === 'scheduled' && x.date >= g.date) : []
  const [allInSeries, setAllInSeries] = useState(false)
  const set = (patch: Partial<Fields>) => setF((cur) => ({ ...cur, ...patch }))
  const valid = f.title.trim().length > 1 && f.location.trim().length > 1 && f.minutes >= 10 && f.capacity >= Math.max(1, booked) && /^\d{2}:\d{2}$/.test(f.time) && !!f.date

  const save = () => {
    if (!valid) return
    const patch = { ...f, title: f.title.trim(), location: f.location.trim(), description: f.description?.trim() || undefined }
    store.updateGroup(g.id, patch)
    if (allInSeries) {
      const { date: _date, ...rest } = patch
      upcoming.forEach((x) => {
        const seats = x.participants.filter((p) => p.status !== 'cancelled').length
        store.updateGroup(x.id, { ...rest, capacity: Math.max(rest.capacity, seats) })
      })
    }
    haptic('success')
    toast(allInSeries ? `Saved · ${upcoming.length + 1} sessions updated` : 'Session updated')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit session">
      <div className="flex flex-col gap-4">
        <Input label="Title" value={f.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
        <TextArea label="Description (optional)" rows={2} maxLength={500} value={f.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <input type="date" min={today()} value={f.date} onChange={(e) => set({ date: e.target.value })} className="h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand" />
          </div>
          <div>
            <Label>Start time</Label>
            <input type="time" step={300} value={f.time} onChange={(e) => set({ time: e.target.value })} className="h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Minutes" inputMode="numeric" value={String(f.minutes)} onChange={(e) => set({ minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          <Input label="Seats" inputMode="numeric" value={String(f.capacity)} onChange={(e) => set({ capacity: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          <Input label="Fee (₹)" inputMode="numeric" value={String(f.fee)} onChange={(e) => set({ fee: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
        </div>
        {f.capacity < booked && <p className="-mt-2 text-[13px] text-danger">{booked} people have booked, so seats can’t go below {booked}.</p>}
        <Input label="Location" value={f.location} maxLength={120} onChange={(e) => set({ location: e.target.value })} />
        <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold">Open on booking page</div>
            <div className="text-[13px] text-muted">Anyone with your link can book a seat</div>
          </div>
          <Toggle label="Open on booking page" checked={f.publicBooking} onChange={(v) => set({ publicBooking: v })} />
        </div>
        {upcoming.length > 0 && <Checkbox checked={allInSeries} onChange={setAllInSeries} label={<span className="text-[14px]">Also apply to the {upcoming.length} upcoming session{upcoming.length === 1 ? '' : 's'} in this weekly series (dates stay the same)</span>} />}
        <Button block disabled={!valid} onClick={save}>
          Save changes
        </Button>
      </div>
    </Sheet>
  )
}

import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, Input, Label, PageHeader, TextArea, Toggle } from '../../../components/ui'
import { addDays, fmtShort, today } from '../../../lib/dates'
import { haptic, toast } from '../../../lib/platform'
import { visitPlace } from '../../../lib/practice'
import { clashes } from '../../../lib/slots'
import { useMe, useStore } from '../../../lib/store'

const IDEAS = ['Back care', 'Knee OA', 'Pre-natal', 'Post-natal', 'Seniors’ balance', 'Posture & neck', 'Sports conditioning', 'Post-op knee']
const LENGTHS = [30, 45, 60, 90]
const REPEAT = [1, 4, 8, 12]

export default function NewGroup() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(addDays(today(), 1))
  const [time, setTime] = useState('08:00')
  const [minutes, setMinutes] = useState(60)
  const [capacity, setCapacity] = useState('8')
  const [fee, setFee] = useState('350')
  const [location, setLocation] = useState(() => (physio && visitPlace(physio)) ?? '')
  const [repeat, setRepeat] = useState(1)
  const [publicBooking, setPublicBooking] = useState(true)
  if (!physio) return null

  const cap = Number(capacity) || 0
  const valid = title.trim().length > 2 && !!date && !!time && cap >= 2 && cap <= 100 && location.trim().length > 2
  const clashDates = Array.from({ length: repeat }, (_, i) => addDays(date, i * 7)).filter((d) => clashes(physio, store.db, d, time, minutes))

  return (
    <Page wide>
      <PageHeader title="New group session" subtitle="A class for several patients" />
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-4">
          <div>
            <Input label="Title" placeholder="Back care group" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEAS.map((i) => (
                <Chip key={i} className="h-8 px-3 text-[13px]" selected={title === `${i} group`} onClick={() => setTitle(`${i} group`)}>
                  {i}
                </Chip>
              ))}
            </div>
          </div>
          <TextArea label="What to expect (shown to patients)" rows={3} placeholder="Core and mobility for desk workers. Bring water; mats provided." value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input label="Where" placeholder="Clinic, park, society clubhouse, online" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="mt-6 flex flex-col gap-4 lg:mt-0">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <Label>{repeat > 1 ? 'First session' : 'Date'}</Label>
              <input type="date" min={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-[52px] w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand" />
            </label>
            <label>
              <Label>Start time</Label>
              <input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} className="h-[52px] w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand" />
            </label>
          </div>
          <div>
            <Label>Length</Label>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((n) => (
                <Chip key={n} selected={minutes === n} onClick={() => setMinutes(n)}>
                  {n} min
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Seats" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            <Input label="Fee per person (₹)" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </div>
          <div>
            <Label>Repeat weekly</Label>
            <div className="flex flex-wrap gap-2">
              {REPEAT.map((n) => (
                <Chip key={n} selected={repeat === n} onClick={() => setRepeat(n)}>
                  {n === 1 ? 'Just once' : `${n} weeks`}
                </Chip>
              ))}
            </div>
            {repeat > 1 && <p className="mt-2 text-[13px] text-muted">Every week until {fmtShort(addDays(date, (repeat - 1) * 7))}.</p>}
          </div>
          <Card className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="text-[15px] font-semibold">Open on my booking page</div>
              <div className="text-[13px] text-muted">Patients can take a seat themselves</div>
            </div>
            <Toggle label="Open on booking page" checked={publicBooking} onChange={setPublicBooking} />
          </Card>
          {clashDates.length > 0 && (
            <div className="flex gap-3 rounded-2xl bg-warn-soft p-4 text-[14px]">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warn" />
              Overlaps something already on your calendar on {clashDates.map(fmtShort).join(', ')}.
            </div>
          )}
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button
          block
          className="lg:w-[400px]"
          disabled={!valid}
          onClick={() => {
            haptic('success')
            const id = store.addGroupSessions(
              physio.id,
              { title: title.trim(), description: description.trim() || undefined, date, time, minutes, capacity: cap, fee: Number(fee) || 0, location: location.trim(), publicBooking },
              repeat,
            )
            toast(repeat > 1 ? `${repeat} weekly sessions created` : 'Group session created')
            nav(`/app/groups/${id}`, { replace: true })
          }}
        >
          {repeat > 1 ? `Create ${repeat} sessions` : 'Create session'}
        </Button>
      </Footer>
    </Page>
  )
}

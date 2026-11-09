import { Plus, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Badge, Button, Card, Empty, PageHeader, SectionTitle } from '../../../components/ui'
import { fmtTime, relDay, today } from '../../../lib/dates'
import { inr } from '../../../lib/invoices'
import { useMe, useStore } from '../../../lib/store'
import type { GroupSession } from '../../../lib/types'

export const seatsTaken = (g: GroupSession) => g.participants.filter((p) => p.status !== 'cancelled').length

// Group therapy sessions (classes): back care, knee OA, pre/post-natal, seniors' balance…
export default function Groups() {
  const { physio } = useMe()
  const { db } = useStore()
  const nav = useNavigate()
  if (!physio) return null
  const t = today()
  const mine = db.groups.filter((g) => g.physioId === physio.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const upcoming = mine.filter((g) => g.date >= t && g.status === 'scheduled')
  const past = mine.filter((g) => g.date < t || g.status !== 'scheduled').reverse().slice(0, 12)

  return (
    <Page wide>
      <PageHeader
        title="Group sessions"
        subtitle="Classes with several patients at once"
        right={
          <Button size="sm" onClick={() => nav('/app/groups/new')}>
            <Plus size={16} /> New
          </Button>
        }
      />
      {mine.length === 0 ? (
        <Card>
          <Empty
            icon={<UsersRound size={20} />}
            title="No group sessions yet"
            body="Run a back-care, knee or pre-natal class for 6–10 people. Patients can join from your booking page."
            action={<Button size="md" onClick={() => nav('/app/groups/new')}>Create a group session</Button>}
          />
        </Card>
      ) : (
        <>
          <SectionTitle className="mt-0">Upcoming</SectionTitle>
          {upcoming.length === 0 && <p className="text-[14px] text-muted">Nothing scheduled.</p>}
          <div className="grid gap-3 lg:grid-cols-2">
            {upcoming.map((g) => (
              <GroupCard key={g.id} g={g} onClick={() => nav(`/app/groups/${g.id}`)} />
            ))}
          </div>
          {past.length > 0 && (
            <>
              <SectionTitle>Past & cancelled</SectionTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                {past.map((g) => (
                  <GroupCard key={g.id} g={g} onClick={() => nav(`/app/groups/${g.id}`)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
      <div className="h-6" />
    </Page>
  )
}

function GroupCard({ g, onClick }: { g: GroupSession; onClick: () => void }) {
  const n = seatsTaken(g)
  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold">{g.title}</div>
          <div className="text-[13px] text-muted">
            {relDay(g.date)} · {fmtTime(g.time)} · {g.minutes} min
          </div>
          <div className="truncate text-[13px] text-muted">{g.location}</div>
        </div>
        {g.status === 'cancelled' ? (
          <Badge tone="muted">Cancelled</Badge>
        ) : (
          <Badge tone={n >= g.capacity ? 'accent' : 'brand'}>
            {n}/{g.capacity} {n >= g.capacity ? 'full' : 'booked'}
          </Badge>
        )}
      </div>
      <div className="mt-2 text-[13px] text-muted">
        {g.fee ? `${inr(g.fee)} per person` : 'Free'}
        {g.seriesId ? ' · weekly' : ''}
        {g.publicBooking ? ' · open for booking' : ''}
      </div>
    </Card>
  )
}

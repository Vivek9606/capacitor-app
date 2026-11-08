import { Bell } from 'lucide-react'
import { Page } from '../../components/Shell'
import { Card, Empty, PageHeader } from '../../components/ui'
import { physioAlerts } from '../../lib/alerts'
import { useMe, useStore } from '../../lib/store'
import { AlertCard } from './AlertCard'

export default function Notifications() {
  const { physio } = useMe()
  const { db } = useStore()
  if (!physio) return null
  const alerts = physioAlerts(db, physio.id)
  return (
    <Page>
      <PageHeader title="Notifications" subtitle="Requests, replies and patients who need a nudge" />
      {alerts.length === 0 ? (
        <Card>
          <Empty icon={<Bell size={20} />} title="You’re all caught up" body="Booking requests, patient questions and missed sessions show up here." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}
    </Page>
  )
}

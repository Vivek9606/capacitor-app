import { useLocation, useNavigate } from 'react-router-dom'
import { BookingFlow } from '../../components/BookingFlow'
import { Page } from '../../components/Shell'
import { PageHeader } from '../../components/ui'
import { firstName } from '../../lib/logic'
import { haptic, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

// Patient · book a visit or a group class with their physio
export default function Book() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const groupId = (useLocation().state as { groupId?: string } | null)?.groupId
  if (!patient) return null
  const physio = store.db.physios.find((p) => p.id === patient.physioId)!
  const doc = `Dr. ${firstName(physio.name)}`
  return (
    <Page wide>
      <PageHeader title="Book" subtitle={`With ${physio.name}`} />
      <BookingFlow
        physio={physio}
        cal={store.db}
        known={{ name: patient.name, phone: patient.phone }}
        initialGroupId={groupId}
        onBook={(v) => {
          store.addBooking({
            physioId: physio.id,
            patientId: patient.id,
            patientName: patient.name,
            patientPhone: patient.phone,
            date: v.date,
            time: v.time,
            visitType: v.visitType,
            reason: v.reason || 'Follow-up',
            address: v.address,
            isNewPatient: false,
            status: 'requested',
            sendConfirmation: true,
            reminder: true,
            source: 'public_profile',
          })
          haptic('success')
          toast(`Request sent — ${doc} will confirm on WhatsApp`)
          nav('/me/appointments', { replace: true })
        }}
        onJoinGroup={(gid) => {
          store.addParticipant(gid, { patientId: patient.id, name: patient.name, phone: patient.phone })
          haptic('success')
          toast('Seat booked — see you there')
          nav('/me/appointments', { replace: true })
        }}
      />
      <div className="h-6" />
    </Page>
  )
}

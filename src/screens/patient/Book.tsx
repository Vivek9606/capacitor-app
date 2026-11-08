import { useNavigate } from 'react-router-dom'
import { BookingRequest } from '../../components/BookingRequest'
import { Page } from '../../components/Shell'
import { PageHeader } from '../../components/ui'
import { firstName } from '../../lib/logic'
import { haptic, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

// Patient · request a visit with their physio
export default function Book() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  if (!patient) return null
  const physio = store.db.physios.find((p) => p.id === patient.physioId)!
  return (
    <Page>
      <PageHeader title="Book a visit" subtitle={`With ${physio.name}`} />
      <BookingRequest
        physio={physio}
        known={{ name: patient.name, phone: patient.phone }}
        onSubmit={(v) => {
          store.addBooking({
            physioId: physio.id,
            patientId: patient.id,
            patientName: patient.name,
            patientPhone: patient.phone,
            date: v.date,
            time: v.time,
            visitType: 'in_clinic',
            reason: v.reason || 'Follow-up',
            isNewPatient: false,
            status: 'requested',
            sendConfirmation: true,
            reminder: true,
            source: 'public_profile',
          })
          haptic('success')
          toast(`Request sent — Dr. ${firstName(physio.name)} will confirm on WhatsApp`)
          nav('/me/appointments', { replace: true })
        }}
      />
    </Page>
  )
}

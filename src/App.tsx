import { AlertCircle, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { initNative, listenDeepLinks, registerToast } from './lib/platform'
import { StoreProvider, useMe } from './lib/store'
import Join from './screens/auth/Join'
import Otp from './screens/auth/Otp'
import Phone from './screens/auth/Phone'
import PlanLink from './screens/auth/PlanLink'
import Setup from './screens/auth/Setup'
import Welcome from './screens/auth/Welcome'
import Appointments from './screens/patient/Appointments'
import Ask from './screens/patient/Ask'
import Book from './screens/patient/Book'
import ConsentSign from './screens/patient/ConsentSign'
import PatientInvoice from './screens/patient/PatientInvoice'
import MyPlan from './screens/patient/MyPlan'
import PatientLayout from './screens/patient/PatientLayout'
import PatientProfile from './screens/patient/PatientProfile'
import RxView from './screens/patient/RxView'
import Session from './screens/patient/Session'
import Today from './screens/patient/Today'
import AddPatient from './screens/physio/AddPatient'
import Confirmed from './screens/physio/booking/Confirmed'
import NewBooking from './screens/physio/booking/NewBooking'
import Schedule from './screens/physio/booking/Schedule'
import Community from './screens/physio/Community'
import ConsentView from './screens/physio/consent/ConsentView'
import NewConsent from './screens/physio/consent/NewConsent'
import GroupDetail from './screens/physio/groups/GroupDetail'
import Groups from './screens/physio/groups/Groups'
import NewGroup from './screens/physio/groups/NewGroup'
import InvoiceView from './screens/physio/invoices/InvoiceView'
import Invoices from './screens/physio/invoices/Invoices'
import NewInvoice from './screens/physio/invoices/NewInvoice'
import Learn from './screens/physio/learn/Learn'
import Lesson from './screens/physio/learn/Lesson'
import WalkIn from './screens/physio/WalkIn'
import Availability from './screens/physio/profile/Availability'
import Partner from './screens/physio/growth/Partner'
import Refer from './screens/physio/growth/Refer'
import Home from './screens/physio/Home'
import Notifications from './screens/physio/Notifications'
import PatientDetail from './screens/physio/PatientDetail'
import Patients from './screens/physio/Patients'
import PhysioLayout from './screens/physio/PhysioLayout'
import Build from './screens/physio/plan/Build'
import Preview from './screens/physio/plan/Preview'
import RxNotes from './screens/physio/plan/RxNotes'
import Tracking from './screens/physio/plan/Tracking'
import Clinic from './screens/physio/profile/Clinic'
import EditProfile from './screens/physio/profile/EditProfile'
import Profile from './screens/physio/profile/Profile'
import PublicBook from './screens/public/PublicBook'
import PublicProfile from './screens/public/PublicProfile'

function RootRedirect() {
  const { session, physio, patient } = useMe()
  if (!session) return <Navigate to="/welcome" replace />
  if (physio) return <Navigate to="/app" replace />
  if (patient) return <Navigate to="/me" replace />
  return <Navigate to="/welcome" replace />
}

/** Logged-in users skip the welcome/login screens. */
function GuestOnly({ children }: { children: React.ReactElement }) {
  const { physio, patient } = useMe()
  if (physio) return <Navigate to="/app" replace />
  if (patient) return <Navigate to="/me" replace />
  return children
}

function NativeBridge() {
  const nav = useNavigate()
  useEffect(() => {
    initNative()
    listenDeepLinks((path) => nav(path))
  }, [nav])
  return null
}

function Toaster() {
  const [msg, setMsg] = useState<{ text: string; id: number }>()
  useEffect(() => {
    registerToast((text) => setMsg({ text, id: Date.now() }))
  }, [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(undefined), 2800)
    return () => clearTimeout(t)
  }, [msg])
  if (!msg) return null
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(104px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-5 lg:bottom-8">
      <div
        key={msg.id}
        role="status"
        className="anim-toast flex max-w-[440px] items-center gap-2.5 rounded-2xl bg-ink/92 py-3 pl-3 pr-4 text-[14px] font-semibold text-white shadow-float backdrop-blur-md"
      >
        {/couldn|can.t|failed|error|expired|invalid|wrong|not /i.test(msg.text) ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/25 text-[#ffa27f]">
            <AlertCircle size={14} strokeWidth={2.6} />
          </span>
        ) : (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok/30 text-[#7fe0a9]">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        {msg.text}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <NativeBridge />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/welcome" element={<GuestOnly><Welcome /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><Phone /></GuestOnly>} />
          <Route path="/login/verify" element={<Otp />} />
          <Route path="/setup" element={<Setup />} />

          {/* Public, no login: WhatsApp links land here */}
          <Route path="/plan/:token" element={<PlanLink />} />
          <Route path="/dr/:slug" element={<PublicProfile />} />
          <Route path="/dr/:slug/book" element={<PublicBook />} />
          <Route path="/join" element={<Join />} />

          {/* Physio */}
          <Route path="/app" element={<PhysioLayout />}>
            <Route index element={<Home />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/new" element={<AddPatient />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="patients/:id/consent" element={<NewConsent />} />
            <Route path="consents/:id" element={<ConsentView />} />
            <Route path="walk-in" element={<WalkIn />} />
            <Route path="groups" element={<Groups />} />
            <Route path="groups/new" element={<NewGroup />} />
            <Route path="groups/:id" element={<GroupDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<NewInvoice />} />
            <Route path="invoices/:id" element={<InvoiceView />} />
            <Route path="learn" element={<Learn />} />
            <Route path="learn/:id" element={<Lesson />} />
            <Route path="profile/availability" element={<Availability />} />
            <Route path="plan/build" element={<Build />} />
            <Route path="plan/rx" element={<RxNotes />} />
            <Route path="plan/preview" element={<Preview />} />
            <Route path="plans/:id" element={<Tracking />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="bookings/new" element={<NewBooking />} />
            <Route path="bookings/:id/confirmed" element={<Confirmed />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/edit" element={<EditProfile />} />
            <Route path="profile/clinic" element={<Clinic />} />
            <Route path="refer" element={<Refer />} />
            <Route path="partner" element={<Partner />} />
            <Route path="community" element={<Community />} />
          </Route>

          {/* Patient */}
          <Route path="/me" element={<PatientLayout />}>
            <Route index element={<Today />} />
            <Route path="session" element={<Session />} />
            <Route path="plan" element={<MyPlan />} />
            <Route path="rx/:id" element={<RxView />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="book" element={<Book />} />
            <Route path="ask" element={<Ask />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="consents/:id" element={<ConsentSign />} />
            <Route path="invoices/:id" element={<PatientInvoice />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </StoreProvider>
  )
}

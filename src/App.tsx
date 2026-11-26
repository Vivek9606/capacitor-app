import { AlertCircle, Check } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { takeHandoff } from './lib/handoff'
import { initNative, listenDeepLinks, registerToast, toast } from './lib/platform'
import { enablePush, listenPushTaps } from './lib/push'
import { StoreProvider, useMe, useStore } from './lib/store'
import Admin from './screens/admin/Admin'
import Join from './screens/auth/Join'
import Otp from './screens/auth/Otp'
import Phone from './screens/auth/Phone'
import PatientSignup from './screens/auth/PatientSignup'
import PlanLink from './screens/auth/PlanLink'
import RoleChoice from './screens/auth/RoleChoice'
import Setup from './screens/auth/Setup'
import Welcome from './screens/auth/Welcome'
import Appointments from './screens/patient/Appointments'
import Ask from './screens/patient/Ask'
import PainChat from './screens/patient/PainChat'
import AssessPick from './screens/patient/assess/AssessPick'
import AssessResult from './screens/patient/assess/AssessResult'
import AssessRun from './screens/patient/assess/AssessRun'
import Care from './screens/patient/CareHub'
import Diagnostics from './screens/patient/Diagnostics'
import LearnHub from './screens/patient/LearnHub'
import Product from './screens/patient/Product'
import Shop from './screens/patient/Shop'
import Tools from './screens/patient/Tools'
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
import Community, { CommunityChannel, CommunityThread } from './screens/physio/Community'
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
import PhysioTools from './screens/physio/Tools'
import Notifications from './screens/physio/Notifications'
import PatientDetail from './screens/physio/PatientDetail'
import Patients from './screens/physio/Patients'
import PhysioLayout from './screens/physio/PhysioLayout'
import Build from './screens/physio/plan/Build'
import Preview from './screens/physio/plan/Preview'
import RxNotes, { Consult } from './screens/physio/plan/RxNotes'
import Tracking from './screens/physio/plan/Tracking'
import Clinic from './screens/physio/profile/Clinic'
import EditProfile from './screens/physio/profile/EditProfile'
import Profile from './screens/physio/profile/Profile'
import PublicBook from './screens/public/PublicBook'
import PublicProfile from './screens/public/PublicProfile'
import WebPage from './screens/WebPage'
import DirectoryListing from './screens/physio/profile/DirectoryListing'

// Loaded only when someone joins a call (keeps the video SDK out of the main bundle).
const Call = lazy(() => import('./screens/call/Call'))

/** Old route names (/app = physio, /me = consumer) still arrive from website links, bookmarks and deep links. */
function renameLegacyPath(path: string) {
  return path.replace(/^\/app(?=[/?#]|$)/, '/physio-dashboard').replace(/^\/me(?=[/?#]|$)/, '/consumer-dashboard')
}

function LegacyRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={renameLegacyPath(pathname) + search + hash} replace />
}

function RootRedirect() {
  const { session, physio, patient } = useMe()
  if (!session) return <Navigate to="/welcome" replace />
  if (physio) return <Navigate to="/physio-dashboard" replace />
  if (patient) return <Navigate to="/consumer-dashboard" replace />
  return <Navigate to="/welcome" replace />
}

/** Logged-in users skip the welcome/login screens. */
function GuestOnly({ children }: { children: React.ReactElement }) {
  const { physio, patient } = useMe()
  if (physio) return <Navigate to="/physio-dashboard" replace />
  if (patient) return <Navigate to="/consumer-dashboard" replace />
  return children
}

function NativeBridge() {
  const nav = useNavigate()
  const token = useStore().session?.token
  // Signed in (now, or still from last time): this device gets push notifications for that account.
  useEffect(() => {
    if (token) enablePush(token)
  }, [token])
  useEffect(() => {
    initNative()
    listenDeepLinks((path) => nav(renameLegacyPath(path)))
    listenPushTaps((path) => nav(renameLegacyPath(path)))
  }, [nav])
  return null
}

/** Arriving from betterhood.in signed in (#handoff=…): sign in as that account, then open the page it asked for. */
function HandoffGate() {
  const store = useStore()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const h = takeHandoff()
    if (!h || !store.apiMode) return
    setBusy(true)
    store
      .redeemHandoff(h.code)
      .then((role) => {
        const want = h.path && !/^\/(welcome|login)?\/?$/.test(h.path) ? renameLegacyPath(h.path) : '/'
        // a physio link for a consumer account (or the other way round) lands on their own home
        nav(role === 'physio' ? (want.startsWith('/physio-dashboard') ? want : '/physio-dashboard') : want.startsWith('/consumer-dashboard') ? want : '/consumer-dashboard', { replace: true })
      })
      .catch(() => toast('That sign-in link has expired. Please log in with your number.'))
      .finally(() => setBusy(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!busy) return null
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-bg/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 text-[15px] font-semibold text-muted">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-line border-t-brand" />
        Signing you in…
      </div>
    </div>
  )
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
        <HandoffGate />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/welcome" element={<GuestOnly><Welcome /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><Phone /></GuestOnly>} />
          <Route path="/login/verify" element={<Otp />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/start" element={<RoleChoice />} />
          <Route path="/signup/patient" element={<PatientSignup />} />
          {/* Web-only admin dashboard */}
          <Route path="/admin" element={<Admin />} />

          {/* Public, no login: WhatsApp links land here */}
          <Route path="/plan/:token" element={<PlanLink />} />
          <Route path="/dr/:slug" element={<PublicProfile />} />
          <Route path="/dr/:slug/book" element={<PublicBook />} />
          <Route path="/join" element={<Join />} />

          {/* betterhood.in pages shown inside the app (shared flows live on the website) */}
          <Route path="/web" element={<WebPage />} />

          {/* Video consult (physio and patient) */}
          <Route path="/call/:id" element={<Suspense fallback={<div className="fixed inset-0 bg-scrim" />}><Call /></Suspense>} />

          {/* Physio */}
          <Route path="/physio-dashboard" element={<PhysioLayout />}>
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
            <Route path="plan/consult" element={<Consult />} />
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
            <Route path="profile/directory" element={<DirectoryListing />} />
            <Route path="refer" element={<Refer />} />
            <Route path="partner" element={<Partner />} />
            <Route path="community" element={<Community />} />
            <Route path="community/c/:id" element={<CommunityChannel />} />
            <Route path="community/t/:postId" element={<CommunityThread />} />
            <Route path="tools" element={<PhysioTools />} />
          </Route>

          {/* Patient */}
          <Route path="/consumer-dashboard" element={<PatientLayout />}>
            <Route index element={<Today />} />
            <Route path="session" element={<Session />} />
            <Route path="plan" element={<MyPlan />} />
            <Route path="rx/:id" element={<RxView />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="book" element={<Book />} />
            <Route path="ask" element={<Ask />} />
            <Route path="chat" element={<PainChat />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="care" element={<Care />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/:handle" element={<Product />} />
            <Route path="learn" element={<LearnHub />} />
            <Route path="tools" element={<Tools />} />
            <Route path="diagnostics" element={<Diagnostics />} />
            <Route path="explore" element={<Navigate to="/consumer-dashboard/shop" replace />} />
            <Route path="assess" element={<AssessPick />} />
            <Route path="assess/result/:id" element={<AssessResult />} />
            <Route path="assess/:slug" element={<AssessRun />} />
            <Route path="consents/:id" element={<ConsentSign />} />
            <Route path="invoices/:id" element={<PatientInvoice />} />
          </Route>

          {/* Old route names */}
          <Route path="/app/*" element={<LegacyRedirect />} />
          <Route path="/me/*" element={<LegacyRedirect />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </StoreProvider>
  )
}

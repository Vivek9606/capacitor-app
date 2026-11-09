import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileSignature,
  Footprints,
  Gift,
  GraduationCap,
  Handshake,
  House,
  MessageSquare,
  ReceiptIndianRupee,
  User,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Shell, type NavItem } from '../../components/Shell'
import { Badge, IconTile, Sheet } from '../../components/ui'
import { useMe } from '../../lib/store'

const ITEMS: NavItem[] = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/app/patients', label: 'Patients', icon: Users },
  { to: '/app/groups', label: 'Group sessions', icon: UsersRound, mobile: false },
  { to: '/app/invoices', label: 'Invoices', icon: ReceiptIndianRupee, mobile: false },
  { to: '/app/learn', label: 'Learn', icon: GraduationCap, mobile: false },
  { to: '/app/community', label: 'Community', icon: MessageSquare, soon: true, mobile: false },
  { to: '/app/profile', label: 'Profile', icon: User },
]
const EXTRA: NavItem[] = [
  { to: '/app/refer', label: 'Refer a physio', icon: Gift },
  { to: '/app/partner', label: 'Partner with us', icon: Handshake },
]

// Full-screen flows hide the phone tab bar.
const FLOW = [
  /^\/app\/plan\//,
  /^\/app\/bookings\//,
  /^\/app\/profile\/(clinic|edit|availability)/,
  /^\/app\/patients\/new/,
  /^\/app\/patients\/[^/]+\/consent/,
  /^\/app\/consents\//,
  /^\/app\/walk-in/,
  /^\/app\/groups\/new/,
  /^\/app\/invoices\/new/,
  /^\/app\/learn\/.+/,
  /^\/app\/refer/,
  /^\/app\/partner/,
  /^\/app\/notifications/,
]

export default function PhysioLayout() {
  const { physio, session } = useMe()
  if (!session) return <Navigate to="/welcome" replace />
  if (!physio) return <Navigate to="/me" replace />
  return (
    <Shell
      items={ITEMS}
      extraItems={EXTRA}
      tag="for Physios"
      hideTabsOn={(p) => FLOW.some((r) => r.test(p))}
      user={{ name: physio.name, sub: physio.qualification ?? 'Physiotherapist', photo: physio.photo }}
      createSheet={(open, close) => <CreateSheet open={open} onClose={close} />}
    />
  )
}

// H2 · Create sheet
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const go = (to: string, state?: unknown) => {
    onClose()
    nav(to, { state })
  }
  const rows = [
    {
      icon: <Activity size={20} />,
      title: 'Care plan + treatment plan',
      badge: 'Recommended',
      sub: 'Exercises, diagnosis and advice — sent on WhatsApp',
      on: () => go('/app/patients', { pick: 'plan' }),
    },
    { icon: <ClipboardList size={20} />, title: 'Treatment plan only', sub: 'Diagnosis, advice and follow-up in one message', on: () => go('/app/patients', { pick: 'rx' }) },
    { icon: <Footprints size={20} />, title: 'Walk-in', sub: 'Patient is at the clinic now — check them in', on: () => go('/app/walk-in') },
    { icon: <CalendarDays size={20} />, title: 'New booking', sub: 'Pick a slot — patient gets a WhatsApp confirmation', on: () => go('/app/bookings/new') },
    { icon: <UsersRound size={20} />, title: 'Group session', sub: 'Classes like back care or pre-natal, with seats', on: () => go('/app/groups/new') },
    { icon: <ReceiptIndianRupee size={20} />, title: 'Invoice', sub: 'Bill a visit and send it on WhatsApp with UPI', on: () => go('/app/invoices/new') },
    { icon: <FileSignature size={20} />, title: 'Consent form', sub: 'Patient signs in clinic or on their phone', on: () => go('/app/patients', { pick: 'consent' }) },
    { icon: <UserPlus size={20} />, title: 'Add patient', sub: 'Name + mobile. Everything else can wait', on: () => go('/app/patients/new') },
  ]
  return (
    <Sheet open={open} onClose={onClose} title="Create">
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <button
            key={r.title}
            onClick={r.on}
            className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3 text-left hover:border-brand-line cursor-pointer"
          >
            <IconTile>{r.icon}</IconTile>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[15px] font-semibold">
                {r.title}
                {r.badge && <Badge tone="accent">{r.badge}</Badge>}
              </div>
              <div className="mt-0.5 text-[13px] leading-snug text-muted">{r.sub}</div>
            </div>
            <ChevronRight size={18} className="text-muted" />
          </button>
        ))}
      </div>
    </Sheet>
  )
}

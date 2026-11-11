import {
  Activity,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileSignature,
  Footprints,
  Gift,
  Globe,
  GraduationCap,
  Handshake,
  MessageSquare,
  ReceiptIndianRupee,
  Repeat,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Badge, Card, PageHeader, SectionTitle, SoonBadge } from '../../components/ui'
import { useSwitchProfile } from '../../lib/switchProfile'

interface PTool {
  label: string
  sub: string
  icon: ReactNode
  to: string
  state?: unknown
  soon?: boolean
}

/** Every physio tool in one place, grouped by what the physio is trying to do. */
const GROUPS: { title: string; sub: string; tools: PTool[] }[] = [
  {
    title: 'Treat patients',
    sub: 'Consult, plan, consent',
    tools: [
      { label: 'Care plan', sub: 'Consultation → treatment plan → home exercises', icon: <Activity size={19} />, to: '/app/patients', state: { pick: 'plan' } },
      { label: 'Treatment plan only', sub: 'Diagnosis, advice and follow-up', icon: <ClipboardList size={19} />, to: '/app/patients', state: { pick: 'rx' } },
      { label: 'Consent forms', sub: 'Signed in clinic or on the patient’s phone', icon: <FileSignature size={19} />, to: '/app/patients', state: { pick: 'consent' } },
      { label: 'Add patient', sub: 'Name and mobile, the rest can wait', icon: <UserPlus size={19} />, to: '/app/patients/new' },
    ],
  },
  {
    title: 'Run your day',
    sub: 'Calendar and visits',
    tools: [
      { label: 'Schedule', sub: 'Today, the week, requests', icon: <CalendarDays size={19} />, to: '/app/schedule' },
      { label: 'New booking', sub: 'Patient gets a WhatsApp confirmation', icon: <CalendarClock size={19} />, to: '/app/bookings/new' },
      { label: 'Walk-in', sub: 'Check in someone at the clinic now', icon: <Footprints size={19} />, to: '/app/walk-in' },
      { label: 'Group sessions', sub: 'Classes with seats, one-off or weekly', icon: <UsersRound size={19} />, to: '/app/groups' },
      { label: 'Availability', sub: 'Hours, slots and booking rules', icon: <Repeat size={19} />, to: '/app/profile/availability' },
    ],
  },
  {
    title: 'Get paid',
    sub: 'Billing',
    tools: [{ label: 'Invoices', sub: 'Bill visits and send with UPI on WhatsApp', icon: <ReceiptIndianRupee size={19} />, to: '/app/invoices' }],
  },
  {
    title: 'Grow your practice',
    sub: 'Get found, get referrals',
    tools: [
      { label: 'betterhood.in directory', sub: 'Your public profile on the website', icon: <Globe size={19} />, to: '/app/profile/directory' },
      { label: 'Refer a physio', sub: 'Invite colleagues to betterhood', icon: <Gift size={19} />, to: '/app/refer' },
      { label: 'Partner with us', sub: 'Brands, clinics and programmes', icon: <Handshake size={19} />, to: '/app/partner' },
      { label: 'Community', sub: 'Physios helping physios', icon: <MessageSquare size={19} />, to: '/app/community', soon: true },
    ],
  },
  {
    title: 'Learn',
    sub: 'Business skills',
    tools: [{ label: 'PhysioPreneurship course', sub: 'Short lessons on running a practice', icon: <GraduationCap size={19} />, to: '/app/learn' }],
  },
]

// Physio · Tools
export default function PhysioTools() {
  const nav = useNavigate()
  const switchProfile = useSwitchProfile()
  return (
    <Page wide>
      <PageHeader back={false} title="Tools" subtitle="Everything in one place, by what you’re doing" />
      {GROUPS.map((g) => (
        <section key={g.title}>
          <SectionTitle right={<span className="text-[12px] text-muted">{g.sub}</span>}>{g.title}</SectionTitle>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {g.tools.map((t) => (
              <Card key={t.label} className="flex items-center gap-3 p-4" onClick={() => nav(t.to, { state: t.state })}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-brand-soft text-brand">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[15px] font-semibold">
                    {t.label}
                    {t.soon && <SoonBadge />}
                  </div>
                  <div className="truncate text-[13px] text-muted">{t.sub}</div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-faint" />
              </Card>
            ))}
          </div>
        </section>
      ))}
      <SectionTitle>Your account</SectionTitle>
      <Card className="flex items-center gap-3 p-4" onClick={() => switchProfile('patient')}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-lime text-lime-ink">
          <Repeat size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Switch to consumer profile</div>
          <div className="truncate text-[13px] text-muted">Use betterhood for your own health, same number</div>
        </div>
        <Badge tone="muted">Switch</Badge>
      </Card>
      <div className="h-8" />
    </Page>
  )
}

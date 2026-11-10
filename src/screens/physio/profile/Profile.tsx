import { Briefcase, CalendarClock, Camera, Check, ChevronRight, Copy, ExternalLink, Gift, GraduationCap, Handshake, LogOut, MessageSquare, Pencil, ReceiptIndianRupee, RotateCcw, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Avatar, Badge, Card, cx, IconButton, Progress, RefreshButton, WhatsAppButton } from '../../../components/ui'
import { courseProgress } from '../../../lib/course'
import { profileCompletion } from '../../../lib/logic'
import { modeLabels, modesOf } from '../../../lib/practice'
import { copyText, isNative, pickPhoto, publicUrl, shareLink, toast, WEB_HOST } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'

// P1 · My profile
export default function Profile() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  if (!physio) return null
  const prof = profileCompletion(physio)
  const path = `/dr/${physio.slug}/book`
  const url = publicUrl(path)
  const meta = [physio.qualification, physio.experienceYrs ? `${physio.experienceYrs} yrs` : undefined, physio.clinic?.area].filter(Boolean).join(' · ')
  const course = courseProgress(physio.courseProgress)

  const changePhoto = async () => {
    const photo = await pickPhoto()
    if (photo) {
      store.updatePhysio(physio.id, { photo })
      toast('Profile photo updated')
    }
  }

  return (
    <Page wide>
      <div className="flex items-center justify-between pb-4">
        <h1 className="font-display text-[20px] font-bold lg:text-[28px]">My profile</h1>
        <div className="flex gap-2">
          <RefreshButton />
          <IconButton aria-label="Edit profile" onClick={() => nav('/app/profile/edit')}>
            <Pencil size={17} />
          </IconButton>
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-3">
          <Card className="flex items-center gap-4 p-4">
            <button onClick={changePhoto} className="relative cursor-pointer" aria-label="Change profile photo">
              <Avatar name={physio.name} photo={physio.photo} size={64} />
              <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-brand text-white">
                <Camera size={12} />
              </span>
            </button>
            <div className="min-w-0">
              <div className="font-display text-[18px] font-bold">{physio.name}, PT</div>
              {meta && <div className="text-[13px] text-muted">{meta}</div>}
              <div className="mt-1.5">
                {physio.verification === 'verified' ? (
                  <Badge tone="brand" icon={<Check size={12} strokeWidth={3} />}>
                    Verified
                  </Badge>
                ) : physio.verification === 'pending' ? (
                  <Badge tone="accent">Verification pending</Badge>
                ) : (
                  <Badge tone="muted">Not verified</Badge>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-[16px] font-semibold">Profile strength</div>
              <div className="text-[16px] font-semibold text-brand">{prof.pct}%</div>
            </div>
            <Progress value={prof.pct} className="mt-3" />
            <div className="mt-3 flex flex-col">
              {prof.steps.map((s) => (
                <button key={s.key} onClick={() => !s.done && nav(s.to)} className={cx('flex items-center gap-3 py-2 text-left', !s.done && 'cursor-pointer')}>
                  <span className={cx('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full', s.done ? 'bg-ok text-white' : 'border-2 border-line')}>
                    {s.done && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-[15px]">{s.label}</span>
                  <span className={cx('text-[13px]', s.done ? 'text-muted' : 'font-semibold text-accent')}>{s.done ? 'Done' : 'Add'}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:mt-0">
          <div className="rounded-2xl bg-brand-soft p-4">
            <div className="text-[16px] font-semibold">Your booking page</div>
            <p className="mt-1 text-[13px] text-muted">Patients pick a visit type, day and open time — like Calendly. Put it in your WhatsApp and Instagram bio.</p>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3.5 py-3">
              <span className="truncate text-[14px] font-semibold text-brand">{WEB_HOST}{path}</span>
              <button aria-label="Copy link" className="text-muted hover:text-ink cursor-pointer" onClick={() => copyText(url, 'Profile link copied')}>
                <Copy size={17} />
              </button>
            </div>
            <WhatsAppButton
              block
              className="mt-3"
              onClick={() => shareLink({ title: physio.name, text: `Book a physiotherapy session with ${physio.name} — pick a time that suits you:`, url })}
            >
              Share on WhatsApp
            </WhatsAppButton>
            <button onClick={() => nav(`/dr/${physio.slug}`)} className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-[14px] font-semibold text-brand cursor-pointer">
              <ExternalLink size={15} /> See what patients see
            </button>
          </div>

          <Card className="divide-y divide-line">
            {[
              { icon: <Briefcase size={18} />, label: 'Practice setup', sub: modeLabels(modesOf(physio)).join(' · '), to: '/app/profile/clinic' },
              { icon: <CalendarClock size={18} />, label: 'Availability', sub: 'Weekly hours, breaks and booking rules', to: '/app/profile/availability' },
              { icon: <UsersRound size={18} />, label: 'Group sessions', to: '/app/groups' },
              { icon: <ReceiptIndianRupee size={18} />, label: 'Invoices & billing', to: '/app/invoices' },
              { icon: <GraduationCap size={18} />, label: 'PhysioPreneurship course', sub: `${course.done} of ${course.total} lessons`, to: '/app/learn' },
              { icon: <MessageSquare size={18} />, label: 'Community', to: '/app/community' },
              { icon: <Gift size={18} />, label: 'Refer a physio', to: '/app/refer' },
              { icon: <Handshake size={18} />, label: 'Partner with Betterhood', to: '/app/partner' },
            ].map((r) => (
              <button key={r.to} onClick={() => nav(r.to)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] cursor-pointer">
                <span className="text-brand">{r.icon}</span>
                <span className="min-w-0 flex-1">
                  {r.label}
                  {r.sub && <span className="block truncate text-[12px] text-muted">{r.sub}</span>}
                </span>
                <ChevronRight size={17} className="text-muted" />
              </button>
            ))}
            {!store.apiMode && (<button
              onClick={() => {
                store.resetDemo()
                nav('/welcome')
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] cursor-pointer"
            >
              <RotateCcw size={18} className="text-muted" />
              <span className="flex-1">Reset demo data</span>
            </button>)}
            <button
              onClick={() => {
                store.logout()
                nav('/welcome')
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] text-danger cursor-pointer"
            >
              <LogOut size={18} />
              <span className="flex-1">Log out</span>
            </button>
          </Card>
          <p className="pb-6 text-center text-[12px] text-faint">Betterhood 0.1 · {isNative ? 'App' : 'Web'}</p>
        </div>
      </div>
    </Page>
  )
}

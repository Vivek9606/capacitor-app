import { ChevronRight, ClipboardCheck, ExternalLink, LogOut, MessageCircle, MessageSquare, RotateCcw, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Avatar, Badge, Card, PageHeader, SectionTitle } from '../../components/ui'
import { patientView } from '../../lib/patientData'
import { fmtShort } from '../../lib/dates'
import { firstName, fmtPhone } from '../../lib/logic'
import { isNative, openWhatsApp, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

const CONSENT_TONE = { pending: 'accent', signed: 'ok', declined: 'muted', revoked: 'muted' } as const
const CONSENT_LABEL = { pending: 'To sign', signed: 'Signed', declined: 'Declined', revoked: 'Withdrawn' } as const

// Patient · Profile
export default function PatientProfile() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  if (!patient) return null
  const physio = patient.physioId ? store.db.physios.find((p) => p.id === patient.physioId) : undefined
  const doc = physio ? `Dr. ${firstName(physio.name)}` : 'your physio'
  const consents = physio ? patientView(store.db, patient).consents : []
  const assessments = store.db.assessments.filter((a) => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Page>
      <PageHeader back={false} title="Profile" />
      <Card className="flex items-center gap-4 p-4">
        <Avatar name={patient.name} size={56} />
        <div>
          <div className="font-display text-[18px] font-bold">{patient.name}</div>
          <div className="text-[13px] text-muted">
            {[patient.age, patient.sex, patient.city, fmtPhone(patient.phone)].filter(Boolean).join(' · ')}
          </div>
        </div>
      </Card>

      {physio && (<>
      <SectionTitle>My physio</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={physio.name} photo={physio.photo} size={48} />
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold">{physio.name}, PT</div>
            <div className="truncate text-[13px] text-muted">{[physio.qualification, physio.clinic?.name].filter(Boolean).join(' · ') || 'Physiotherapist'}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[13px] font-semibold">
          <button onClick={() => nav('/me/ask')} className="flex flex-col items-center gap-1 rounded-xl bg-bg py-3 text-brand cursor-pointer">
            <MessageSquare size={18} /> Ask
          </button>
          <button onClick={() => openWhatsApp(physio.phone, `Hi ${doc}, `)} className="flex flex-col items-center gap-1 rounded-xl bg-bg py-3 text-wa cursor-pointer">
            <MessageCircle size={18} /> WhatsApp
          </button>
          <button onClick={() => nav(`/dr/${physio.slug}`)} className="flex flex-col items-center gap-1 rounded-xl bg-bg py-3 text-brand cursor-pointer">
            <ExternalLink size={18} /> Profile
          </button>
        </div>
      </Card>
      </>)}

      <SectionTitle right={<button onClick={() => nav('/me/assess')} className="text-[13px] font-semibold text-brand cursor-pointer">New</button>}>My assessments</SectionTitle>
      {assessments.length === 0 ? (
        <Card className="flex items-center gap-3 p-4" onClick={() => nav('/me/assess')}>
          <ClipboardCheck size={19} className="shrink-0 text-brand" />
          <span className="flex-1 text-[14px]">Take a 5-minute pain assessment</span>
          <ChevronRight size={17} className="text-muted" />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {assessments.map((a) => (
            <button key={a.id} onClick={() => nav(`/me/assess/result/${a.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{a.title}</div>
                <div className="text-[13px] text-muted">{a.condition ?? 'Result'} · {fmtShort(a.createdAt.slice(0, 10))}</div>
              </div>
              <ChevronRight size={17} className="text-muted" />
            </button>
          ))}
        </Card>
      )}

      {consents.length > 0 && (
        <>
          <SectionTitle>Consent forms</SectionTitle>
          <Card className="divide-y divide-line">
            {consents.map((c) => (
              <button key={c.id} onClick={() => nav(`/me/consents/${c.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{c.title}</div>
                  <div className="text-[13px] text-muted">{fmtShort((c.signedAt ?? c.requestedAt).slice(0, 10))}</div>
                </div>
                <Badge tone={CONSENT_TONE[c.status]}>{CONSENT_LABEL[c.status]}</Badge>
                <ChevronRight size={17} className="text-muted" />
              </button>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Privacy</SectionTitle>
      <Card className="divide-y divide-line">
        <div className="flex items-start gap-3 p-4">
          <ShieldCheck size={19} className="mt-0.5 shrink-0 text-brand" />
          <div className="flex-1 text-[14px]">
            <div className="font-semibold">{physio ? `Sharing progress with ${doc}` : 'Your health details'}</div>
            <div className="text-muted">
              {physio
                ? `Consent given ${patient.consentAt ? fmtShort(patient.consentAt.slice(0, 10)) : '—'}. Only you and your physio see your health details.`
                : 'Your assessment answers are used only to match you with a physio. Only Betterhood’s care team and your physio see them.'}
            </div>
          </div>
        </div>
        <button
          onClick={() => toast('Phase 2: withdraw consent & export/delete my data (DPDP Act)')}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] cursor-pointer"
        >
          <span className="flex-1">Manage my data</span>
          <ChevronRight size={17} className="text-muted" />
        </button>
      </Card>

      <Card className="mt-3 divide-y divide-line">
        {!store.apiMode && (<button
          onClick={() => {
                store.resetDemo()
            nav('/welcome')
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] cursor-pointer"
        >
          <RotateCcw size={18} className="text-muted" /> Reset demo data
        </button>)}
        <button
          onClick={() => {
            store.logout()
            nav('/welcome')
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] text-danger cursor-pointer"
        >
          <LogOut size={18} /> Log out
        </button>
      </Card>
      <p className="py-6 text-center text-[12px] text-faint">Betterhood 0.1 · {isNative ? 'App' : 'Web'}</p>
    </Page>
  )
}

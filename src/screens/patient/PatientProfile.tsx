import { ChevronRight, ClipboardCheck, Pencil, ExternalLink, Globe, LogOut, MessageCircle, MessageSquare, Repeat, RotateCcw, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { useState } from 'react'
import { Avatar, Badge, Button, Card, Input, PageHeader, SectionTitle, Toggle } from '../../components/ui'
import { consent, WORDING } from '../../lib/consent'
import { patientView } from '../../lib/patientData'
import { fmtShort } from '../../lib/dates'
import { firstName, fmtPhone } from '../../lib/logic'
import { openWebsiteSignedIn } from '../../lib/handoff'
import { isNative, openInApp, openWhatsApp, toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import { useSwitchProfile } from '../../lib/switchProfile'

const CONSENT_TONE = { pending: 'accent', signed: 'ok', declined: 'muted', revoked: 'muted' } as const
const CONSENT_LABEL = { pending: 'To sign', signed: 'Signed', declined: 'Declined', revoked: 'Withdrawn' } as const

// Patient · Profile
export default function PatientProfile() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const switchProfile = useSwitchProfile()
  if (!patient) return null
  const physio = patient.physioId ? store.db.physios.find((p) => p.id === patient.physioId) : undefined
  const doc = physio ? `Dr. ${firstName(physio.name)}` : 'your physio'
  const consents = physio ? patientView(store.db, patient).consents : []
  const assessments = store.db.assessments.filter((a) => a.patientId === patient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Page>
      <PageHeader back={false} title="Profile" />
      <MyDetails />

      <SectionTitle>Settings</SectionTitle>
      <Card className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1 text-[15px]">
          WhatsApp updates
          <div className="text-[13px] text-muted">Appointment reminders and messages from your physio</div>
        </div>
        <Toggle
          checked={!!patient.whatsappOptIn}
          onChange={(v) => {
            store.recordConsents([consent('whatsapp_updates', v, WORDING.whatsapp)])
            toast(v ? 'You’ll get updates on WhatsApp' : 'WhatsApp updates turned off')
          }}
          label="Appointment and care updates on WhatsApp"
        />
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
          <button onClick={() => nav('/consumer-dashboard/ask')} className="flex flex-col items-center gap-1 rounded-xl bg-bg py-3 text-brand cursor-pointer">
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

      <SectionTitle right={<button onClick={() => nav('/consumer-dashboard/assess')} className="text-[13px] font-semibold text-brand cursor-pointer">New</button>}>My assessments</SectionTitle>
      {assessments.length === 0 ? (
        <Card className="flex items-center gap-3 p-4" onClick={() => nav('/consumer-dashboard/assess')}>
          <ClipboardCheck size={19} className="shrink-0 text-brand" />
          <span className="flex-1 text-[14px]">Take a 5-minute pain assessment</span>
          <ChevronRight size={17} className="text-muted" />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {assessments.map((a) => (
            <button key={a.id} onClick={() => nav(`/consumer-dashboard/assess/result/${a.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer">
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
              <button key={c.id} onClick={() => nav(`/consumer-dashboard/consents/${c.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer">
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
                ? `Consent given ${patient.consentAt ? fmtShort(patient.consentAt.slice(0, 10)) : '-'}. Only you and your physio see your health details.`
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
          onClick={() => openWebsiteSignedIn(() => store.websiteLink('/account/'), isNative, openInApp)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] cursor-pointer"
        >
          <Globe size={18} className="text-brand" />
          <span className="min-w-0 flex-1">
            Open betterhood.in
            <span className="block truncate text-[12px] text-muted">Already signed in: assessments, Slouch Catcher, betterYou corner</span>
          </span>
          <ExternalLink size={16} className="text-muted" />
        </button>
        <button onClick={() => switchProfile('physio')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] cursor-pointer">
          <Repeat size={18} className="text-brand" />
          <span className="min-w-0 flex-1">
            Switch to physio profile
            <span className="block truncate text-[12px] text-muted">For physiotherapists · same number</span>
          </span>
          <ChevronRight size={17} className="text-muted" />
        </button>
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

const SEX = [
  { v: 'F', label: 'Female' },
  { v: 'M', label: 'Male' },
  { v: 'O', label: 'Other' },
] as const

/** Name, age, sex and city, editable by the patient. The phone number is the login, so it isn't editable here. */
function MyDetails() {
  const { patient } = useMe()
  const store = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'F' | 'M' | 'O' | ''>('')
  const [city, setCity] = useState('')
  if (!patient) return null

  const start = () => {
    setName(patient.name)
    setAge(patient.age ? String(patient.age) : '')
    setSex(patient.sex ?? '')
    setCity(patient.city ?? '')
    setEditing(true)
  }
  const n = Number(age)
  const ageOk = age === '' || (Number.isInteger(n) && n >= 1 && n <= 120)
  const ok = name.trim().length >= 2 && ageOk
  const save = () => {
    if (!ok) return
    store.updateMyProfile({ name: name.trim(), ...(age ? { age: n } : {}), ...(sex ? { sex } : {}), ...(city.trim() ? { city: city.trim() } : {}) })
    setEditing(false)
    toast('Your details are saved')
  }

  if (!editing)
    return (
      <Card className="flex items-center gap-4 p-4">
        <Avatar name={patient.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-[18px] font-bold">{patient.name}</div>
          <div className="text-[13px] text-muted">
            {[patient.age && `${patient.age} yrs`, SEX.find((x) => x.v === patient.sex)?.label, patient.city, fmtPhone(patient.phone)].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={start} className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-brand cursor-pointer">
          <Pencil size={14} /> Edit
        </button>
      </Card>
    )

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-[16px] font-semibold">Your details</div>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Age" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} autoComplete="address-level2" />
      </div>
      <div>
        <div className="mb-1.5 text-[13px] font-medium text-muted">Sex</div>
        <div className="flex gap-2">
          {SEX.map((x) => (
            <button
              key={x.v}
              type="button"
              aria-pressed={sex === x.v}
              onClick={() => setSex(x.v)}
              className={`h-10 flex-1 rounded-xl border text-[14px] cursor-pointer ${sex === x.v ? 'border-brand bg-brand-soft font-semibold text-brand' : 'border-line bg-surface text-ink'}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-[12px] text-muted">Phone {fmtPhone(patient.phone)} is how you sign in, so it can’t be changed here.</div>
      {!ageOk && <div className="text-[13px] text-danger">Enter an age between 1 and 120.</div>}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={!ok} onClick={save}>
          Save
        </Button>
      </div>
    </Card>
  )
}

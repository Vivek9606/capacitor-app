import { FileCheck, Upload } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../../components/Shell'
import { Button, Card, Chip, Footer, Input, PageHeader } from '../../../components/ui'
import { pickPhoto, toast } from '../../../lib/platform'
import { useMe, useStore } from '../../../lib/store'
import { FOCUS_AREAS, PRACTICE_SETTINGS } from '../../auth/Setup'

export default function EditProfile() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [f, setF] = useState(() => ({
    name: physio?.name ?? '',
    email: physio?.email ?? '',
    qualification: physio?.qualification ?? '',
    experienceYrs: physio?.experienceYrs ? String(physio.experienceYrs) : '',
    councilRegNo: physio?.councilRegNo ?? '',
    focusAreas: physio?.focusAreas ?? [],
    practiceSettings: physio?.practiceSettings ?? [],
  }))
  const [cert, setCert] = useState(false)
  if (!physio) return null
  const toggle = (k: 'focusAreas' | 'practiceSettings', v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] })

  const save = () => {
    const submitVerification = physio.verification === 'none' && !!f.qualification && !!f.councilRegNo && cert
    store.updatePhysio(physio.id, {
      name: f.name.trim(),
      email: f.email.trim() || undefined,
      qualification: f.qualification.trim() || undefined,
      experienceYrs: f.experienceYrs ? Number(f.experienceYrs) : undefined,
      councilRegNo: f.councilRegNo.trim() || undefined,
      focusAreas: f.focusAreas,
      practiceSettings: f.practiceSettings,
      ...(submitVerification ? { verification: 'pending' as const } : {}),
    })
    toast(submitVerification ? 'Saved · submitted for verification' : 'Profile saved')
    nav('/app/profile', { replace: true })
  }

  return (
    <Page wide>
      <PageHeader title="Edit profile" subtitle="Basic details, focus areas and qualifications" />
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-4">
          <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input label="Email (optional)" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <div>
            <h3 className="mb-3 mt-2 text-[16px] font-semibold">Focus areas</h3>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map((a) => (
                <Chip key={a} selected={f.focusAreas.includes(a)} onClick={() => toggle('focusAreas', a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 mt-2 text-[16px] font-semibold">Where do you practise?</h3>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_SETTINGS.map((a) => (
                <Chip key={a} selected={f.practiceSettings.includes(a)} onClick={() => toggle('practiceSettings', a)}>
                  {a}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 lg:mt-0">
          <h3 className="text-[16px] font-semibold">Qualifications & verification</h3>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Input label="Qualification" placeholder="MPT (Ortho)" value={f.qualification} onChange={(e) => setF({ ...f, qualification: e.target.value })} />
            <Input label="Experience" placeholder="yrs" inputMode="numeric" value={f.experienceYrs} onChange={(e) => setF({ ...f, experienceYrs: e.target.value.replace(/\D/g, '') })} />
          </div>
          <Input label="State council registration no." placeholder="KPC/2017/04821" value={f.councilRegNo} onChange={(e) => setF({ ...f, councilRegNo: e.target.value })} />
          {physio.verification === 'none' ? (
            <Card className="p-4">
              <div className="text-[15px] font-semibold">Council certificate</div>
              <p className="mt-1 text-[13px] text-muted">Upload a photo of your registration certificate. The Betterhood team verifies it within 48 hours.</p>
              <Button
                variant="secondary"
                size="md"
                className="mt-3"
                onClick={async () => {
                  const img = await pickPhoto()
                  if (img) setCert(true)
                }}
              >
                {cert ? <FileCheck size={17} /> : <Upload size={17} />}
                {cert ? 'Certificate added' : 'Upload certificate'}
              </Button>
            </Card>
          ) : (
            <p className="text-[13px] text-muted">
              Verification is {physio.verification === 'pending' ? 'in progress — usually within 48 hours' : 'complete'}.
            </p>
          )}
        </div>
      </div>
      <Footer className="lg:flex lg:justify-end">
        <Button block className="lg:w-[400px]" disabled={f.name.trim().length < 2} onClick={save}>
          Save
        </Button>
      </Footer>
    </Page>
  )
}

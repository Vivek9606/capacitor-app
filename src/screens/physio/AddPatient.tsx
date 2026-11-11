import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Shell'
import { Button, Chip, Footer, Input, Label, PageHeader } from '../../components/ui'
import { toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import type { Patient } from '../../lib/types'
import { usePick, useStartPlan } from './Patients'

export default function AddPatient() {
  const { physio } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const pick = usePick()
  const startPlan = useStartPlan()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<Patient['sex']>()
  const [condition, setCondition] = useState('')
  if (!physio) return null
  const digits = phone.replace(/\D/g, '')
  const valid = name.trim().length > 1 && /^[6-9]\d{9}$/.test(digits)

  const save = () => {
    const id = store.addPatient(physio.id, {
      name: name.trim(),
      phone: digits,
      age: age ? Number(age) : undefined,
      sex,
      condition: condition.trim() || undefined,
    })
    toast(`${name.trim()} added`)
    if (pick === 'consent') nav(`/app/patients/${id}/consent`, { replace: true })
    else if (pick) startPlan(id, pick, { replace: true })
    else nav(`/app/patients/${id}`, { replace: true })
  }

  return (
    <Page>
      <PageHeader title="Add patient" subtitle="Name + mobile. Everything else can wait." />
      <div className="flex flex-col gap-4">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya Sharma" autoFocus />
        <Input label="Mobile number (WhatsApp)" prefix="+91" inputMode="numeric" value={phone} maxLength={11} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} placeholder="98450 11223" />
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Input label="Age" inputMode="numeric" value={age} maxLength={3} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} placeholder="32" />
          <div>
            <Label>Sex</Label>
            <div className="flex gap-2">
              {(['F', 'M', 'O'] as const).map((s) => (
                <Chip key={s} selected={sex === s} onClick={() => setSex(sex === s ? undefined : s)} className="h-[52px] flex-1 justify-center rounded-xl">
                  {s === 'F' ? 'Female' : s === 'M' ? 'Male' : 'Other'}
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <Input label="Condition (optional)" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Lower back pain" />
      </div>
      <Footer>
        <Button block disabled={!valid} onClick={save}>
          {pick === 'plan' ? 'Save & build care plan' : pick === 'rx' ? 'Save & write treatment plan' : pick === 'consent' ? 'Save & take consent' : 'Save patient'}
        </Button>
      </Footer>
    </Page>
  )
}

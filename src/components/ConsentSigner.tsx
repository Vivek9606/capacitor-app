import { useState } from 'react'
import { SignaturePad } from './SignaturePad'
import { Button, Card, Checkbox, Input, Toggle } from './ui'

export interface SignedValue {
  signedName: string
  signature?: string
  guardian?: string
}

/** Name + signature + "I agree". Used in clinic (on the physio's device) and by the patient in their app. */
export function ConsentSigner({
  patientName,
  patientAge,
  submitLabel = 'Sign consent',
  onSubmit,
  onDecline,
}: {
  patientName: string
  patientAge?: number
  submitLabel?: string
  onSubmit: (v: SignedValue) => void
  onDecline?: () => void
}) {
  const [minor, setMinor] = useState(patientAge !== undefined && patientAge < 18)
  const [name, setName] = useState(minor ? '' : patientName)
  const [signature, setSignature] = useState<string>()
  const [agree, setAgree] = useState(false)
  const valid = name.trim().length > 1 && !!signature && agree

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1">
          <div className="text-[15px] font-semibold">Signing for a minor</div>
          <div className="text-[13px] text-muted">A parent or guardian signs for patients under 18</div>
        </div>
        <Toggle
          label="Signing for a minor"
          checked={minor}
          onChange={(v) => {
            setMinor(v)
            setName(v ? '' : patientName)
          }}
        />
      </Card>
      <Input label={minor ? 'Parent / guardian full name' : 'Full name'} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <div>
        <div className="mb-1.5 text-[13px] text-muted">Signature</div>
        <SignaturePad onChange={setSignature} />
      </div>
      <Checkbox
        checked={agree}
        onChange={setAgree}
        label={<span className="text-[14px]">{minor ? `I am the parent/guardian of ${patientName}. ` : ''}I have read and understood this form, my questions have been answered, and I consent.</span>}
      />
      <Button block disabled={!valid} onClick={() => valid && onSubmit({ signedName: minor ? patientName : name.trim(), signature, guardian: minor ? name.trim() : undefined })}>
        {submitLabel}
      </Button>
      {onDecline && (
        <button type="button" onClick={onDecline} className="py-1 text-[14px] font-semibold text-muted hover:text-ink cursor-pointer">
          I don’t consent
        </button>
      )}
    </div>
  )
}

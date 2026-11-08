import { Check, ChevronLeft, X } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ExerciseMedia } from '../../components/ExerciseMedia'
import { Button, cx, IconButton, Progress, TextArea } from '../../components/ui'
import { today } from '../../lib/dates'
import { doseLabel } from '../../lib/exercises'
import { firstName } from '../../lib/logic'
import { patientView } from '../../lib/patientData'
import { haptic } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

const PAIN_LABEL = ['No pain', 'Very mild', 'Mild', 'Mild', 'Moderate', 'Moderate', 'Quite bad', 'Bad', 'Very bad', 'Severe', 'Worst possible']

function painColor(n: number) {
  if (n <= 3) return 'bg-ok'
  if (n <= 6) return 'bg-warn'
  return 'bg-danger'
}

// Patient · guided session → pain score → done
export default function Session() {
  const { patient } = useMe()
  const store = useStore()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [sets, setSets] = useState<Record<number, number>>({})
  const [pain, setPain] = useState<number>()
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)
  if (!patient) return null
  const v = patientView(store.db, patient)
  if (!v.plan) return <Navigate to="/me" replace />
  const plan = v.plan
  const doc = `Dr. ${firstName(v.physio.name)}`
  const total = plan.items.length
  const onPain = step === total

  const finish = () => {
    store.logSession(plan.id, { date: today(), status: 'done', pain, note: note.trim() || undefined })
    haptic('success')
    setDone(true)
  }

  if (done)
    return (
      <div className="mx-auto flex min-h-full max-w-[520px] flex-col items-center justify-center px-6 text-center safe-top">
        <div className="anim-pop grid h-20 w-20 place-items-center rounded-full bg-ok text-white">
          <Check size={40} strokeWidth={3} />
        </div>
        <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.01em]">Session done!</h1>
        <p className="mt-2 text-[16px] text-muted">
          {total} exercises · pain {pain}/10. {doc} can see your progress.
        </p>
        {v.adherence && (
          <div className="mt-6 w-full max-w-[320px] rounded-2xl border border-line bg-surface p-4 text-left">
            <div className="text-[14px] text-muted">Plan progress</div>
            <div className="mt-1 text-[18px] font-semibold">
              {v.adherence.done + (v.todayLog?.status === 'done' ? 0 : 1)} sessions done
            </div>
          </div>
        )}
        <Button block className="mt-8 max-w-[320px]" onClick={() => nav('/me', { replace: true })}>
          Back to today
        </Button>
      </div>
    )

  const item = plan.items[step]
  const ex = item && store.db.exercises.find((e) => e.id === item.exerciseId)
  const doneSets = sets[step] ?? 0

  return (
    <div className="mx-auto flex min-h-full max-w-[720px] flex-col px-5 pb-6 pt-4 safe-top">
      <div className="flex items-center gap-3">
        <IconButton aria-label={step === 0 ? 'Close' : 'Previous'} onClick={() => (step === 0 ? nav('/me') : setStep(step - 1))}>
          {step === 0 ? <X size={18} /> : <ChevronLeft size={20} />}
        </IconButton>
        <div className="flex-1">
          <div className="text-[13px] text-muted">{onPain ? 'Last step' : `Exercise ${step + 1} of ${total}`}</div>
          <Progress value={((onPain ? total : step) / total) * 100} className="mt-1.5" />
        </div>
      </div>

      {!onPain && item && ex ? (
        <>
          <ExerciseMedia region={ex.region} size="lg" className="mt-5 aspect-video w-full" label="Video · demo placeholder" />
          <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.01em]">{ex.name}</h1>
          <div className="mt-1 text-[16px] font-medium text-brand">{doseLabel(item)}</div>
          {item.note && <div className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[14px]">“{item.note}” — {doc}</div>}
          {ex.cues.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5 text-[15px] text-muted">
              {ex.cues.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /> {c}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6">
            <div className="mb-2 text-[14px] font-semibold">Tap each set as you finish it</div>
            <div className="flex gap-2.5">
              {Array.from({ length: item.sets }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    haptic('light')
                    setSets({ ...sets, [step]: i < doneSets ? i : i + 1 })
                  }}
                  className={cx(
                    'flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl border text-[15px] font-semibold transition-colors cursor-pointer',
                    i < doneSets ? 'border-ok bg-ok text-white' : 'border-line bg-surface text-ink',
                  )}
                >
                  {i < doneSets && <Check size={16} strokeWidth={3} />} Set {i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1" />
          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={() => setStep(step + 1)}>
              Skip
            </Button>
            <Button block onClick={() => setStep(step + 1)}>
              {doneSets >= item.sets ? 'Next' : 'Done — next'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-[26px] font-semibold tracking-[-0.01em]">How’s your pain right now?</h1>
          <p className="mt-1 text-[15px] text-muted">0 is no pain, 10 is the worst you can imagine.</p>
          <div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-11">
            {Array.from({ length: 11 }).map((_, n) => (
              <button
                key={n}
                onClick={() => {
                  haptic('light')
                  setPain(n)
                }}
                className={cx(
                  'h-12 rounded-xl border text-[17px] font-semibold transition-colors cursor-pointer',
                  pain === n ? `${painColor(n)} border-transparent text-white` : 'border-line bg-surface',
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-3 h-6 text-[15px] font-medium">{pain !== undefined && PAIN_LABEL[pain]}</div>
          {pain !== undefined && pain >= 7 && (
            <div className="mt-2 rounded-xl bg-accent-soft p-3 text-[14px]">That’s high. Stop any exercise that makes it worse, and tell {doc} below.</div>
          )}
          <div className="mt-4">
            <TextArea label={`Anything to tell ${doc}? (optional)`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bird dog felt hard on the left side" />
          </div>
          <div className="flex-1" />
          <Button block className="mt-6" disabled={pain === undefined} onClick={finish}>
            Finish session
          </Button>
        </>
      )}
    </div>
  )
}

import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, cx, IconButton } from '../../../components/ui'
import { assessmentBySlug, loadForm } from '../../../lib/assessments'
import { haptic } from '../../../lib/platform'
import { QuizEngine, type Field, type FormDef, type Values } from '../../../lib/quizEngine'
import { useMe, useStore } from '../../../lib/store'
import type { Patient } from '../../../lib/types'

// Ported from the website's AssessmentRunner (betterhood.in/quiz-landing-page/): same forms, logic and scoring.
const DEMO = /^(gender|age \(in years\)|weight|height)/i
const CONTACT = /^(first name|full name|email|phone number)$/i
const isQuestion = (f: Field) => !f.hidden && ['checkbox', 'quiz', 'radio', 'select'].includes(f.type)
const isAside = (f: Field) => f.type === 'html' && /right_html|dyk_html/.test(f.css)
/** What the app draws: questions and info text. Name/phone/email/age come from the patient's account. */
const renders = (f: Field) => isQuestion(f) || (f.type === 'html' && !!f.html)

function prefill(form: FormDef, p: Patient): Values {
  const v: Values = {}
  for (const f of form.fields) {
    if (/^(first name|full name)$/i.test(f.label)) v[f.id] = p.name.split(' ')[0]
    else if (/^email$/i.test(f.label)) v[f.id] = p.email ?? ''
    else if (/^phone number$/i.test(f.label)) v[f.id] = p.phone
    else if (/^gender/i.test(f.label) && p.sex) v[f.id] = p.sex === 'F' ? 'Female' : p.sex === 'M' ? 'Male' : ''
    else if (/^age \(in years\)/i.test(f.label) && p.age) v[f.id] = String(p.age)
  }
  return v
}

const stripHtml = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export default function AssessRun() {
  const { slug = '' } = useParams()
  const cfg = assessmentBySlug(slug)
  const { patient } = useMe()
  const [form, setForm] = useState<FormDef>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!cfg) return
    loadForm(cfg.slug)
      .then(setForm)
      .catch(() => setFailed(true))
  }, [cfg])

  if (!cfg) return <Navigate to="/me/assess" replace />
  if (!patient) return null
  if (failed) return <p className="p-8 text-center text-muted">Couldn’t load this assessment. Check your connection and try again.</p>
  if (!form)
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" />
      </div>
    )
  return <Runner form={form} patient={patient} />
}

function Runner({ form, patient }: { form: FormDef; patient: Patient }) {
  const { slug = '' } = useParams()
  const cfg = assessmentBySlug(slug)!
  const store = useStore()
  const nav = useNavigate()
  const engine = useMemo(() => new QuizEngine(form, prefill(form, patient)), [form, patient])
  const [, bump] = useState(0)
  const rerender = () => bump((n) => n + 1)
  const [idx, setIdx] = useState(0)
  const [err, setErr] = useState('')
  const topRef = useRef<HTMLDivElement>(null)

  const maxPage = Math.max(...form.fields.map((f) => f.page))
  const fieldsOn = (page: number) => form.fields.filter((f) => f.page === page && engine.shown(f.id) && !(DEMO.test(f.label) || CONTACT.test(f.label)))
  const hasContent = (page: number) => fieldsOn(page).some(renders)
  // Pages with something to show, recomputed as answers change conditional logic.
  const pages = Array.from({ length: maxPage }, (_, i) => i + 1).filter(hasContent)
  const page = pages[Math.min(idx, pages.length - 1)]
  const fields = fieldsOn(page)
  const main = fields.filter((f) => renders(f) && !isAside(f))
  const aside = fields.filter(isAside)
  const last = idx >= pages.length - 1
  const pct = Math.round((idx / Math.max(1, pages.length)) * 100)

  const set = (id: number, v: string | string[]) => {
    engine.values[id] = v
    setErr('')
    rerender()
  }

  const valid = () => {
    for (const f of main) {
      if (!isQuestion(f) || !f.required) continue
      const v = engine.values[f.id]
      if (!v || (Array.isArray(v) && !v.length)) {
        setErr('Please choose an answer to continue.')
        document.getElementById(`q${f.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return false
      }
    }
    return true
  }

  const go = (d: 1 | -1) => {
    if (d === 1 && !valid()) {
      haptic('medium')
      return
    }
    if (d === 1 && last) return finish()
    setIdx((i) => Math.max(0, i + d))
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function finish() {
    const totals = Object.entries(cfg.totals).map(([id, cat]) => ({ cat, score: engine.num(+id) }))
    const best = totals.reduce((a, b) => (b.score > a.score ? b : a))
    const adv = form.fields.find((f) => /^critical advisory$/i.test(f.label))
    const id = store.saveAssessment(patient.id, {
      slug: cfg.slug,
      area: cfg.area,
      title: cfg.title,
      cat: best.cat,
      condition: cfg.conditions[best.cat],
      result: cfg.results[best.cat],
      advisory: adv && engine.shown(adv.id) ? stripHtml(adv.default) || 'Critical advisory' : undefined,
      totals: Object.fromEntries(totals.map((t) => [t.cat, Math.round(t.score * 10) / 10])),
    })
    haptic('success')
    nav(`/me/assess/result/${id}`, { replace: true, state: { fresh: true } })
  }

  return (
    <div ref={topRef} className="mx-auto w-full max-w-[480px] px-5 pt-5 lg:max-w-[1000px] lg:px-10 lg:pt-9">
      <div className="flex items-center gap-3">
        <IconButton aria-label="Close" onClick={() => nav(-1)}>
          <ArrowLeft size={18} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-muted">{cfg.title} assessment</div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-soft">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-sun transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-[13px] font-semibold tabular-nums text-muted">
          {idx + 1}/{pages.length}
        </span>
      </div>

      <div key={page} className="anim-page mt-6 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-6">
          {main.map((f) =>
            f.type === 'html' ? (
              <div key={f.id} className={/consent/.test(f.css) ? 'qz-consent' : 'qz-html'} dangerouslySetInnerHTML={{ __html: f.html! }} />
            ) : (
              <Question key={f.id} f={f} value={engine.values[f.id]} onChange={(v) => set(f.id, v)} />
            ),
          )}
        </div>
        {aside.length > 0 && (
          <div className="mt-6 lg:mt-0">
            {aside.map((f) => (
              <div key={f.id} className="qz-aside" dangerouslySetInnerHTML={{ __html: f.html! }} />
            ))}
          </div>
        )}
      </div>

      {err && (
        <p role="alert" className="mt-4 text-[14px] font-semibold text-danger">
          {err}
        </p>
      )}
      <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex gap-3 bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-6 lg:static lg:mx-0 lg:px-0">
        {idx > 0 && (
          <Button variant="secondary" onClick={() => go(-1)} className="px-5">
            <ArrowLeft size={18} />
          </Button>
        )}
        <Button block onClick={() => go(1)}>
          {idx === 0 ? 'Let’s start' : last ? 'See my result' : 'Next'} <ArrowRight size={18} />
        </Button>
      </div>
      <p className="flex items-center justify-center gap-1.5 pb-8 text-center text-[12px] text-faint">
        <Lock size={12} /> Results are indicative and don’t replace a medical consultation.
      </p>
    </div>
  )
}

function Question({ f, value, onChange }: { f: Field; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const multi = f.type === 'checkbox'
  const opts = (f.choices ?? []).filter((c) => !(f.type === 'select' && (c.value === '' || c.label === 'Select')))
  const isScale = /pain on a scale/i.test(f.label) && opts.length >= 10
  const label = f.label.replace(/\s*\(Options to presented as a visual scale\)/i, '')
  const cur = value

  if (isScale) {
    const sel = opts.find((o) => o.value === cur)
    return (
      <fieldset id={`q${f.id}`}>
        <legend className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em]">{label}</legend>
        <div className="mt-4 grid grid-cols-11 gap-1" role="radiogroup">
          {opts.map((c, i) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={cur === c.value}
              onClick={() => onChange(c.value)}
              style={{ background: cur === c.value ? undefined : `color-mix(in oklab, var(--color-ok) ${Math.max(0, 60 - i * 12)}%, color-mix(in oklab, var(--color-accent) ${i * 10}%, white))` }}
              className={cx('pressable grid h-11 place-items-center rounded-lg text-[14px] font-bold cursor-pointer', cur === c.value ? 'bg-brand text-white shadow-brand' : 'text-ink/80')}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] text-muted">
          <span>No pain</span>
          <span>Unspeakable</span>
        </div>
        <p className="mt-3 min-h-[40px] rounded-xl bg-brand-soft/60 px-3 py-2 text-[14px] text-brand">{sel ? sel.label : 'Tap a number to describe your pain'}</p>
      </fieldset>
    )
  }

  const isOn = (v: string) => (Array.isArray(cur) ? cur.includes(v) : cur === v)
  const toggle = (v: string) => {
    if (!multi) return onChange(v)
    const arr = Array.isArray(cur) ? cur : []
    const none = (x: string) => /^none of (the above|these)/i.test(x)
    if (arr.includes(v)) return onChange(arr.filter((x) => x !== v))
    // "None of the above" clears the other ticks, and vice versa.
    onChange(none(v) ? [v] : [...arr.filter((x) => !none(x)), v])
  }

  return (
    <fieldset id={`q${f.id}`}>
      <legend className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em]">{label}</legend>
      {(multi || f.description) && <p className="mt-1 text-[14px] text-muted">{f.description || 'Choose all that apply.'}</p>}
      <div className="mt-4 flex flex-col gap-2.5">
        {opts.map((c) => {
          const on = isOn(c.value)
          const [a, b] = c.label.split('|')
          return (
            <button
              key={c.value}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              onClick={() => toggle(c.value)}
              className={cx(
                'pressable flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] cursor-pointer',
                on ? 'border-brand bg-brand-soft/70 shadow-card' : 'border-line bg-surface hover:border-brand-line',
              )}
            >
              <span
                className={cx(
                  'grid h-6 w-6 shrink-0 place-items-center border-2 transition-colors',
                  multi ? 'rounded-md' : 'rounded-full',
                  on ? 'border-brand bg-brand text-white' : 'border-line',
                )}
              >
                {on && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block', on && 'font-semibold')}>{a.trim()}</span>
                {b && <span className="mt-0.5 block text-[13px] text-muted">{b.trim()}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

import { AlertTriangle, ArrowUpRight, BookOpen, Camera, ClipboardCheck, Hourglass, MapPin, Star, Stethoscope, UserRoundCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Card, cx } from '../../components/ui'
import { resultPath } from '../../lib/assessments'
import { webRoute } from '../../lib/web'
import { productUrl, type Product, type Tool } from '../../lib/explore'
import { fmtShort } from '../../lib/dates'
import { openLink } from '../../lib/platform'
import type { Assessment, Patient, Physio } from '../../lib/types'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** One betterhood store product. Buying happens on shop.betterhood.in. */
export function ProductCard({ p, className }: { p: Product; className?: string }) {
  const off = p.compare && p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0
  return (
    <button
      onClick={() => openLink(productUrl(p.handle))}
      className={cx('pressable group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-line bg-surface text-left shadow-card cursor-pointer hover:border-brand-line', className)}
    >
      <div className="relative aspect-square w-full bg-[#f6f1ea]">
        <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">{off}% off</span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="line-clamp-2 text-[13px] font-semibold leading-snug">{p.title}</div>
        {p.rating ? (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
            <Star size={11} className="fill-sun text-sun" /> {p.rating.toFixed(1)}
            {p.reviews ? <span>({p.reviews})</span> : null}
          </div>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-brand">{inr(p.price)}</div>
            {off > 0 && <div className="text-[11px] text-faint line-through">{inr(p.compare!)}</div>}
          </div>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
            <ArrowUpRight size={16} />
          </span>
        </div>
      </div>
    </button>
  )
}

const TOOL_ICON: Record<string, ReactNode> = {
  slouch: <Camera size={20} />,
  assess: <ClipboardCheck size={20} />,
  corner: <Stethoscope size={20} />,
  directory: <MapPin size={20} />,
  learn: <BookOpen size={20} />,
}

export function ToolCard({ t }: { t: Tool }) {
  const nav = useNavigate()
  return (
    <Card className="flex items-center gap-3.5 p-4" onClick={() => (t.to ? nav(t.to) : openLink(t.href!))}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">{TOOL_ICON[t.key]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[15px] font-semibold">
          {t.label}
          {t.href && <ArrowUpRight size={14} className="text-faint" />}
        </div>
        <div className="text-[13px] leading-snug text-muted">{t.desc}</div>
      </div>
    </Card>
  )
}

/** The latest assessment outcome. Pain results link to the full result page from betterhood.in, shown in the app. */
export function ResultCard({ a, onOpen }: { a: Assessment; onOpen?: () => void }) {
  const nav = useNavigate()
  const scored = (a.kind ?? 'pain') !== 'pain'
  const overall = a.scores?.overall
  return (
    <Card className="overflow-hidden p-0" onClick={onOpen}>
      <div className="bg-hero p-4 text-white">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-white/70">
          {a.title} · {fmtShort(a.createdAt.slice(0, 10))}
        </div>
        {scored ? (
          <>
            <div className="mt-1 font-display text-[22px] font-bold leading-tight">{overall != null ? `${overall} / 10` : 'Result ready'}</div>
            <div className="mt-1 text-[13px] text-white/80">{a.kind === 'longevity' ? 'Your longevity target for musculoskeletal health.' : 'Overall score, combining strength, balance and mobility.'}</div>
          </>
        ) : (
          <>
            <div className="mt-1 font-display text-[22px] font-bold leading-tight">{a.condition ?? 'Result ready'}</div>
            <div className="mt-1 text-[13px] text-white/80">Most likely cause of your pain, based on your answers.</div>
          </>
        )}
      </div>
      {a.advisory && (
        <div className="flex gap-2.5 border-b border-line bg-accent-soft px-4 py-3 text-[13px] text-ink">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent" />
          <span>Some answers suggest this needs a proper medical check. Please see a doctor before starting exercises.</span>
        </div>
      )}
      {a.result && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            nav(webRoute(resultPath(a.result!), a.condition ?? a.title))
          }}
          className="flex w-full items-center justify-between px-4 py-3 text-[14px] font-semibold text-brand cursor-pointer hover:bg-brand-soft/50"
        >
          Read what this means and what helps <ArrowUpRight size={16} />
        </button>
      )}
    </Card>
  )
}

/** Where the patient is in getting a physio (self sign-ups). */
export function MatchCard({ patient, physio, hasAssessment }: { patient: Patient; physio?: Physio; hasAssessment: boolean }) {
  const nav = useNavigate()
  const status = patient.match?.status ?? 'pending'
  if (!hasAssessment)
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <ClipboardCheck size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold">Take your pain assessment</div>
            <p className="mt-0.5 text-[13px] text-muted">5 minutes, designed by physios. We use it to match you with the right physiotherapist.</p>
          </div>
        </div>
        <button onClick={() => nav('/me/assess')} className="pressable mt-3 h-11 w-full rounded-xl bg-brand text-[15px] font-semibold text-white shadow-brand cursor-pointer">
          Start assessment
        </button>
      </Card>
    )
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-semibold text-muted">Your physio</div>
        {status === 'confirmed' ? (
          <Badge tone="ok" icon={<UserRoundCheck size={12} />}>Assigned</Badge>
        ) : (
          <Badge tone="warn" icon={<Hourglass size={12} />}>Being matched</Badge>
        )}
      </div>
      {physio ? (
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={physio.name} photo={physio.photo} size={48} />
          <div className="min-w-0">
            <div className="text-[16px] font-semibold">{physio.name}</div>
            <div className="truncate text-[13px] text-muted">{[physio.qualification, physio.clinic?.area ?? physio.practice?.serviceArea].filter(Boolean).join(' · ') || 'Physiotherapist'}</div>
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        {status === 'confirmed'
          ? 'Your physio has been assigned. Tap refresh to see your plan and visits.'
          : physio
            ? 'Based on your assessment we’ve suggested this physio. Our care team confirms it, then your physio’s plan and visits show up here.'
            : 'Our care team is finding the right physio near you. Once you’re matched, their plan and visits show up here.'}
      </p>
    </Card>
  )
}

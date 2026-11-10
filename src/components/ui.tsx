import { Check, ChevronLeft, MessageCircle, RefreshCw, X } from 'lucide-react'
import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Dot } from '../lib/logic'
import { apiMode } from '../lib/api'
import { toast } from '../lib/platform'
import { useStore } from '../lib/store'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

// ---------- Buttons ----------
type BtnVariant = 'primary' | 'whatsapp' | 'secondary' | 'ghost' | 'soft'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-gradient-to-b from-[#7a2a6c] to-brand text-white shadow-brand hover:to-brand-ink',
  whatsapp: 'bg-gradient-to-b from-[#16a391] to-wa text-white shadow-[0_10px_24px_-10px_rgb(18_140_126/0.6)] hover:to-wa-ink',
  secondary: 'bg-surface text-ink border border-line shadow-card hover:border-brand-line',
  ghost: 'text-brand hover:bg-brand-soft/70',
  soft: 'bg-brand-soft text-brand hover:bg-[#ecd9e7]',
}

export function Button({
  variant = 'primary',
  size = 'lg',
  block,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'lg' | 'md' | 'sm'; block?: boolean }) {
  return (
    <button
      {...rest}
      className={cx(
        'pressable inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none',
        size === 'lg' && 'h-[54px] rounded-2xl px-6 text-[16px]',
        size === 'md' && 'h-12 rounded-2xl px-4 text-[15px]',
        size === 'sm' && 'h-9 rounded-full px-3.5 text-[13px]',
        block && 'w-full',
        BTN[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function WhatsAppButton({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { block?: boolean; size?: 'lg' | 'md' | 'sm' }) {
  return (
    <Button variant="whatsapp" {...rest}>
      <MessageCircle size={20} strokeWidth={2} />
      {children}
    </Button>
  )
}

export function IconButton({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cx(
        'pressable grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line/80 bg-surface text-ink shadow-card hover:border-brand-line hover:text-brand cursor-pointer disabled:opacity-60',
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------- Page header (back button + title) ----------
export function PageHeader({
  title,
  subtitle,
  back = true,
  onBack,
  close,
  right,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: boolean
  onBack?: () => void
  close?: boolean
  right?: ReactNode
  className?: string
}) {
  const nav = useNavigate()
  const goBack = onBack ?? (() => (window.history.length > 1 ? nav(-1) : nav('/')))
  return (
    <div className={cx('flex items-center gap-3 pb-4', className)}>
      {back && (
        <IconButton aria-label={close ? 'Close' : 'Back'} onClick={goBack}>
          {close ? <X size={18} /> : <ChevronLeft size={20} />}
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[22px] font-bold leading-tight tracking-[-0.025em] lg:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      {right}
      <RefreshButton />
    </div>
  )
}

/** Reloads the latest data from the server, so nobody has to go back and forth to see changes. */
export function RefreshButton({ className }: { className?: string }) {
  const store = useStore()
  const [busy, setBusy] = useState(false)
  if (!apiMode || !store.session?.token) return null
  return (
    <IconButton
      aria-label="Refresh"
      title="Refresh"
      disabled={busy}
      className={className}
      onClick={async () => {
        setBusy(true)
        try {
          await store.refresh()
          toast('Up to date')
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Couldn’t refresh. Check your internet.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <RefreshCw size={17} className={busy ? 'animate-spin' : undefined} />
    </IconButton>
  )
}

// ---------- Surfaces ----------
export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onClick()) : undefined}
      className={cx(
        'min-w-0 rounded-[var(--radius-card)] border border-line/70 bg-surface shadow-card',
        onClick && 'pressable cursor-pointer hover:border-brand-line/80 hover:shadow-lift',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 mt-7 flex items-center justify-between', className)}>
      <h2 className="text-[17px] font-bold tracking-[-0.02em]">{children}</h2>
      {right}
    </div>
  )
}

export function IconTile({ children, tone = 'brand', className }: { children: ReactNode; tone?: 'brand' | 'accent' | 'lime'; className?: string }) {
  const t = { brand: 'bg-brand-soft text-brand', accent: 'bg-accent-soft text-accent', lime: 'bg-lime text-lime-ink' }[tone]
  return <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-[14px]', t, className)}>{children}</div>
}

export function Avatar({ name, photo, size = 44, className }: { name: string; photo?: string; size?: number; className?: string }) {
  const init = name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  if (photo) return <img src={photo} alt="" className={cx('shrink-0 rounded-full object-cover', className)} style={{ width: size, height: size }} />
  return (
    <div
      className={cx('grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-soft to-[#ead6e5] font-bold text-brand', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {init}
    </div>
  )
}

// ---------- Chips, badges, toggles ----------
export function Chip({
  selected,
  disabled,
  onClick,
  children,
  className,
}: {
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'pressable inline-flex h-10 items-center whitespace-nowrap rounded-full border px-4 text-[14px] font-medium cursor-pointer disabled:cursor-default',
        selected ? 'border-brand bg-brand text-white shadow-brand' : 'border-line bg-surface text-ink hover:border-brand-line',
        disabled && 'border-dashed text-faint hover:border-line',
        className,
      )}
    >
      {children}
    </button>
  )
}

export type BadgeTone = 'brand' | 'lime' | 'accent' | 'muted' | 'warn' | 'ok'
export function Badge({ tone = 'brand', icon, children, className }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  const t = {
    brand: 'bg-brand-soft text-brand',
    lime: 'bg-lime text-lime-ink',
    accent: 'bg-accent-soft text-accent',
    muted: 'bg-track text-muted',
    warn: 'bg-warn-soft text-warn',
    ok: 'bg-ok-soft text-ok',
  }[tone]
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap', t, className)}>
      {icon}
      {children}
    </span>
  )
}

export function SoonBadge() {
  return <span className="rounded-full bg-accent px-1.5 py-[1px] text-[9px] font-bold tracking-wide text-white">SOON</span>
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors duration-300 cursor-pointer disabled:opacity-40',
        checked ? 'bg-brand' : 'bg-track',
      )}
    >
      <span className={cx('absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-[left] duration-300 ease-[var(--ease-spring)]', checked ? 'left-[23px]' : 'left-[3px]')} />
    </button>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border transition-colors duration-200',
          checked ? 'border-brand bg-brand text-white' : 'border-faint/70 bg-surface',
        )}
      >
        {checked && <Check size={15} strokeWidth={3} className="anim-pop" />}
      </button>
      {label && <span className="text-[15px] leading-snug">{label}</span>}
    </label>
  )
}

export function Progress({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'accent' | 'white'; className?: string }) {
  const bar = { brand: 'bg-brand', accent: 'bg-accent', white: 'bg-white' }[tone]
  const track = tone === 'brand' ? 'bg-track' : tone === 'accent' ? 'bg-white' : 'bg-white/25'
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full', track, className)}>
      <div className={cx('anim-grow h-full rounded-full transition-all duration-700', bar)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

// ---------- Form fields ----------
export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[13px] font-medium text-muted">{children}</div>
}

export function Input({ label, className, prefix, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & { label?: string; prefix?: ReactNode }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <div className="flex h-[54px] items-center rounded-2xl border border-line bg-surface px-4 transition-[border-color,box-shadow] duration-200 focus-within:border-brand focus-within:shadow-[0_0_0_4px_rgb(155_74_140/0.14)]">
        {prefix && <span className="mr-2 text-[16px] text-ink">{prefix}</span>}
        <input {...rest} className={cx('h-full w-full min-w-0 bg-transparent text-[16px] outline-none placeholder:text-faint', className)} />
      </div>
    </label>
  )
}

export function TextArea({ label, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <textarea
        {...rest}
        className={cx(
          'w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] leading-relaxed outline-none placeholder:text-faint transition-[border-color,box-shadow] duration-200 focus:border-brand focus:shadow-[0_0_0_4px_rgb(155_74_140/0.14)]',
          className,
        )}
      />
    </label>
  )
}

// ---------- Sheet (bottom sheet on phones, centred dialog on desktop) ----------
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  // Stay mounted for a moment after closing so the sheet can slide away.
  const [shown, setShown] = useState(open)
  const [last, setLast] = useState({ children, title })
  if (open && !shown) setShown(true)
  if (open && (children !== last.children || title !== last.title)) setLast({ children, title })
  useEffect(() => {
    if (open || !shown) return
    const t = setTimeout(() => setShown(false), 240)
    return () => clearTimeout(t)
  }, [open, shown])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!shown) return null
  return (
    <div className={cx('fixed inset-0 z-50 flex items-end justify-center md:items-center', !open && 'pointer-events-none')}>
      <div className={cx('absolute inset-0 bg-scrim/45 backdrop-blur-[2px]', open ? 'anim-fade' : 'anim-fade-out')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative max-h-[90vh] w-full overflow-y-auto rounded-t-[30px] bg-bg px-5 pb-6 pt-3 shadow-float safe-bottom md:max-w-md md:rounded-[30px] md:pt-6',
          open ? 'anim-sheet' : 'anim-sheet-out',
        )}
      >
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-faint/40 md:hidden" />
        {(open ? title : last.title) && <h2 className="mb-4 font-display text-[22px] font-bold tracking-[-0.025em]">{open ? title : last.title}</h2>}
        {open ? children : last.children}
      </div>
    </div>
  )
}

// ---------- Adherence dots ----------
export function WeekDots({ dots, size = 32 }: { dots: Dot[]; size?: number }) {
  return (
    <div className="flex justify-between">
      {dots.map((d) => {
        const style = {
          done: 'bg-ok text-white shadow-[0_4px_10px_-4px_rgb(20_160_106/0.7)]',
          today_done: 'bg-brand text-white shadow-brand',
          missed: 'bg-accent text-white',
          today: 'border-2 border-brand bg-surface text-brand ring-4 ring-brand/10',
          upcoming: 'bg-track',
          rest: 'bg-transparent border border-dashed border-faint/50',
        }[d.state]
        return (
          <div key={d.date} className="flex flex-col items-center gap-1.5">
            <div className={cx('grid place-items-center rounded-full', style)} style={{ width: size, height: size }}>
              {(d.state === 'done' || d.state === 'today_done') && <Check size={size * 0.5} strokeWidth={3} />}
              {d.state === 'missed' && <X size={size * 0.5} strokeWidth={3} />}
            </div>
            <span className="text-[12px] text-muted">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Empty state ----------
export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <IconTile className="mb-3 h-14 w-14 rounded-2xl">{icon}</IconTile>
      <div className="text-[16px] font-bold tracking-[-0.01em]">{title}</div>
      {body && <p className="mt-1 max-w-xs text-[14px] text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Sticky footer for the primary action on a screen. */
export function Footer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      style={{ bottom: 'var(--tabbar-h, 0px)' }}
      className={cx('sticky z-10 -mx-5 mt-6 bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-5 pt-6 lg:static lg:mx-0 lg:bg-none lg:px-0', className)}
    >
      {children}
    </div>
  )
}

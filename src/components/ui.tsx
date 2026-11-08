import { Check, ChevronLeft, MessageCircle, X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Dot } from '../lib/logic'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

// ---------- Buttons ----------
type BtnVariant = 'primary' | 'whatsapp' | 'secondary' | 'ghost' | 'soft'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-ink active:bg-brand-ink',
  whatsapp: 'bg-wa text-white hover:bg-wa-ink active:bg-wa-ink',
  secondary: 'bg-surface text-brand border border-line hover:border-brand-line',
  ghost: 'text-brand hover:bg-brand-soft/60',
  soft: 'bg-brand-soft text-brand hover:bg-brand-soft/70',
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
        'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none',
        size === 'lg' && 'h-[52px] rounded-2xl px-6 text-[16px]',
        size === 'md' && 'h-11 rounded-xl px-4 text-[15px]',
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
        'grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:border-brand-line cursor-pointer',
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
        <h1 className="truncate text-[20px] font-semibold leading-tight tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
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
      className={cx('rounded-2xl border border-line bg-surface', onClick && 'cursor-pointer hover:border-brand-line transition-colors', className)}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-3 mt-6 flex items-center justify-between', className)}>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{children}</h2>
      {right}
    </div>
  )
}

export function IconTile({ children, tone = 'brand', className }: { children: ReactNode; tone?: 'brand' | 'accent' | 'lime'; className?: string }) {
  const t = { brand: 'bg-brand-soft text-brand', accent: 'bg-accent-soft text-accent', lime: 'bg-lime text-lime-ink' }[tone]
  return <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', t, className)}>{children}</div>
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
      className={cx('grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand', className)}
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
        'inline-flex h-10 items-center whitespace-nowrap rounded-full border px-4 text-[14px] transition-colors cursor-pointer disabled:cursor-default',
        selected ? 'border-brand bg-brand-soft text-brand font-medium' : 'border-line bg-surface text-ink hover:border-brand-line',
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
    muted: 'bg-[#efeee9] text-muted',
    warn: 'bg-warn-soft text-warn',
    ok: 'bg-ok-soft text-ok',
  }[tone]
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap', t, className)}>
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
        'relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-40',
        checked ? 'bg-brand' : 'bg-[#e4e3dd]',
      )}
    >
      <span className={cx('absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all', checked ? 'left-[23px]' : 'left-[3px]')} />
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
          'mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-md border transition-colors',
          checked ? 'border-brand bg-brand text-white' : 'border-[#cfcfc8] bg-surface',
        )}
      >
        {checked && <Check size={15} strokeWidth={3} />}
      </button>
      {label && <span className="text-[15px] leading-snug">{label}</span>}
    </label>
  )
}

export function Progress({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'accent' | 'white'; className?: string }) {
  const bar = { brand: 'bg-brand', accent: 'bg-accent', white: 'bg-white' }[tone]
  const track = tone === 'brand' ? 'bg-[#e4e3dd]' : tone === 'accent' ? 'bg-white' : 'bg-white/25'
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full', track, className)}>
      <div className={cx('h-full rounded-full transition-all', bar)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

// ---------- Form fields ----------
export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[13px] text-muted">{children}</div>
}

export function Input({ label, className, prefix, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; prefix?: ReactNode }) {
  return (
    <label className="block">
      {label && <Label>{label}</Label>}
      <div className="flex h-[52px] items-center rounded-xl border border-line bg-surface px-4 focus-within:border-brand transition-colors">
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
          'w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-[16px] leading-relaxed outline-none placeholder:text-faint focus:border-brand transition-colors',
          className,
        )}
      />
    </label>
  )
}

// ---------- Sheet (bottom sheet on phones, centred dialog on desktop) ----------
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="anim-fade absolute inset-0 bg-[#1b2420]/45" onClick={onClose} />
      <div className="anim-sheet relative max-h-[90vh] w-full overflow-y-auto rounded-t-[28px] bg-bg px-5 pb-6 pt-3 safe-bottom md:max-w-md md:rounded-[28px] md:pt-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d6d5cf] md:hidden" />
        {title && <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.01em]">{title}</h2>}
        {children}
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
          done: 'bg-ok text-white',
          today_done: 'bg-brand text-white',
          missed: 'bg-accent text-white',
          today: 'border-2 border-brand bg-surface text-brand',
          upcoming: 'bg-[#e6e5df]',
          rest: 'bg-transparent border border-dashed border-[#d6d5cf]',
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
      <IconTile className="mb-3 h-12 w-12">{icon}</IconTile>
      <div className="font-semibold">{title}</div>
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
      className={cx('sticky z-10 -mx-5 mt-6 bg-gradient-to-t from-bg via-bg to-bg/0 px-5 pb-5 pt-4 lg:static lg:mx-0 lg:bg-none lg:px-0', className)}
    >
      {children}
    </div>
  )
}

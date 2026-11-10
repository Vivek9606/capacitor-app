import { Play } from 'lucide-react'
import { cx } from './ui'

// Placeholder for exercise videos. Phase 2: <video> from Supabase Storage / a video CDN, with poster frames.
// Soft brand tints (plum, sand, mint, sun, coral from betterhood.in), one per body region.
const TINTS: Record<string, string> = {
  Lumbar: '#f5eaf2',
  Core: '#f3ece2',
  Hip: '#e6f7ed',
  Knee: '#fff4e2',
  Shoulder: '#ead6e5',
  Neck: '#ffe9e2',
  Ankle: '#efe6dc',
}

export function ExerciseMedia({ region, size = 'md', className, label }: { region?: string; size?: 'sm' | 'md' | 'lg'; className?: string; label?: string }) {
  const bg = TINTS[region ?? ''] ?? '#f5eaf2'
  const icon = size === 'sm' ? 16 : size === 'md' ? 22 : 34
  return (
    <div className={cx('relative grid place-items-center overflow-hidden rounded-xl text-brand', className)} style={{ background: bg }}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx="30" cy="22" r="5" fill="currentColor" />
        <path d="M30 27 L30 42 M30 32 L20 38 M30 32 L42 30 M30 42 L22 54 M30 42 L40 52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M0 56 L100 56" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className={cx('relative grid place-items-center rounded-full', size === 'lg' && 'h-16 w-16 bg-white/70')}>
        <Play size={icon} strokeWidth={2} />
      </div>
      {label && <span className="absolute bottom-2 left-2 rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium text-ink">{label}</span>}
    </div>
  )
}

import logoSvg from '../assets/logo.svg?raw'
import { cx } from './ui'

/** The official Betterhood logo (mark + wordmark, same file as betterhood.in), drawn in the current text colour. */
export function Logo({ tag, className, light }: { tag?: string; className?: string; light?: boolean }) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <span
        role="img"
        aria-label="betterhood"
        className={cx('block h-[26px] [&>svg]:h-full [&>svg]:w-auto', light ? 'text-white' : 'text-brand')}
        dangerouslySetInnerHTML={{ __html: logoSvg }}
      />
      {tag && (
        <span className={cx('whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', light ? 'bg-white/15 text-white' : 'bg-brand-soft text-brand')}>
          {tag}
        </span>
      )}
    </div>
  )
}

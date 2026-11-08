import { cx } from './ui'

export function Logo({ tag, className, light }: { tag?: string; className?: string; light?: boolean }) {
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <div className={cx('grid h-8 w-8 place-items-center rounded-lg text-[19px] font-bold', light ? 'bg-white text-brand' : 'bg-brand text-white')}>b</div>
      <span className={cx('text-[21px] font-semibold tracking-[-0.02em]', light ? 'text-white' : 'text-brand')}>betterhood</span>
      {tag && <span className="whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">{tag}</span>}
    </div>
  )
}

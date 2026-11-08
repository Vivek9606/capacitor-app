import { BadgeCheck } from 'lucide-react'
import type { ReactNode } from 'react'

/** Mirrors the WhatsApp Business template message a patient receives. */
export function WhatsAppPreview({ onBehalfOf, children, buttons, time }: { onBehalfOf: string; children: ReactNode; buttons?: string[]; time?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand text-[15px] font-bold text-white">b</div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[15px] font-semibold">
            Betterhood <BadgeCheck size={15} className="text-wa" />
          </div>
          <div className="truncate text-[12px] text-muted">Business account · on behalf of {onBehalfOf}</div>
        </div>
      </div>
      <div className="bg-chat px-3 pb-3 pt-3">
        <div className="rounded-xl rounded-tl-sm bg-lime p-3 text-[14px] leading-relaxed text-ink">
          {children}
          {time && <div className="mt-1 text-right text-[11px] text-muted">{time} ✓✓</div>}
        </div>
        {buttons?.map((b) => (
          <div key={b} className="mt-2 rounded-xl bg-surface py-2.5 text-center text-[14px] font-semibold text-wa">
            {b}
          </div>
        ))}
      </div>
    </div>
  )
}

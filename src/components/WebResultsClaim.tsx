import { Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fmtShort } from '../lib/dates'
import { useStore, type WebResult } from '../lib/store'
import { Button, Card } from './ui'

/**
 * Results taken on betterhood.in with this number, on another device or before signing up. The number was only typed
 * there, so the person confirms each one is theirs before it joins their account (and reaches their physio).
 */
export function WebResultsClaim() {
  const store = useStore()
  const [rows, setRows] = useState<WebResult[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    store.webResults().then((r) => live && setRows(r)).catch(() => undefined)
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.session?.userId])

  if (!rows.length) return null
  const resolve = async (claim: string[], disown: string[]) => {
    setBusy(true)
    try {
      await store.resolveWebResults(claim, disown)
      setRows((r) => r.filter((x) => !claim.includes(x.id) && !disown.includes(x.id)))
    } catch {
      /* stays on screen to try again */
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Globe size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">Results taken with your number</div>
          <p className="mt-0.5 text-[13px] text-muted">From betterhood.in. Add the ones that are yours and they’re saved here, with your answers.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-track px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{r.title}</div>
              <div className="text-[12.5px] text-muted">{fmtShort(r.takenAt.slice(0, 10))}</div>
            </div>
            <Button size="sm" disabled={busy} onClick={() => resolve([r.id], [])}>
              This is mine
            </Button>
            <Button size="sm" variant="soft" disabled={busy} onClick={() => resolve([], [r.id])}>
              Not mine
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

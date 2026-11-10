import { Eraser } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Finger / stylus / mouse signature. Calls onChange with a small PNG data URL (or undefined when cleared). */
export function SignaturePad({ onChange, height = 160 }: { onChange: (dataUrl: string | undefined) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number }>()
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    c.width = c.offsetWidth * ratio
    c.height = height * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0d1a16'
  }, [height])

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const finish = () => {
    if (!drawing.current) return
    drawing.current = false
    // Downscale to keep the stored image small (~10–30 KB).
    const src = ref.current!
    const out = document.createElement('canvas')
    out.width = Math.min(600, src.offsetWidth)
    out.height = Math.round((out.width / src.offsetWidth) * height)
    const ctx = out.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(src, 0, 0, out.width, out.height)
    onChange(out.toDataURL('image/png'))
  }

  const clear = () => {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange(undefined)
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-line bg-white">
        <canvas
          ref={ref}
          style={{ height, touchAction: 'none' }}
          className="block w-full cursor-crosshair"
          aria-label="Signature pad"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            drawing.current = true
            last.current = pos(e)
            setEmpty(false)
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return
            const p = pos(e)
            const ctx = ref.current!.getContext('2d')!
            ctx.beginPath()
            ctx.moveTo(last.current.x, last.current.y)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
            last.current = p
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={finish}
        />
        {empty && <div className="pointer-events-none absolute inset-0 grid place-items-center text-[14px] text-faint">Sign here with your finger</div>}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-line" />
      </div>
      <button type="button" onClick={clear} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink cursor-pointer">
        <Eraser size={14} /> Clear
      </button>
    </div>
  )
}

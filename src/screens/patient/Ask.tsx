import { Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Page } from '../../components/Shell'
import { Avatar, cx, PageHeader } from '../../components/ui'
import { timeAgo } from '../../lib/dates'
import { firstName } from '../../lib/logic'
import { toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'

// Patient · ask the physio a question
export default function Ask() {
  const { patient } = useMe()
  const store = useStore()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const physio = patient && store.db.physios.find((p) => p.id === patient.physioId)
  const messages = patient ? store.db.messages.filter((m) => m.patientId === patient.id).sort((a, b) => a.at.localeCompare(b.at)) : []
  const unread = messages.some((m) => m.from === 'physio' && !m.read)

  useEffect(() => {
    if (patient && unread) store.markRead(patient.id, 'patient')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  if (!patient || !physio) return null
  const doc = `Dr. ${firstName(physio.name)}`

  const send = () => {
    if (!text.trim()) return
    store.sendMessage(physio.id, patient.id, 'patient', text.trim())
    setText('')
    toast(`Sent — ${doc} usually replies within a day`)
  }

  return (
    <Page className="flex min-h-full flex-col">
      <PageHeader title={`Ask ${doc}`} subtitle="Replies also arrive on WhatsApp" right={<Avatar name={physio.name} photo={physio.photo} size={40} />} />
      <div className="flex flex-1 flex-col gap-2.5 pb-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-[14px] text-muted">
            Questions about an exercise, pain, or your plan? {doc} will get them right away.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cx('flex', m.from === 'patient' && 'justify-end')}>
            <div className={cx('max-w-[80%] rounded-2xl px-3.5 py-2.5', m.from === 'patient' ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm border border-line bg-surface')}>
              <div className="text-[15px]">{m.text}</div>
              <div className={cx('mt-0.5 text-[11px]', m.from === 'patient' ? 'text-white/70' : 'text-muted')}>{timeAgo(m.at)}</div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="sticky bottom-0 -mx-5 flex items-center gap-2 border-t border-line bg-bg px-5 py-3 safe-bottom"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question…"
          className="h-12 flex-1 rounded-full border border-line bg-surface px-4 text-[15px] outline-none focus:border-brand"
        />
        <button aria-label="Send" disabled={!text.trim()} className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white disabled:opacity-40 cursor-pointer">
          <Send size={18} />
        </button>
      </form>
    </Page>
  )
}

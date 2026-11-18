import { MessageSquare, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card, cx } from '../../components/ui'
import { timeAgo } from '../../lib/dates'
import { firstName } from '../../lib/logic'
import { toast } from '../../lib/platform'
import { useMe, useStore } from '../../lib/store'
import type { Patient } from '../../lib/types'

/**
 * The physio's side of the conversation with one patient: every message, newest at the bottom, and a reply box.
 * Shown on the patient's page (Messages tab) and on the plan tracking page, so a question can always be answered,
 * whether or not the patient has a care plan yet. Opening it marks the patient's messages as read.
 */
export function MessageThread({ patient, extra, bare }: { patient: Patient; extra?: React.ReactNode; bare?: boolean }) {
  const store = useStore()
  const { physio } = useMe()
  const [reply, setReply] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const messages = store.db.messages.filter((m) => m.patientId === patient.id).sort((a, b) => a.at.localeCompare(b.at))
  const unread = messages.some((m) => m.from === 'patient' && !m.read)
  const name = firstName(patient.name)

  useEffect(() => {
    if (unread) store.markRead(patient.id, 'physio')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id, unread])
  useEffect(() => {
    if (!bare) end.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, bare])

  if (!physio) return null
  const send = () => {
    if (!reply.trim()) return
    store.sendMessage(physio.id, patient.id, 'physio', reply.trim())
    setReply('')
    toast(`Reply sent to ${name}`)
  }

  const body = (
    <>
      <div className="flex flex-col gap-2.5">
        {extra}
        {messages.length === 0 && !extra && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-[14px] text-muted">
            <MessageSquare size={20} className="text-faint" />
            No messages yet. Questions {name} sends from the app appear here, and you can write first.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cx('flex', m.from === 'physio' && 'justify-end')}>
            <div className={cx('max-w-[85%] rounded-2xl px-3.5 py-2.5', m.from === 'physio' ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm bg-accent-soft')}>
              <div className="whitespace-pre-wrap text-[14px]">{m.text}</div>
              <div className={cx('mt-0.5 text-[11px]', m.from === 'physio' ? 'text-white/70' : 'text-muted')}>
                {m.from === 'patient' ? name : 'You'} · {timeAgo(m.at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={messages.some((m) => m.from === 'patient') ? `Reply to ${name}…` : `Message ${name}…`}
          aria-label={`Message ${name}`}
          className="h-11 flex-1 rounded-full border border-line bg-bg px-4 text-[15px] outline-none focus:border-brand"
        />
        <button aria-label="Send" disabled={!reply.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-40 cursor-pointer">
          <Send size={17} />
        </button>
      </form>
    </>
  )
  return bare ? body : <Card className="p-4">{body}</Card>
}

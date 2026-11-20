import { ArrowDown, ArrowLeft, ArrowUp, Copy, FileText, Image as ImageIcon, Lightbulb, Link2, ListOrdered, Megaphone, Minus, Monitor, Plus, Quote, Send, Smartphone, Trash2, Type } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../../components/ui'
import { api } from '../../lib/api'
import { toast } from '../../lib/platform'
import { ago, day, fmtInt, PageHeading, Panel, PanelHead, Segmented, Tile } from './kit'
import { Chips, Pill, type PillTone, Table } from './parts'

/**
 * Newsletter: write and send the betterhood letter, and see who's subscribed.
 * People join on the website, confirm from the confirmation email (double opt-in), get the welcome email, then
 * every issue sent from here. The email itself is rendered by the API (src/email.ts) so the preview is exact.
 */

// ---------- types (mirror the API) ----------
type Block =
  | { type: 'text'; heading?: string; body: string }
  | { type: 'article'; label?: string; title: string; summary?: string; url: string; image?: string; cta?: string }
  | { type: 'tip'; heading?: string; body: string }
  | { type: 'quote'; text: string; by?: string }
  | { type: 'steps'; heading?: string; items: string }
  | { type: 'image'; src: string; alt?: string; caption?: string; url?: string }
  | { type: 'cta'; heading: string; body?: string; text: string; url: string }
  | { type: 'button'; text: string; url: string }
  | { type: 'divider' }
interface Content {
  eyebrow?: string
  headline: string
  intro?: string
  blocks: Block[]
  signoff?: string
}
type SubStatus = 'pending' | 'subscribed' | 'unsubscribed' | 'bounced' | 'complained'
interface Subscriber {
  id: string
  email: string
  name?: string
  status: SubStatus
  source?: string
  page?: string
  createdAt: string
  confirmedAt?: string
  unsubscribedAt?: string
  lastSentAt?: string
  allowed: boolean
}
interface Stats {
  total: number
  sent: number
  delivered: number
  skipped: number
  failed: number
  bounced: number
  complained: number
}
interface Issue {
  id: string
  kind: 'issue' | 'welcome'
  subject: string
  preheader: string
  content: Content
  status: 'draft' | 'sending' | 'sent'
  createdAt: string
  updatedAt: string
  testSentAt?: string
  sendStartedAt?: string
  sentAt?: string
  stats?: Stats | null
}
interface Config {
  provider: 'resend' | 'log'
  from: string
  allowlist: string[]
  testTo: string[]
  webhook: boolean
  sandboxSender: boolean
}
interface Data {
  config: Config
  counts: Record<SubStatus, number>
  subscribers: Subscriber[]
  issues: Issue[]
}
interface SendRow {
  id: string
  kind: string
  email: string
  status: string
  error?: string
  at: string
}

const SUB_STATUS: Record<SubStatus, { label: string; tone: PillTone; info: string }> = {
  subscribed: { label: 'Subscribed', tone: 'ok', info: 'Confirmed their email. Gets every issue.' },
  pending: { label: 'Waiting to confirm', tone: 'warn', info: 'Signed up but hasn’t clicked the link in the confirmation email yet. Gets nothing until they do.' },
  unsubscribed: { label: 'Unsubscribed', tone: 'muted', info: 'Clicked unsubscribe (or was unsubscribed by admin). Gets nothing.' },
  bounced: { label: 'Bounced', tone: 'bad', info: 'Their mail server rejected our email for good. We stop sending.' },
  complained: { label: 'Marked as spam', tone: 'bad', info: 'Reported our email as spam. We stop sending.' },
}
const SEND_STATUS: Record<string, { label: string; tone: PillTone }> = {
  sent: { label: 'Sent', tone: 'brand' },
  delivered: { label: 'Delivered', tone: 'ok' },
  delayed: { label: 'Delayed', tone: 'warn' },
  skipped: { label: 'Skipped', tone: 'muted' },
  failed: { label: 'Failed', tone: 'bad' },
  bounced: { label: 'Bounced', tone: 'bad' },
  complained: { label: 'Marked as spam', tone: 'bad' },
}

// ---------- small form controls (admin density) ----------
const FIELD = 'w-full rounded-md border border-line bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-faint focus:border-brand disabled:bg-track/50 disabled:text-muted'
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-faint">{hint}</span>}
    </label>
  )
}
function Text({ value, onChange, ...rest }: { value?: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string }) {
  return <input {...rest} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cx(FIELD, 'h-9')} />
}
function Area({ value, onChange, rows = 4, ...rest }: { value?: string; onChange: (v: string) => void; rows?: number; placeholder?: string; disabled?: boolean }) {
  return <textarea {...rest} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cx(FIELD, 'resize-y py-2 leading-relaxed')} />
}
function Btn({ children, onClick, tone = 'default', disabled, title, type = 'button' }: { children: ReactNode; onClick?: () => void; tone?: 'default' | 'primary' | 'danger' | 'ghost'; disabled?: boolean; title?: string; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[14px] font-medium cursor-pointer disabled:cursor-default disabled:opacity-40',
        tone === 'primary' && 'bg-brand text-white hover:bg-brand-ink',
        tone === 'default' && 'border border-line bg-surface text-ink hover:bg-track/60',
        tone === 'danger' && 'border border-line bg-surface text-danger hover:bg-accent-soft',
        tone === 'ghost' && 'text-muted hover:bg-track/60 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

// ---------- screen ----------
export function NewsletterScreen({ token }: { token?: string }) {
  const [d, setD] = useState<Data>()
  const [tab, setTab] = useState<'issues' | 'subscribers' | 'automatic'>('issues')
  const [open, setOpen] = useState<{ kind: 'issue' | 'welcome' | 'confirm'; id?: string }>()

  const load = useCallback(async () => {
    try {
      setD(await api<Data>('/admin/newsletter', { token }))
    } catch (e) {
      toast(errMsg(e, 'Couldn’t load the newsletter'))
    }
  }, [token])
  useEffect(() => {
    load()
  }, [load])

  // While an issue is sending, refresh every few seconds.
  const sending = d?.issues.some((i) => i.status === 'sending')
  useEffect(() => {
    if (!sending) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [sending, load])

  const newIssue = async (copyFrom?: string) => {
    try {
      const r = await api<{ issue: Issue }>('/admin/newsletter/issues', { body: copyFrom ? { copyFrom } : {}, token })
      await load()
      setOpen({ kind: 'issue', id: r.issue.id })
      window.scrollTo(0, 0)
    } catch (e) {
      toast(errMsg(e, 'Couldn’t create the issue'))
    }
  }

  if (!d) return <div className="grid h-60 place-items-center"><div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-label="Loading" /></div>

  if (open) {
    const issue = open.kind === 'welcome' ? d.issues.find((i) => i.kind === 'welcome') : d.issues.find((i) => i.id === open.id)
    return (
      <Editor
        key={open.id ?? open.kind}
        kind={open.kind}
        issue={issue}
        config={d.config}
        audience={d.counts.subscribed}
        token={token}
        onBack={() => {
          setOpen(undefined)
          load()
        }}
        onChanged={load}
        onDuplicate={(id) => newIssue(id)}
      />
    )
  }

  const issues = d.issues.filter((i) => i.kind === 'issue')
  const bad = d.counts.bounced + d.counts.complained
  return (
    <>
      <PageHeading title="Newsletter" actions={<Btn tone="primary" onClick={() => newIssue()}><Plus size={15} /> New issue</Btn>}>
        Write and send the betterhood letter. People join from the website, confirm from the email we send them, get the welcome email, then every issue you send from here.
      </PageHeading>

      <ModeBanner c={d.config} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Subscribed" value={fmtInt(d.counts.subscribed)} info={SUB_STATUS.subscribed.info} note="Gets the next issue" />
        <Tile label="Waiting to confirm" value={fmtInt(d.counts.pending)} info={SUB_STATUS.pending.info} note="Haven’t clicked the link yet" />
        <Tile label="Unsubscribed" value={fmtInt(d.counts.unsubscribed)} info={SUB_STATUS.unsubscribed.info} />
        <Tile label="Bounced or spam" value={fmtInt(bad)} tone={bad ? 'bad' : undefined} info="Addresses that bounced for good or reported us as spam. We stop sending to them." />
      </div>

      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { value: 'issues', label: 'Issues', n: issues.length },
          { value: 'subscribers', label: 'Subscribers', n: d.subscribers.length },
          { value: 'automatic', label: 'Automatic emails', n: 2, info: 'The confirmation and welcome emails, sent on their own when someone signs up and confirms.' },
        ]}
      />

      {tab === 'issues' && (
        <Panel>
          <PanelHead title="Issues" desc="Drafts and sent newsletters. Open one to edit, preview, test or send it." />
          <div className="mt-3">
            <Table
              rows={issues}
              rowKey={(i) => i.id}
              onOpen={(i) => setOpen({ kind: 'issue', id: i.id })}
              empty="No issues yet. Click “New issue” to write the first one."
              cols={[
                {
                  head: 'Subject',
                  className: 'w-[45%]',
                  cell: (i) => (
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{i.subject || <span className="text-faint">No subject</span>}</div>
                      <div className="truncate text-[12px] text-muted">{i.preheader}</div>
                    </div>
                  ),
                },
                { head: 'Status', cell: (i) => <IssueStatus i={i} /> },
                { head: 'Date', cell: (i) => <span className="text-muted">{i.sentAt ? `Sent ${day(i.sentAt)}` : `Edited ${ago(i.updatedAt)}`}</span> },
                { head: 'Recipients', info: 'Sent: accepted by Resend. Delivered: reached the inbox server (needs the Resend webhook). Skipped: not sent because of test mode.', cell: (i) => <StatsLine s={i.stats} /> },
              ]}
            />
          </div>
        </Panel>
      )}

      {tab === 'subscribers' && <Subscribers d={d} token={token} onChanged={load} />}

      {tab === 'automatic' && (
        <Panel>
          <PanelHead title="Automatic emails" desc="These go out on their own. Open one to see exactly what people get, or send yourself a test." />
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {[
              { kind: 'confirm' as const, title: 'Confirmation email', when: 'Sent the moment someone signs up. They must click its link before they get anything else. The wording is fixed, because it’s the consent step.' },
              { kind: 'welcome' as const, title: 'Welcome email', when: 'Sent once, right after someone confirms. You can edit it.' },
            ].map((a) => (
              <li key={a.kind}>
                <button onClick={() => setOpen({ kind: a.kind })} className="flex w-full items-center gap-4 px-5 py-4 text-left cursor-pointer hover:bg-track/50">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                    <Send size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-ink">{a.title}</div>
                    <div className="text-[14px] text-muted">{a.when}</div>
                  </div>
                  <span className="text-[14px] font-medium text-brand">Open →</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  )
}

function ModeBanner({ c }: { c: Config }) {
  const lines: ReactNode[] = []
  if (c.provider === 'log') lines.push(<><b className="text-ink">Resend isn’t connected.</b> Emails are recorded here but not sent. Add RESEND_API_KEY to the API’s settings.</>)
  if (c.allowlist.length) lines.push(<><b className="text-ink">Test mode.</b> Email only goes to {c.allowlist.join(', ')}. Everyone else is recorded as “skipped”. Clear EMAIL_ALLOWLIST to send to everyone.</>)
  if (c.sandboxSender) lines.push(<>Sending from <b className="text-ink">{c.from.replace(/.*</, '').replace('>', '')}</b>, Resend’s test sender, until betterhood.in is verified in Resend. It can only deliver to the Resend account’s own address.</>)
  if (c.provider === 'resend' && !c.webhook) lines.push(<>Delivery, bounce and spam reports are off until the Resend webhook is set up (RESEND_WEBHOOK_SECRET).</>)
  if (!lines.length) return null
  return (
    <div className="rounded-md border border-warn/30 bg-warn-soft/60 px-4 py-3 text-[14px] leading-relaxed text-muted">
      <ul className="space-y-1">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  )
}

function IssueStatus({ i }: { i: Issue }) {
  if (i.status === 'sent') return <Pill tone="ok">Sent</Pill>
  if (i.status === 'sending') return <Pill tone="warn">Sending…</Pill>
  return <Pill tone="muted">Draft</Pill>
}

function StatsLine({ s }: { s?: Stats | null }) {
  if (!s) return <span className="text-faint">-</span>
  const parts = [
    `${fmtInt(s.sent)} sent`,
    s.delivered ? `${fmtInt(s.delivered)} delivered` : '',
    s.skipped ? `${fmtInt(s.skipped)} skipped` : '',
    s.failed ? `${fmtInt(s.failed)} failed` : '',
    s.bounced ? `${fmtInt(s.bounced)} bounced` : '',
    s.complained ? `${fmtInt(s.complained)} spam` : '',
  ].filter(Boolean)
  return <span className="text-muted">{parts.join(' · ')}</span>
}

// ---------- subscribers ----------
function Subscribers({ d, token, onChanged }: { d: Data; token?: string; onChanged: () => void }) {
  const [filter, setFilter] = useState<SubStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const add = async () => {
    setBusy(true)
    try {
      const r = await api<{ confirmSent: boolean; note?: string }>('/admin/newsletter/subscribers', { body: { email, name: name || undefined }, token })
      toast(r.confirmSent ? 'Added. Confirmation email sent.' : r.note ? `Added. Email not sent: ${r.note}` : 'Already on the list.')
      setEmail('')
      setName('')
      onChanged()
    } catch (e) {
      toast(errMsg(e, 'Couldn’t add'))
    } finally {
      setBusy(false)
    }
  }
  const act = async (s: Subscriber, what: 'resend-confirm' | 'unsubscribe') => {
    try {
      await api(`/admin/newsletter/subscribers/${s.id}/${what}`, { body: {}, token })
      toast(what === 'unsubscribe' ? `${s.email} unsubscribed` : 'Confirmation sent again')
      onChanged()
    } catch (e) {
      toast(errMsg(e, 'Couldn’t update'))
    }
  }

  const needle = q.trim().toLowerCase()
  const rows = d.subscribers.filter((s) => (filter === 'all' || s.status === filter) && (!needle || s.email.includes(needle) || (s.name ?? '').toLowerCase().includes(needle)))

  return (
    <Panel>
      <PanelHead title="Subscribers" desc="Everyone who has signed up, newest first. Nobody is ever deleted; unsubscribing just stops the emails." />
      <form
        className="mx-5 mt-4 flex flex-wrap items-end gap-2 rounded-md border border-line bg-track/30 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <div className="w-full sm:w-64">
          <Field label="Email">
            <Text type="email" value={email} onChange={setEmail} placeholder="name@example.com" />
          </Field>
        </div>
        <div className="w-full sm:w-48">
          <Field label="First name (optional)">
            <Text value={name} onChange={setName} />
          </Field>
        </div>
        <Btn type="submit" tone="primary" disabled={busy || !/^\S+@\S+\.\S+$/.test(email)}>
          <Plus size={15} /> Add and send confirmation
        </Btn>
        <p className="w-full text-[12px] text-muted">They still have to click the link in the confirmation email, so we always have their consent.</p>
      </form>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[{ value: 'all' as const, label: 'Everyone', n: d.subscribers.length }, ...(Object.keys(SUB_STATUS) as SubStatus[]).map((k) => ({ value: k, label: SUB_STATUS[k].label, n: d.counts[k] ?? 0, info: SUB_STATUS[k].info }))]}
        />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name" aria-label="Search subscribers" className={cx(FIELD, 'h-8 w-full sm:ml-auto sm:w-60')} />
      </div>
      <Table
        rows={rows}
        rowKey={(s) => s.id}
        empty={d.subscribers.length ? 'Nobody matches.' : 'No subscribers yet. Sign up on the website, or add someone above.'}
        cols={[
          {
            head: 'Subscriber',
            className: 'w-[30%]',
            cell: (s) => (
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{s.email}</div>
                <div className="truncate text-[12px] text-muted">
                  {s.name || 'No name'}
                  {!s.allowed && ' · skipped in test mode'}
                </div>
              </div>
            ),
          },
          { head: 'Status', cell: (s) => <Pill tone={SUB_STATUS[s.status].tone} title={SUB_STATUS[s.status].info}>{SUB_STATUS[s.status].label}</Pill> },
          { head: 'Signed up from', cell: (s) => <span className="text-muted" title={s.page}>{s.source === 'admin' ? 'Added by admin' : s.source || 'Website'}{s.page ? <span className="block truncate text-[12px] text-faint">{s.page}</span> : null}</span> },
          { head: 'Joined', cell: (s) => <span className="text-muted">{day(s.createdAt)}{s.confirmedAt ? <span className="block text-[12px] text-faint">confirmed {day(s.confirmedAt)}</span> : null}</span> },
          { head: 'Last email', cell: (s) => <span className="text-muted">{s.lastSentAt ? ago(s.lastSentAt) : 'Never'}</span> },
          {
            head: '',
            cell: (s) => (
              <div className="flex justify-end gap-1">
                {s.status === 'pending' && <Btn tone="ghost" onClick={() => act(s, 'resend-confirm')}>Resend confirmation</Btn>}
                {(s.status === 'subscribed' || s.status === 'pending') && <Btn tone="ghost" onClick={() => act(s, 'unsubscribe')}>Unsubscribe</Btn>}
              </div>
            ),
          },
        ]}
      />
    </Panel>
  )
}

// ---------- editor ----------
const BLOCKS: { type: Block['type']; label: string; icon: ReactNode; make: () => Block }[] = [
  { type: 'text', label: 'Text', icon: <Type size={15} />, make: () => ({ type: 'text', heading: '', body: '' }) },
  { type: 'article', label: 'Article', icon: <FileText size={15} />, make: () => ({ type: 'article', label: 'Read', title: '', summary: '', url: 'https://betterhood.in/learn/', image: '', cta: 'Read the article' }) },
  { type: 'tip', label: 'Physio tip', icon: <Lightbulb size={15} />, make: () => ({ type: 'tip', heading: 'Physio tip', body: '' }) },
  { type: 'steps', label: 'Steps', icon: <ListOrdered size={15} />, make: () => ({ type: 'steps', heading: '', items: '' }) },
  { type: 'quote', label: 'Quote', icon: <Quote size={15} />, make: () => ({ type: 'quote', text: '', by: '' }) },
  { type: 'image', label: 'Image', icon: <ImageIcon size={15} />, make: () => ({ type: 'image', src: '', alt: '', caption: '', url: '' }) },
  { type: 'cta', label: 'Banner', icon: <Megaphone size={15} />, make: () => ({ type: 'cta', heading: '', body: '', text: 'Take the free assessment', url: 'https://betterhood.in/quiz-landing-page/' }) },
  { type: 'button', label: 'Button', icon: <Link2 size={15} />, make: () => ({ type: 'button', text: '', url: 'https://betterhood.in/' }) },
  { type: 'divider', label: 'Divider', icon: <Minus size={15} />, make: () => ({ type: 'divider' }) },
]
const blockLabel = (t: Block['type']) => BLOCKS.find((b) => b.type === t)?.label ?? t

function Editor({
  kind,
  issue,
  config,
  audience,
  token,
  onBack,
  onChanged,
  onDuplicate,
}: {
  kind: 'issue' | 'welcome' | 'confirm'
  issue?: Issue
  config: Config
  audience: number
  token?: string
  onBack: () => void
  onChanged: () => void
  onDuplicate: (id: string) => void
}) {
  const [subject, setSubject] = useState(issue?.subject ?? '')
  const [preheader, setPreheader] = useState(issue?.preheader ?? '')
  const [c, setC] = useState<Content>(issue?.content ?? { headline: '', blocks: [] })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [html, setHtml] = useState('')
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop')
  const [testTo, setTestTo] = useState(config.testTo.join(', '))
  const [confirmSend, setConfirmSend] = useState(false)
  const [sends, setSends] = useState<SendRow[]>()
  const readOnly = kind === 'confirm' || (kind === 'issue' && issue?.status !== 'draft')
  const draft = useMemo(() => ({ kind, id: issue?.id, subject, preheader, content: c }), [kind, issue?.id, subject, preheader, c])

  const edit = (fn: (c: Content) => Content) => {
    setC(fn)
    setDirty(true)
  }
  const setBlock = (i: number, b: Block) => edit((c) => ({ ...c, blocks: c.blocks.map((x, k) => (k === i ? b : x)) }))
  const move = (i: number, by: number) =>
    edit((c) => {
      const blocks = [...c.blocks]
      const [b] = blocks.splice(i, 1)
      blocks.splice(Math.max(0, Math.min(blocks.length, i + by)), 0, b)
      return { ...c, blocks }
    })

  // Live preview, rendered by the API (debounced).
  const seq = useRef(0)
  useEffect(() => {
    const n = ++seq.current
    const t = setTimeout(async () => {
      try {
        const r = await api<{ html: string }>('/admin/newsletter/preview', { body: kind === 'confirm' ? { kind } : draft, token })
        if (n === seq.current) setHtml(r.html)
      } catch {
        /* keep the last good preview while a field is invalid */
      }
    }, 350)
    return () => clearTimeout(t)
  }, [draft, kind, token])

  // Who it went to (sent issues).
  useEffect(() => {
    if (kind !== 'issue' || !issue || issue.status === 'draft') return
    api<{ sends: SendRow[] }>(`/admin/newsletter/issues/${issue.id}`, { token })
      .then((r) => setSends(r.sends.filter((s) => s.kind === 'issue')))
      .catch(() => undefined)
  }, [kind, issue, token])

  const save = async (quiet = false) => {
    if (!issue || readOnly) return true
    setSaving(true)
    try {
      await api(`/admin/newsletter/issues/${issue.id}`, { method: 'PUT', body: { subject, preheader, content: clean(c) }, token })
      setDirty(false)
      if (!quiet) toast('Saved')
      onChanged()
      return true
    } catch (e) {
      toast(errMsg(e, 'Couldn’t save'))
      return false
    } finally {
      setSaving(false)
    }
  }
  const test = async () => {
    if (dirty && !(await save(true))) return
    const to = testTo.split(',').map((s) => s.trim()).filter(Boolean)
    try {
      const r = await api<{ results: { to: string; status: string; error?: string }[] }>('/admin/newsletter/test', { body: { kind, id: issue?.id, to: to.length ? to : undefined }, token })
      const bad = r.results.filter((x) => x.status !== 'sent')
      toast(bad.length ? `Not sent to ${bad.map((x) => `${x.to} (${x.error})`).join(', ')}` : `Test sent to ${r.results.map((x) => x.to).join(', ')}`)
      onChanged()
    } catch (e) {
      toast(errMsg(e, 'Couldn’t send the test'))
    }
  }
  const sendAll = async () => {
    if (!issue) return
    if (dirty && !(await save(true))) return
    try {
      const r = await api<{ audience: number }>(`/admin/newsletter/issues/${issue.id}/send`, { body: {}, token })
      toast(`Sending to ${fmtInt(r.audience)} subscriber${r.audience === 1 ? '' : 's'}…`)
      onBack()
    } catch (e) {
      toast(errMsg(e, 'Couldn’t send'))
    } finally {
      setConfirmSend(false)
    }
  }
  const remove = async () => {
    if (!issue) return
    try {
      await api(`/admin/newsletter/issues/${issue.id}`, { method: 'DELETE', token })
      toast('Draft deleted')
      onBack()
    } catch (e) {
      toast(errMsg(e, 'Couldn’t delete'))
    }
  }

  const title = kind === 'confirm' ? 'Confirmation email' : kind === 'welcome' ? 'Welcome email' : issue?.status === 'draft' ? 'Edit issue' : 'Sent issue'

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[14px] text-muted cursor-pointer hover:text-ink">
          <ArrowLeft size={15} /> Newsletter
        </button>
        <span className="text-faint">/</span>
        <h1 className="text-[16px] font-semibold text-ink">{title}</h1>
        {issue && kind === 'issue' && <IssueStatus i={issue} />}
        {dirty && <span className="text-[12px] text-warn">Unsaved changes</span>}
        <div className="flex-1" />
        {!readOnly && (
          <Btn tone="primary" onClick={() => save()} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        )}
        {kind === 'issue' && issue && (
          <Btn onClick={() => onDuplicate(issue.id)} title="Start a new draft from this one">
            <Copy size={14} /> Duplicate
          </Btn>
        )}
        {kind === 'issue' && issue?.status === 'draft' && (
          <Btn tone="danger" onClick={remove}>
            <Trash2 size={14} /> Delete draft
          </Btn>
        )}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* left: the form */}
        <div className="flex min-w-0 flex-col gap-4">
          {kind === 'confirm' ? (
            <Panel className="p-5 text-[14px] leading-relaxed text-muted">
              This is the email people get the moment they sign up. They must click its button before they get the welcome email or any issue (double opt-in). Its wording is fixed, because it’s how we record their consent.
            </Panel>
          ) : (
            <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
              <Panel className="space-y-3 p-5">
                <Field label="Subject" hint="What people see in their inbox. Keep it under 60 characters.">
                  <Text value={subject} onChange={(v) => (setSubject(v), setDirty(true))} placeholder="e.g. Your back, your desk and one 2-minute fix" />
                </Field>
                <Field label="Preview text" hint="The grey line shown after the subject in most inboxes.">
                  <Text value={preheader} onChange={(v) => (setPreheader(v), setDirty(true))} />
                </Field>
              </Panel>
              <Panel className="space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                  <Field label="Label">
                    <Text value={c.eyebrow} onChange={(v) => edit((c) => ({ ...c, eyebrow: v }))} placeholder="The betterhood letter" />
                  </Field>
                  <Field label="Headline">
                    <Text value={c.headline} onChange={(v) => edit((c) => ({ ...c, headline: v }))} />
                  </Field>
                </div>
                <Field label="Opening" hint="Write {{first_name}} for the reader’s first name (“there” if we don’t know it). **bold** and [link text](https://…) work.">
                  <Area value={c.intro} onChange={(v) => edit((c) => ({ ...c, intro: v }))} rows={5} />
                </Field>
              </Panel>

              {c.blocks.map((b, i) => (
                <Panel key={i} className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[12px] font-medium uppercase tracking-wide text-muted">{blockLabel(b.type)}</span>
                    <div className="flex-1" />
                    {!readOnly && (
                      <>
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded-md text-muted cursor-pointer hover:bg-track disabled:opacity-30">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" aria-label="Move down" disabled={i === c.blocks.length - 1} onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded-md text-muted cursor-pointer hover:bg-track disabled:opacity-30">
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" aria-label="Remove" onClick={() => edit((c) => ({ ...c, blocks: c.blocks.filter((_, k) => k !== i) }))} className="grid h-7 w-7 place-items-center rounded-md text-muted cursor-pointer hover:bg-accent-soft hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  <BlockFields b={b} onChange={(nb) => setBlock(i, nb)} />
                </Panel>
              ))}

              {!readOnly && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3">
                  <span className="text-[12px] font-medium text-muted">Add a section</span>
                  {BLOCKS.map((b) => (
                    <Btn key={b.type} tone="ghost" onClick={() => edit((c) => ({ ...c, blocks: [...c.blocks, b.make()] }))}>
                      {b.icon} {b.label}
                    </Btn>
                  ))}
                </div>
              )}

              <Panel className="p-5">
                <Field label="Sign-off">
                  <Area value={c.signoff} onChange={(v) => edit((c) => ({ ...c, signoff: v }))} rows={2} />
                </Field>
              </Panel>
            </fieldset>
          )}

          {/* sending */}
          <Panel className="space-y-4 p-5">
            <div>
              <h3 className="text-[16px] font-semibold text-ink">Send a test</h3>
              <p className="mt-1 text-[14px] text-muted">Goes only to the addresses below, with “[Test]” in the subject.{issue?.testSentAt ? ` Last test ${ago(issue.testSentAt)}.` : ''}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <Text value={testTo} onChange={setTestTo} placeholder="you@betterhood.in" />
                </div>
                <Btn onClick={test} disabled={!testTo.trim() && !config.testTo.length}>
                  <Send size={14} /> Send test
                </Btn>
              </div>
            </div>
            {kind === 'issue' && issue?.status === 'draft' && (
              <div className="border-t border-line pt-4">
                <h3 className="text-[16px] font-semibold text-ink">Send to subscribers</h3>
                <p className="mt-1 text-[14px] text-muted">
                  Goes to everyone subscribed right now: <b className="text-ink">{fmtInt(audience)}</b> {audience === 1 ? 'person' : 'people'}
                  {config.allowlist.length ? ` (test mode: only ${config.allowlist.join(', ')} actually get it)` : ''}. Once sent, it can’t be changed.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!confirmSend ? (
                    <Btn tone="primary" onClick={() => setConfirmSend(true)} disabled={!audience}>
                      <Send size={14} /> Send to {fmtInt(audience)} subscriber{audience === 1 ? '' : 's'}
                    </Btn>
                  ) : (
                    <>
                      <Btn tone="primary" onClick={sendAll}>
                        Yes, send it now
                      </Btn>
                      <Btn tone="ghost" onClick={() => setConfirmSend(false)}>
                        Cancel
                      </Btn>
                    </>
                  )}
                </div>
              </div>
            )}
            {kind === 'welcome' && <p className="border-t border-line pt-4 text-[14px] text-muted">Saved changes apply to everyone who confirms from now on. People who already got the welcome email don’t get it again.</p>}
            {kind === 'issue' && issue && issue.status !== 'draft' && (
              <div className="border-t border-line pt-4">
                <h3 className="text-[16px] font-semibold text-ink">{issue.status === 'sending' ? 'Sending now' : `Sent ${day(issue.sentAt)}`}</h3>
                <p className="mt-1 text-[14px]">
                  <StatsLine s={issue.stats} />
                </p>
                {sends && sends.length > 0 && (
                  <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-md border border-line">
                    {sends.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-[14px]">
                        <span className="min-w-0 flex-1 truncate text-ink">{s.email}</span>
                        {s.error && <span className="hidden min-w-0 max-w-[45%] truncate text-[12px] text-muted sm:block" title={s.error}>{s.error}</span>}
                        <Pill tone={SEND_STATUS[s.status]?.tone ?? 'muted'}>{SEND_STATUS[s.status]?.label ?? s.status}</Pill>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>
        </div>

        {/* right: the exact email */}
        <Panel className="min-w-0 overflow-hidden xl:sticky xl:top-[72px]">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-ink">{kind === 'confirm' ? 'Confirm your subscription to the betterhood letter' : subject || 'No subject'}</div>
              <div className="truncate text-[12px] text-muted">From {config.from}</div>
            </div>
            <Segmented
              label="Preview width"
              value={width}
              onChange={setWidth}
              options={[
                { value: 'desktop', label: 'Desktop' },
                { value: 'mobile', label: 'Phone' },
              ]}
            />
            <span className="hidden text-faint sm:inline">{width === 'desktop' ? <Monitor size={15} /> : <Smartphone size={15} />}</span>
          </div>
          <div className="bg-[#fbf7f1]">
            <iframe title="Email preview" srcDoc={html} sandbox="" className="mx-auto block h-[calc(100vh-170px)] min-h-[560px] border-0 bg-[#fbf7f1] transition-[width] duration-300" style={{ width: width === 'desktop' ? '100%' : 375 }} />
          </div>
        </Panel>
      </div>
    </>
  )
}

/** Drop empty optional fields so the API's link checks don't trip on blank image boxes. */
function clean(c: Content): Content {
  return {
    ...c,
    blocks: c.blocks.map((b) =>
      b.type === 'article' && !b.image?.trim() ? { ...b, image: undefined } : b.type === 'image' && !b.url?.trim() ? { ...b, url: undefined } : b,
    ),
  }
}

function BlockFields({ b, onChange }: { b: Block; onChange: (b: Block) => void }) {
  const set = <K extends string>(k: K, v: string) => onChange({ ...b, [k]: v } as Block)
  switch (b.type) {
    case 'text':
      return (
        <div className="space-y-3">
          <Field label="Heading (optional)">
            <Text value={b.heading} onChange={(v) => set('heading', v)} />
          </Field>
          <Field label="Text" hint="Blank line = new paragraph. **bold** and [link text](https://…) work.">
            <Area value={b.body} onChange={(v) => set('body', v)} rows={5} />
          </Field>
        </div>
      )
    case 'article':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <Field label="Label">
              <Text value={b.label} onChange={(v) => set('label', v)} placeholder="Read" />
            </Field>
            <Field label="Title">
              <Text value={b.title} onChange={(v) => set('title', v)} />
            </Field>
          </div>
          <Field label="Summary">
            <Area value={b.summary} onChange={(v) => set('summary', v)} rows={2} />
          </Field>
          <Field label="Link">
            <Text value={b.url} onChange={(v) => set('url', v)} placeholder="https://betterhood.in/learn/…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Field label="Image link (optional)" hint="A https:// image, about 1040 px wide.">
              <Text value={b.image} onChange={(v) => set('image', v)} placeholder="https://…" />
            </Field>
            <Field label="Link text">
              <Text value={b.cta} onChange={(v) => set('cta', v)} placeholder="Read the article" />
            </Field>
          </div>
        </div>
      )
    case 'tip':
      return (
        <div className="space-y-3">
          <Field label="Label">
            <Text value={b.heading} onChange={(v) => set('heading', v)} placeholder="Physio tip" />
          </Field>
          <Field label="Tip">
            <Area value={b.body} onChange={(v) => set('body', v)} rows={3} />
          </Field>
        </div>
      )
    case 'steps':
      return (
        <div className="space-y-3">
          <Field label="Heading (optional)">
            <Text value={b.heading} onChange={(v) => set('heading', v)} placeholder="A 2-minute desk reset" />
          </Field>
          <Field label="Steps" hint="One step per line. They're numbered for you.">
            <Area value={b.items} onChange={(v) => set('items', v)} rows={4} />
          </Field>
        </div>
      )
    case 'quote':
      return (
        <div className="space-y-3">
          <Field label="Quote">
            <Area value={b.text} onChange={(v) => set('text', v)} rows={2} />
          </Field>
          <Field label="Who said it (optional)">
            <Text value={b.by} onChange={(v) => set('by', v)} placeholder="Dr. …, Physiotherapist" />
          </Field>
        </div>
      )
    case 'image':
      return (
        <div className="space-y-3">
          <Field label="Image link" hint="A https:// image (JPG or PNG), about 1040 px wide.">
            <Text value={b.src} onChange={(v) => set('src', v)} placeholder="https://…" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Description" hint="Read out by screen readers, shown if images are off.">
              <Text value={b.alt} onChange={(v) => set('alt', v)} />
            </Field>
            <Field label="Caption (optional)">
              <Text value={b.caption} onChange={(v) => set('caption', v)} />
            </Field>
          </div>
          <Field label="Link when tapped (optional)">
            <Text value={b.url} onChange={(v) => set('url', v)} placeholder="https://" />
          </Field>
        </div>
      )
    case 'cta':
      return (
        <div className="space-y-3">
          <Field label="Heading">
            <Text value={b.heading} onChange={(v) => set('heading', v)} placeholder="Still sore after a week?" />
          </Field>
          <Field label="Text (optional)">
            <Area value={b.body} onChange={(v) => set('body', v)} rows={2} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button text">
              <Text value={b.text} onChange={(v) => set('text', v)} />
            </Field>
            <Field label="Link">
              <Text value={b.url} onChange={(v) => set('url', v)} placeholder="https://" />
            </Field>
          </div>
        </div>
      )
    case 'button':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Button text">
            <Text value={b.text} onChange={(v) => set('text', v)} />
          </Field>
          <Field label="Link">
            <Text value={b.url} onChange={(v) => set('url', v)} placeholder="https://" />
          </Field>
        </div>
      )
    case 'divider':
      return <p className="text-[14px] text-muted">A thin line between sections.</p>
  }
}

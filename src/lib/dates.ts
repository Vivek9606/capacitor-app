export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEK_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad = (n: number) => String(n).padStart(2, '0')

export function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function today(): string {
  return iso(new Date())
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000)
}

/** Monday of the week containing s */
export function weekStart(s: string): string {
  const d = parseISO(s)
  const dow = (d.getDay() + 6) % 7
  return addDays(s, -dow)
}

export function weekDays(s: string): string[] {
  const start = weekStart(s)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function dayShort(s: string): string {
  return DAY_SHORT[parseISO(s).getDay()]
}

export function dayNum(s: string): number {
  return parseISO(s).getDate()
}

/** "Thu, 6 Nov" */
export function fmtDay(s: string): string {
  const d = parseISO(s)
  return `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "6 Nov" */
export function fmtShort(s: string): string {
  const d = parseISO(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "Sep 2026" */
export function fmtMonthYear(s: string): string {
  const d = parseISO(s)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtMonthLong(s: string): string {
  const d = parseISO(s)
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

/** "10:30" -> "10:30 AM" */
export function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${pad(m)} ${ap}`
}

export function relDay(s: string): string {
  const n = diffDays(s, today())
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  return fmtDay(s)
}

export function timeAgo(isoTs: string): string {
  const mins = Math.round((Date.now() - new Date(isoTs).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function nowTs(): string {
  return new Date().toISOString()
}

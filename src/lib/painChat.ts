// Pain chat: talk to Betterhood's physio assistant, then book a free (Betterhood-sponsored) video consult.
// Backend: capacitor-app-backend/src/routes/painChat.ts
import { api } from './api'
import type { Booking, Patient, Physio } from './types'

export type ChatStatus = 'open' | 'ready' | 'red_flag' | 'booked' | 'closed'

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
  at: string
}

export interface PainChat {
  id: string
  status: ChatStatus
  /** 'scripted' = fixed questions, used when the server has no AI key (testing). */
  engine: 'claude' | 'gemini' | 'scripted'
  messages: ChatTurn[]
  assessment: { area: string; stage: string; severity: number; redFlags: string[] }
  physio?: Physio
  booking?: Booking
  freeConsultUsed: boolean
}

export const painChatApi = {
  latest: (token: string) => api<{ chat: PainChat | null; freeConsultUsed: boolean }>('/patient/pain-chat', { token }),
  start: (token: string) => api<{ chat: PainChat }>('/patient/pain-chat', { body: {}, token }),
  send: (token: string, id: string, text: string) => api<{ chat: PainChat }>(`/patient/pain-chat/${encodeURIComponent(id)}/messages`, { body: { text }, token }),
  book: (token: string, id: string, date: string, time: string) =>
    api<{ chat: PainChat; booking: Booking; patient: Patient }>(`/patient/pain-chat/${encodeURIComponent(id)}/book`, { body: { date, time }, token }),
}

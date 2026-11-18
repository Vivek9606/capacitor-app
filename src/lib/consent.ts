// Consents exactly as the person saw them. The backend keeps every one in consents_log (purpose, these words, the
// version, app or web, when). Change VERSION whenever any wording here changes. The website has its own copy of the
// same purposes (betterhood-website-revamp src/scripts/account.ts).
export const CONSENT_VERSION = 'app-2026-11-18'

export type ConsentPurpose = 'terms' | 'share_with_physio' | 'whatsapp_updates'
export interface ConsentItem {
  purpose: ConsentPurpose
  granted: boolean
  version: string
  wording: string
}

export const WORDING = {
  /** Patient sign-up: one tick for the terms and sharing with the physio they're matched with. */
  signup: 'I agree to Betterhood’s Terms and Privacy Policy, and to share my answers with the physio I’m matched with.',
  /** The consent screen for someone who hasn't agreed yet. */
  gate: (physio?: string) => `I agree to share my answers and progress with ${physio ?? 'the physio I’m matched with'}, and to Betterhood’s Terms and Privacy Policy.`,
  whatsapp: 'Send me appointment and care updates on WhatsApp',
} as const

export const consent = (purpose: ConsentPurpose, granted: boolean, wording: string): ConsentItem => ({ purpose, granted, version: CONSENT_VERSION, wording })

/** The terms + sharing pair one tick box stands for. */
export const agreeTo = (wording: string) => [consent('terms', true, wording), consent('share_with_physio', true, wording)]

/** Only a ticked box is recorded: an empty box at sign-in never switches off updates agreed to elsewhere. */
export const whatsappIf = (ticked: boolean | undefined) => (ticked ? [consent('whatsapp_updates', true, WORDING.whatsapp)] : [])

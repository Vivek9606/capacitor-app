import type { Consent, Physio } from './types'

export interface ConsentForm {
  id: string
  title: string
  sub: string
  /** Treatment-plan modalities this form covers (used to nudge the physio before sending). */
  modalities?: string[]
  body: (physio: Physio) => string
}

const who = (p: Physio) => `${p.name}${p.qualification ? `, ${p.qualification}` : ''}${p.clinic?.name ? ` (${p.clinic.name})` : ''}`

const RIGHTS =
  'I understand I can ask questions at any time, refuse or stop any part of treatment, and withdraw this consent by telling my physiotherapist. My health information is kept confidential and shared only with my treating physiotherapist, or as required by law.'

/** Standard consent forms. The exact text is saved with each signature. */
export const CONSENT_FORMS: ConsentForm[] = [
  {
    id: 'general',
    title: 'Assessment & treatment',
    sub: 'General physiotherapy consent — take at the first visit',
    body: (p) =>
      `I consent to a physiotherapy assessment and treatment by ${who(p)}.\n\nThe assessment may include questions about my health, observation, and hands-on examination of movement, strength and joints. Treatment may include exercise, manual therapy, electrotherapy, heat or cold, taping and advice.\n\nThe benefits, likely outcomes, and risks have been explained to me. Common risks include temporary soreness, stiffness or fatigue, usually settling within 24–48 hours. I will tell my physiotherapist about any change in my health, medication, pregnancy, or symptoms during treatment.\n\n${RIGHTS}`,
  },
  {
    id: 'dry_needling',
    title: 'Dry needling',
    sub: 'Required before dry needling',
    modalities: ['Dry needling'],
    body: (p) =>
      `I consent to dry needling by ${who(p)}.\n\nDry needling uses fine, sterile, single-use needles inserted into muscle to reduce pain and tightness. It is not acupuncture and no medicine is injected.\n\nPossible effects include soreness or bruising at the needle site, temporary increase in symptoms, light-headedness or fainting, and — rarely — infection, nerve irritation, or a punctured lung (pneumothorax) when needling near the chest wall.\n\nI have told my physiotherapist if I am pregnant, have a bleeding disorder or take blood thinners, have diabetes, epilepsy, a weakened immune system, a metal allergy, or a fear of needles.\n\n${RIGHTS}`,
  },
  {
    id: 'manual_therapy',
    title: 'Manual therapy & manipulation',
    sub: 'Joint mobilisation and spinal manipulation',
    modalities: ['Manual therapy'],
    body: (p) =>
      `I consent to manual therapy by ${who(p)}, which may include soft-tissue techniques, joint mobilisation and, where appropriate, spinal manipulation (a quick, small movement of a joint that may make a "click").\n\nPossible effects include temporary soreness or stiffness. Serious complications of neck manipulation (such as injury to a blood vessel or stroke) are very rare. I have told my physiotherapist about osteoporosis, recent fractures, inflammatory arthritis, cancer, blood thinners, or dizziness.\n\n${RIGHTS}`,
  },
  {
    id: 'electrotherapy',
    title: 'Electrotherapy',
    sub: 'IFT, TENS, ultrasound and similar',
    modalities: ['IFT', 'TENS', 'Ultrasound'],
    body: (p) =>
      `I consent to electrotherapy (such as IFT, TENS or therapeutic ultrasound) by ${who(p)}.\n\nThese use mild electrical currents or sound waves to ease pain and help healing. I may feel tingling or warmth. Possible effects include skin irritation or, rarely, a minor burn.\n\nI have told my physiotherapist if I have a pacemaker or other implanted device, am pregnant, have cancer, epilepsy, poor skin sensation, or metal implants in the treated area.\n\n${RIGHTS}`,
  },
  {
    id: 'home_visit',
    title: 'Home visit',
    sub: 'Treatment at the patient’s home',
    body: (p) =>
      `I consent to receive physiotherapy at my home from ${who(p)}.\n\nI will make sure there is a safe, clear space for treatment and that an adult family member or carer is present where needed. I understand fees and the cancellation policy for home visits, including travel time.\n\n${RIGHTS}`,
  },
  {
    id: 'group',
    title: 'Group therapy',
    sub: 'Exercise classes and group sessions',
    body: (p) =>
      `I consent to take part in group physiotherapy sessions run by ${who(p)}.\n\nExercises are chosen for the group and adapted where possible. I will work within my own limits, stop if I feel pain, dizziness or breathlessness, and tell the physiotherapist. Other participants may see me exercise; I will respect their privacy too.\n\n${RIGHTS}`,
  },
  {
    id: 'media',
    title: 'Photos & videos',
    sub: 'Recording progress (not for marketing)',
    body: (p) =>
      `I consent to ${who(p)} taking photos or videos of my posture and movement to assess and track my progress.\n\nThese are stored securely as part of my record and are not shared publicly or used for marketing without my separate written permission.\n\n${RIGHTS}`,
  },
  {
    id: 'telehealth',
    title: 'Online consultation',
    sub: 'Video or phone sessions',
    body: (p) =>
      `I consent to physiotherapy by video or phone with ${who(p)}.\n\nAn online session has limits — the physiotherapist cannot examine me by hand. I will take part from a safe space and have someone nearby if needed. I understand that an in-person visit may be recommended.\n\n${RIGHTS}`,
  },
]

export const formById = (id: string) => CONSENT_FORMS.find((f) => f.id === id)

/** Signed, still-valid consent for a form. */
export function hasConsent(consents: Consent[], patientId: string, formId: string) {
  return consents.some((c) => c.patientId === patientId && c.formId === formId && c.status === 'signed')
}

/** Forms a treatment plan's modalities need but the patient hasn't signed. */
export function missingForModalities(consents: Consent[], patientId: string, modalities: string[]): ConsentForm[] {
  return CONSENT_FORMS.filter((f) => f.modalities?.some((m) => modalities.includes(m)) && !hasConsent(consents, patientId, f.id))
}

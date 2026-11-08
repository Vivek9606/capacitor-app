import { Capacitor } from '@capacitor/core'

// One place that decides "native plugin or browser fallback".
// Screens call these and never check the platform themselves.

export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'web' | 'android' | 'ios'

type ToastFn = (msg: string) => void
let toastFn: ToastFn = () => {}
export function registerToast(fn: ToastFn) {
  toastFn = fn
}
export function toast(msg: string) {
  toastFn(msg)
}

export async function copyText(text: string, label = 'Copied'): Promise<void> {
  try {
    if (isNative) {
      const { Clipboard } = await import('@capacitor/clipboard')
      await Clipboard.write({ string: text })
    } else {
      await navigator.clipboard.writeText(text)
    }
    toast(label)
  } catch {
    toast('Couldn’t copy — long-press to copy instead')
  }
}

export async function shareLink(opts: { title: string; text: string; url: string }): Promise<void> {
  try {
    if (isNative) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title })
      return
    }
    if (navigator.share) {
      await navigator.share(opts)
      return
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return
  }
  await copyText(`${opts.text} ${opts.url}`, 'Link copied — paste it anywhere')
}

/** Open WhatsApp with a prefilled message (physio's own WhatsApp — free, no template). */
export function openWhatsApp(phone: string | undefined, text: string) {
  const num = phone ? `91${phone.replace(/\D/g, '').slice(-10)}` : ''
  const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener')
}

export function openMaps(query: string) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener')
}

export async function haptic(kind: 'light' | 'medium' | 'success' = 'light') {
  try {
    if (isNative) {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
      if (kind === 'success') await Haptics.notification({ type: NotificationType.Success })
      else await Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light })
    } else {
      navigator.vibrate?.(kind === 'success' ? [10, 40, 10] : 8)
    }
  } catch {
    /* no haptics available */
  }
}

/** Pick a photo: native camera/gallery sheet, or the browser file picker (which also offers the camera on phones). */
export async function pickPhoto(): Promise<string | undefined> {
  if (isNative) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await Camera.getPhoto({ resultType: CameraResultType.DataUrl, source: CameraSource.Prompt, quality: 80, width: 600 })
      return photo.dataUrl
    } catch {
      return undefined
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(undefined)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

/** Public web address of the app, e.g. https://vivek9606.github.io/capacitor-app (no trailing slash). */
export const WEB_URL = String(
  import.meta.env.VITE_PUBLIC_WEB_URL || (isNative ? 'https://betterhood.in' : `${location.origin}${import.meta.env.BASE_URL}`),
).replace(/\/$/, '')

/** Shown in the UI where we display a link, e.g. "vivek9606.github.io/capacitor-app". */
export const WEB_HOST = WEB_URL.replace(/^https?:\/\//, '')

export function publicUrl(path: string): string {
  // Links that go out on WhatsApp always use the public web address, so they open in a browser
  // for people without the app (and in the app via App Links once the domain is verified).
  return `${WEB_URL}${path}`
}

export async function initNative() {
  if (!isNative) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
  } catch {
    /* ignore */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* ignore */
  }
}

/** Route deep links (App Links / Universal Links) into the in-app router. */
export async function listenDeepLinks(navigate: (path: string) => void) {
  if (!isNative) return
  const { App } = await import('@capacitor/app')
  App.addListener('appUrlOpen', ({ url }) => {
    try {
      const u = new URL(url)
      navigate(u.pathname + u.search)
    } catch {
      /* ignore malformed */
    }
  })
}

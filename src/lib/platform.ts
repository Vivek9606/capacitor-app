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

/** Open a page outside the app's own screens: the system browser on the web, an in-app browser sheet in the app. */
export function openLink(url: string) {
  if (isNative) {
    openInApp(url)
    return
  }
  window.open(url, '_blank', 'noopener')
}

/**
 * Pages that can't be framed (the Shopify checkout): an in-app browser sheet on top of the app (Custom Tabs /
 * SFSafariViewController) that closes back into the app. On the web, a new tab.
 */
export async function openInApp(url: string) {
  if (isNative) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url, toolbarColor: '#5E1951', presentationStyle: 'popover' })
      return
    } catch {
      /* fall through */
    }
  }
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

/**
 * Shrinks a photo to a small square-ish JPEG (longest side `max` px) so it fits the API's limit (~300 KB).
 * Phone camera photos are several MB, which the server rejects.
 */
export function shrinkPhoto(src: string, max = 512, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('no canvas'))
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Couldn’t read that image'))
    img.src = src
  })
}

/** Pick a photo: native camera/gallery sheet, or the browser file picker (which also offers the camera on phones). */
export async function pickPhoto(): Promise<string | undefined> {
  let raw: string | undefined
  if (isNative) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await Camera.getPhoto({ resultType: CameraResultType.DataUrl, source: CameraSource.Prompt, quality: 80, width: 800, correctOrientation: true })
      raw = photo.dataUrl
    } catch {
      return undefined
    }
  } else {
    raw = await new Promise<string | undefined>((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) return resolve(undefined)
        const url = URL.createObjectURL(file)
        resolve(url)
      }
      input.click()
    })
  }
  if (!raw) return undefined
  try {
    let out = await shrinkPhoto(raw)
    if (out.length > 380_000) out = await shrinkPhoto(raw, 384, 0.72)
    return out
  } catch {
    toast('Couldn’t use that photo. Try a different one.')
    return undefined
  } finally {
    if (raw.startsWith('blob:')) URL.revokeObjectURL(raw)
  }
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

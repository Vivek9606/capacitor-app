import { api, apiMode } from './api'
import { isNative, platform } from './platform'

/**
 * Push notifications (native app only), through Firebase Cloud Messaging.
 *
 * Off unless the build sets VITE_PUSH=on: on Android, registering without google-services.json in android/app
 * crashes the app, so a build only turns push on once Firebase is set up (see docs/push-notifications.md).
 * After sign-in the app asks for permission, registers this device with the API (POST /me/push-token), and
 * tapping a notification opens the screen it names (data.path).
 */
export const pushOn = isNative && apiMode && import.meta.env.VITE_PUSH === 'on'
const KEY = 'bh-push-token'

let listening = false
let wired = false
let current: string | undefined
/** Call once at start-up with the router's navigate: tapping a notification opens its screen. */
export async function listenPushTaps(navigate: (path: string) => void) {
  if (!pushOn || listening) return
  listening = true
  const { PushNotifications } = await import('@capacitor/push-notifications')
  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const path = notification.data?.path
    if (typeof path === 'string' && path.startsWith('/')) navigate(path)
  })
}

/** After sign-in: ask for permission (once; the system remembers the answer) and register this device. */
export async function enablePush(token: string) {
  if (!pushOn) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return
    if (platform === 'android') await PushNotifications.createChannel({ id: 'default', name: 'Updates from betterhood', importance: 4 }).catch(() => {})
    current = token
    if (!wired) {
      wired = true
      // Firebase can hand out a new token at any time: always register it for whoever is signed in now.
      await PushNotifications.addListener('registration', ({ value }) => {
        try { localStorage.setItem(KEY, value) } catch { /* ignore */ }
        if (current) api('/me/push-token', { body: { token: value, platform: platform === 'ios' ? 'ios' : 'android' }, token: current }).catch(() => {})
      })
      await PushNotifications.addListener('registrationError', (e) => console.warn('[push] registration failed', e.error))
    }
    await PushNotifications.register()
  } catch (e) {
    console.warn('[push]', e)
  }
}

/** On sign-out: stop notifications to this device for that account. */
export function disablePush(token?: string) {
  if (!pushOn) return
  let device: string | null = null
  try { device = localStorage.getItem(KEY) } catch { /* ignore */ }
  current = undefined
  if (device && token) api('/me/push-token', { method: 'DELETE', body: { token: device }, token }).catch(() => {})
}

// Signed in on betterhood.in → signed in here too, and the other way round. One account, two front doors.
// The website opens the app at …#handoff=<code> (a 2-minute, single-use code from POST /auth/handoff); we swap
// it for our own session (POST /auth/handoff/redeem). The fragment never reaches a server, and the code is
// removed from the address bar before anything else runs. See the website's src/scripts/account.ts.
const KEY = 'bh_handoff'

/** Called once at startup (before captureWebsiteResult): keeps the code and the page it was meant for. */
export function captureHandoff() {
  const m = /(?:^#|&)handoff=([A-Za-z0-9_-]{20,64})/.exec(window.location.hash)
  if (!m) return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ code: m[1], path: window.location.pathname }))
  } catch {
    /* private mode: no handoff, the normal sign-in still works */
  }
  const rest = window.location.hash.slice(1).split('&').filter((p) => !p.startsWith('handoff=')).join('&')
  history.replaceState(history.state, '', window.location.pathname + window.location.search + (rest ? `#${rest}` : ''))
}

/** The waiting code, removed as it is read. */
export function takeHandoff(): { code: string; path: string } | undefined {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return undefined
    sessionStorage.removeItem(KEY)
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * Open a betterhood.in page signed in as this account. The tab is opened straight away (inside the tap, so it
 * isn't blocked as a pop-up) and pointed at the signed-in link once the code arrives.
 */
export async function openWebsiteSignedIn(link: () => Promise<string>, isNative: boolean, openInApp: (url: string) => unknown) {
  if (isNative) {
    openInApp(await link())
    return
  }
  const w = window.open('', '_blank')
  const url = await link()
  if (w) {
    w.opener = null
    w.location.href = url
  } else window.location.href = url
}

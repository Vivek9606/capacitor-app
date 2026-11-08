# Betterhood — physio + patient app

One codebase, one app, two roles (**physio** and **patient**). Every flow works in the browser — nobody has to install anything — and the same build ships as an Android/iOS app via Capacitor for people who want native extras.

Design source: Figma "Betterhood Physio App — MVP UI/UX Flow" (PNG exports in `figma-exports/`). Patient screens and desktop layouts follow the same visual system.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 (also on your LAN for phone testing)
npm run build        # production web build in dist/
```

## Demo mode vs. API mode

- **Demo mode** (default, no env): everything runs in the browser on seeded data in `localStorage`. The logins below work; nothing leaves the device.
- **API mode**: set `VITE_API_URL` to the backend ([capacitor-app-backend](https://github.com/Vivek9606/capacitor-app-backend)) at build time:

  ```bash
  cp .env.example .env.local    # VITE_API_URL=https://<your-api>
  npm run build
  ```

  Logins then use real WhatsApp OTPs, data is stored in Postgres (Supabase), and the demo hints / "Reset demo data" are hidden.
  Actions update the screen instantly and sync to the API in order; if a save fails the app shows the error and reloads from the server.
  Make sure the web origin is listed in the backend's `CORS_ORIGINS` (the Capacitor app origins are always allowed).

### Demo logins (demo mode)

| Who | How |
|---|---|
| Physio | Log in with `9876543210`, OTP `123456` |
| Patient (via WhatsApp link) | Open `/plan/riya-3wk`, last 4 digits `1223` |
| Patient (via login) | `9845011223`, OTP `123456` |
| New physio sign-up | Any other mobile number, OTP `123456` |
| Public profile | `/dr/ananya-rao` |
| Invite landing | `/join?ref=ANANYA-BH` |

Data lives in `localStorage`. **Profile → Reset demo data** restores the seed.

## Native apps

```bash
npm run cap:android  # build, sync, open Android Studio
npm run cap:ios      # build, sync, open Xcode (macOS only)
```

Needs Android Studio + JDK 17+ for Android, and a Mac with Xcode (or a cloud Mac such as Codemagic / GitHub Actions macOS) for iOS.
Deep links for `https://betterhood.in/plan/…`, `/dr/…`, `/join` are declared in the Android manifest; they also need `/.well-known/assetlinks.json` (Android) and `apple-app-site-association` + Associated Domains (iOS) on the web host.

## Hosting the web app

It's a single-page app: any static host works as long as unknown paths fall back to `index.html` (`vercel.json` and `public/_redirects` handle Vercel/Netlify).

## Structure

```
src/
  lib/
    types.ts       domain model (matches the API / DB)
    store.tsx      data layer — optimistic local state + ordered API writes (or demo data)
    api.ts         API client (VITE_API_URL)
    seed.ts        demo data (relative to today)
    logic.ts       adherence, schedules, profile completion
    platform.ts    native plugin OR browser fallback (share, clipboard, haptics, camera, deep links)
  components/      UI kit matching the Figma (Button, Chip, Card, Sheet, WeekDots, WhatsAppPreview…)
  screens/
    auth/          O1–O4 onboarding, /plan/:token patient entry, /join
    physio/        H1–H2, P1–P2, Patients, R1–R5, B1–B3, G1–G2, C1–C2
    patient/       Today, guided session, My plan, Rx/PDF, Visits, Book, Ask, Profile
    public/        /dr/:slug public profile with booking request
```

Layout is responsive: bottom tab bar on phones, sidebar + multi-column screens on desktop (≥1024px).

## What's mocked in Phase 1 (→ Phase 2)

- **Auth/OTP** — any number, code `123456` → Supabase auth + WhatsApp `auth_otp` template via an edge function.
- **WhatsApp messages** (plan shared, booking confirmation, reminders, replies) — shown as previews, not sent → WhatsApp Business API provider.
- **Data** — localStorage → Supabase (Postgres + RLS per physio/patient).
- **Exercise videos** — placeholders → Supabase Storage / video CDN, curated in the admin tool.
- **Rx PDF** — browser print-to-PDF on web → server-rendered PDF (works in the app too).
- **Push notifications** — not wired → FCM/APNs via `@capacitor/push-notifications`.
- **Public profile SEO / link previews** — client-rendered → prerender `/dr/*` and `/plan/*` meta tags at the edge.
- Admin tool (verification queue, exercise CMS) — not built yet.

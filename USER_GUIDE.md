# Betterhood: user and testing guide

How the app is set up, how to log in, what to test, and how to try it as an Android/iOS app.

> This repo is **public**. Never put passwords, the database URL or `JWT_SECRET` in this file or anywhere else in the code. They live only in the DigitalOcean dashboard and in the backend's git-ignored `.env`.

---

## 1. What's where

| Piece | Where | Repo |
|---|---|---|
| Website (physio and patient app) | https://capacitor-app-three.vercel.app | [Vivek9606/capacitor-app](https://github.com/Vivek9606/capacitor-app) |
| Backend API | https://lionfish-app-snwe2.ondigitalocean.app (check: `/health` → `{"ok":true}`) | [Vivek9606/capacitor-app-backend](https://github.com/Vivek9606/capacitor-app-backend) |
| Database | Supabase (Postgres), project `jdcdzkewcvnrcvzoitzd`, tables in schema `app` | — |
| Android / iOS app | Same code as the website, wrapped with Capacitor (`android/`, `ios/`) | capacitor-app |

There is **one app with two roles**:
- **Physio:** builds care plans and treatment plans, manages bookings, walk-ins and group sessions, sends invoices and consent forms, tracks patients.
- **Patient:** does the exercises, logs pain, sees visits, asks questions.

Both roles work fully in the browser, so nobody has to install anything. The Android/iOS app is optional.

Pushing to `main` redeploys automatically: Vercel rebuilds the website and DigitalOcean rebuilds the backend. The backend applies database changes and refreshes the exercise library every time it starts.

---

## 2. Demo mode vs live mode

| | Demo mode | Live mode |
|---|---|---|
| When | The website or app was built **without** `VITE_API_URL` | Built **with** `VITE_API_URL` set to the backend |
| Data | Fake demo data stored in the browser only | Real data in Supabase |
| Login code | Always `123456` | Sent on WhatsApp (or `OTP_DEV_CODE` while testing) |
| How to tell | Blue "Demo — physio 9876543210…" box on the login screen, and "Reset demo data" in Profile | No demo box, no reset option |

---

## 3. How login works (no passwords)

Nobody has a password. People log in with their mobile number and a one-time code.

| Who | How they get in |
|---|---|
| **Physio** | `/login` → mobile number → 6-digit code on WhatsApp. A new number goes to a 30-second sign-up. |
| **Patient, first time** | Taps "Open my plan" in the WhatsApp message (`/plan/<token>`) → enters the **last 4 digits** of their mobile → agrees to share progress once. No code needed. |
| **Patient, later** | `/login` → mobile number → code on WhatsApp, or tap the plan link again. |

Security built in:
- Codes expire after 10 minutes, allow 5 wrong tries, and at most 5 codes per hour per number.
- The plan link locks for 30 minutes after 5 wrong "last 4 digits" attempts.
- Each person sees only their own data.

### Until WhatsApp is set up
Codes are **not sent anywhere** while `WHATSAPP_PROVIDER=log`. For testing, add `OTP_DEV_CODE=123456` in DigitalOcean (see section 6). Every number then accepts **123456**.
**Remove it before real users arrive**, because while it's set anyone can log in as anyone.

---

## 4. Test accounts (demo data in the database)

| Who | Login | Notes |
|---|---|---|
| Physio: **Dr. Ananya Rao** | `9876543210` + code | Has patient Riya, an active plan, bookings, a message, and a booking request from Arjun |
| Patient: **Riya Sharma** | Plan link **/plan/riya-3wk**, last 4 digits **1223** | No code needed |
| Patient: **Riya Sharma** | `9845011223` + code | Same account via login |
| New physio | Any other 10-digit mobile + code | Goes through sign-up |
| Public profile | **/dr/ananya-rao** | No login; anyone can request a booking |
| Invite link | **/join?ref=ANANYA-BH** | Sign-up with a referral |

**Reset the demo data** (from the backend folder, with its `.env`): `npm run seed:demo`. This restores Ananya and Riya; it doesn't touch other accounts.

---

## 5. What to test

### Physio (log in as 9876543210)
1. **Home:** profile progress, today's appointments, "Needs your attention" (Arjun's request → **Accept**).
2. **Patients → Riya:** history, pain trend, adherence.
3. **Care plan:**
   - Go to **Create → Care plan + treatment plan**, or open Riya's plan and choose **Adjust plan**.
   - Add or drag exercises, then set sets/reps.
   - Add treatment plan notes (diagnosis, advice, modalities, follow-up). If a modality needs consent (e.g. dry needling, IFT) and the patient hasn't signed, you'll see a warning.
   - On **Preview**, tap **Send on WhatsApp**.
   - Or tap **Use my WhatsApp** to send the link from your own WhatsApp.
4. **Tracking:** this week's sessions, pain chart, reply to Riya's question, **Send nudge**.
5. **Schedule → New booking:** pick a patient, visit type, a day on the calendar and an open time (times already taken, blocked or used by a group class are hidden), and choose whether to send a WhatsApp confirmation.
6. **Schedule → Block:** block a whole day or a time range (leave, hospital rounds). Blocked time disappears from every booking page.
7. **Attendance:** on today's appointments tap **Arrived** when the patient walks in, then **Visit done**, or **No-show**. No-shows show in the patient's visit history and attendance rate.
8. **Walk-in:** **Create → Walk-in**. Pick an existing patient or type a new name and mobile. They go straight into the **Waiting** queue on Home.
9. **Group sessions:** **Create → Group session** (title, date, time, seats, fee, repeat weekly). Open it to add people, mark **Attended / No-show**, message everyone, or create an invoice per participant.
10. **Invoices:** **Create → Invoice**, or **Create invoice** on a finished visit. Send on WhatsApp (with a UPI pay link if you added your UPI id under **Invoices → Billing settings**), then **Record payment**.
11. **Consent forms:** **Create → Consent form** or Patient → **Consents**. Either the patient signs now on your device, or you send it and they sign in their app.
12. **Learn → PhysioPreneurship:** a short course on running your practice. Mark lessons done; progress shows on Home.
13. **Profile:** edit details; **Practice setup** (own clinic, home visits, individual practice, or any mix: clinic address, other places you consult, home-visit area and travel time, fees); **Availability** (weekly hours with breaks, gap between appointments, notice period); share your booking page link.
14. **Refer a physio / Partner with Betterhood / Community** (waitlist; on mobile it's in the Profile menu).

### Patient (plan link /plan/riya-3wk → 1223)
1. **Consent** screen, shown the first time only.
2. **Today:** today's session → **Start** → follow each exercise → finish → log pain (0–10).
3. **My plan:** all exercises and the treatment plan (download or print as PDF).
4. **Consent:** Today shows a **Please sign** card for the electrotherapy consent → read it → type name, sign with a finger → **I agree — sign**. Signed forms are listed in Profile.
5. **Visits:** upcoming appointments → **Confirm** or **Reschedule**; book a visit or a group class; missed visits show as **Missed**; **Bills** opens each invoice with a **Pay with UPI** button.
6. **Ask:** send a question to the physio. It shows up on the physio's Tracking screen.

### Public profile and booking page (logged out)
- **/dr/ananya-rao** shows the clinic, home-visit area and upcoming group classes.
- **/dr/ananya-rao/book** is the Calendly-style page: choose a visit type (or a group class) → day → time → name, mobile (and address for a home visit) → **Request booking**. It appears on Ananya's Home as a request. Group seats are taken straight away until the class is full.

### Check data is really saved (live mode)
Do something as the physio (for example, reply to Riya), then open the plan link as Riya in a private window. The reply should be there.

---

## 6. Configuration reference

### Vercel (website): Settings → Environment Variables
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://lionfish-app-snwe2.ondigitalocean.app` |

After changing it, go to **Deployments → ⋯ → Redeploy** (without the build cache). It only takes effect in a new build.

### DigitalOcean (backend): App → Settings → App-Level Environment Variables
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `DATABASE_URL` | Supabase **session pooler** URL (encrypted; see the backend README). Not `db.<ref>.supabase.co`, which DigitalOcean can't reach. |
| `JWT_SECRET` | Long random string (encrypted). Changing it logs everyone out. |
| `CORS_ORIGINS` | `https://capacitor-app-three.vercel.app` (exact, no trailing slash; comma-separate more) |
| `PUBLIC_WEB_URL` | `https://capacitor-app-three.vercel.app` (used in WhatsApp links) |
| `WHATSAPP_PROVIDER` | `log` for now, `meta` once WhatsApp is set up |
| `OTP_DEV_CODE` | `123456`, **testing only; delete before launch** |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | From Meta, when WhatsApp is set up |

The Android/iOS app doesn't need to be in `CORS_ORIGINS`; it's always allowed.

---

## 7. Testing it as an Android app (next steps)

The app is the same website packaged for Android, so everything above applies. It just runs from an icon on your phone.

### Step 1: Install the tools on your PC (once)
- **Android Studio** (https://developer.android.com/studio). It includes Java and the Android SDK. Open it once and let it finish downloading components.
- On your phone, turn on **Developer options → USB debugging** (Settings → About phone → tap *Build number* 7 times).

### Step 2: Point the app at the live backend
In this project folder, create a file named **`.env.local`** containing:
```
VITE_API_URL=https://lionfish-app-snwe2.ondigitalocean.app
VITE_PUBLIC_WEB_URL=https://capacitor-app-three.vercel.app
```
- `VITE_API_URL` makes the app use real data. Without it, the app runs in demo mode.
- `VITE_PUBLIC_WEB_URL` makes the links the app shares (plan links, profile links) point to the Vercel site.
- `.env.local` is git-ignored, so it isn't committed.

### Step 3: Build and open in Android Studio
```bash
npm install
npm run cap:android
```
This builds the website, copies it into `android/` and opens Android Studio. The first Gradle sync takes a few minutes.

> **Java version:** Android Studio ships with Java 25, which is too new for this project's Gradle. Use **JDK 21**:
> - In Android Studio, go to **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** and pick `jdk-21` (or *Download JDK… → version 21*).
> - From the command line (PowerShell, in `android/`):
>   ```powershell
>   $env:JAVA_HOME = "$env:USERPROFILE\.jdks\jdk-21.0.13+9"
>   .\gradlew.bat assembleDebug
>   ```
> - `android/local.properties` must use forward slashes: `sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk`.
> - If the Gradle download times out, set `$env:JAVA_TOOL_OPTIONS = "-Djava.net.preferIPv4Stack=true"` first.

### Step 4: Put it on your phone
- **Quickest:** plug the phone in by USB, select it at the top of Android Studio, and press **▶ Run**.
- **As an APK file:** choose **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. The file is `android/app/build/outputs/apk/debug/app-debug.apk`. Send it to your phone (WhatsApp, Drive or USB), open it, and allow "Install unknown apps".

After any code change, run `npm run cap:android` again and reinstall.

### Step 5: What to test in the app specifically
- Login with your own number (needs `OTP_DEV_CODE` or WhatsApp; see section 3).
- **Profile photo:** uses the phone camera or gallery.
- **Share** buttons open the native Android share sheet.
- **WhatsApp** buttons open the WhatsApp app.
- Status bar and back button behaviour, plus the keyboard covering inputs.
- **Two phones (best test):** physio on one phone, patient on another. Send a plan to the patient's number and open the link with the patient's last 4 digits.

### Known limits for now
- **Links open in the browser, not the app.** Tapping a `/plan/...` link opens the website. Opening it straight in the app needs the app's own domain plus an `assetlinks.json` file hosted on it, which is a later step once there's a real domain such as betterhood.in.
- **The debug APK is for testing only.** For the Play Store you need a signed release build (an `.aab` file) and a Google Play Developer account ($25 one-time). Internal testing on Play is the easiest way to share with testers.

### iOS
iOS needs a **Mac with Xcode** (or a cloud Mac service such as Codemagic) and an **Apple Developer account** ($99/year).
- On the Mac, run `npm run cap:ios`, then press Run in Xcode with an iPhone connected.
- To share with testers, use TestFlight.

---

## 8. Before real users (checklist)

- [ ] **Change the Supabase database password** (it was shared in chat), then update `DATABASE_URL` in DigitalOcean.
- [ ] Set up WhatsApp:
  - Create the 6 message templates in Meta Business Manager (listed in the backend README).
  - Set the `WHATSAPP_*` variables and `WHATSAPP_PROVIDER=meta`.
  - Point the webhook at `https://<backend>/webhooks/whatsapp`.
- [ ] **Delete `OTP_DEV_CODE`** in DigitalOcean.
- [ ] Optionally delete the demo accounts (Ananya, Riya, Arjun) from the database.
- [ ] Custom domains:
  - Website, e.g. `betterhood.in` on Vercel.
  - API, e.g. `api.betterhood.in` on DigitalOcean.
  - Then update `VITE_API_URL`, `CORS_ORIGINS` and `PUBLIC_WEB_URL`.
- [ ] Terms and Privacy Policy pages (linked from login and consent).
- [ ] Move profile photos to file storage (currently stored in the database, max ~300 KB).

---

## 9. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Login screen still shows the blue "Demo" box | Website was built without `VITE_API_URL`. Set it in Vercel and redeploy. |
| "Can't reach Betterhood. Check your connection" | Backend is down, or `CORS_ORIGINS` doesn't exactly match the website address. Check `/health`, then the variable. |
| "Code expired" / no code arrives | WhatsApp isn't set up. Use `OTP_DEV_CODE` while testing. |
| "This link has expired" on /plan/… | Wrong token, or the demo data was reset. Run `npm run seed:demo` in the backend. |
| Changes don't appear on the other device | Data refreshes when you switch back to the app or tab (after 30 s away), or when you reload the page. |
| Backend deploy fails | DigitalOcean → app → **Activity / Runtime Logs**. Look for `Invalid environment` (missing variable) or database connection errors (check the pooler URL). |
| `/` on the backend shows "Not Found" | Normal for older deploys. The API has no home page; use `/health`. |

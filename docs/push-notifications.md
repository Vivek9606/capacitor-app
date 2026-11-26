# Push notifications

The app registers each signed-in device with the API (`POST /me/push-token`). The backend sends through Firebase
Cloud Messaging (FCM): directly to Android, and to iPhones through Apple. Tapping a notification opens the screen named
in its `data.path`.

What sends a push today (backend):
- Care plan or prescription shared, a physio's reply, booking confirmed, booking reminder (about 2 hours before).
- Nudges: check your health score (1–7 days after a pain assessment), your exercises are waiting (no session for 2 days).

Push stays **off** in a build until `VITE_PUSH=on`. On Android, registering without Firebase set up crashes the app.

## 1. Firebase project (once)
1. https://console.firebase.google.com → Add project → "betterhood" (Analytics not needed).
2. Add an **Android app**: package `in.betterhood.app`. Download `google-services.json` into `android/app/`.
   `android/app/build.gradle` applies the Google services plugin automatically when that file exists.
3. Add an **iOS app**: bundle ID `in.betterhood.app`. Download `GoogleService-Info.plist`.
4. Project settings → Service accounts → **Generate new private key**. That JSON goes to the backend as `FCM_SERVICE_ACCOUNT`
   (in AWS Secrets Manager, `betterhood/backend/env`). Never commit it.

`google-services.json` and `GoogleService-Info.plist` identify the app. They are not secrets, but keep them out of
the public repo anyway (add them to the native build step, or commit them only in a private repo).

## 2. iPhone (Xcode, once)
1. Apple Developer → Keys → create an **APNs key** (.p8). Upload it in Firebase → Project settings → Cloud Messaging → Apple app configuration.
2. Xcode → App target → Signing & Capabilities → add **Push Notifications** and **Background Modes → Remote notifications**.
3. Drag `GoogleService-Info.plist` into `ios/App/App` (target: App).
4. `ios/App/Podfile`, in `target 'App'`: add `pod 'FirebaseMessaging'`, then run `npx cap sync ios`.
5. `ios/App/App/AppDelegate.swift`: Capacitor hands the app Apple's token, and the backend needs Firebase's. Swap them:

```swift
import FirebaseCore
import FirebaseMessaging

// in application(_:didFinishLaunchingWithOptions:)
FirebaseApp.configure()

func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
    Messaging.messaging().token { token, error in
        if let error = error {
            NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
        } else if let token = token {
            NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
        }
    }
}

func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
}
```

## 3. Turn it on
- App: build with `VITE_PUSH=on` (with `VITE_API_URL` as usual), then `npx cap sync`.
- Backend: `PUSH_PROVIDER=fcm` and `FCM_SERVICE_ACCOUNT=<the JSON>`.
- Test: sign in on a phone and allow notifications. The admin dashboard shows "Push on" for that person.
  `POST /admin/nudges/run` sends any nudges that are due.

Web (the app in a browser) doesn't get push. Those people get WhatsApp, if they opted in.

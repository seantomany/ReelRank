# ReelRank — Deploying the iOS App to Your Phone

## Prerequisites

- macOS with Node.js 18+ installed
- An Apple Developer account (seantomany@icloud.com)
- The Expo CLI: `npm install -g eas-cli`
- Logged into Expo: `eas login` (use your Expo account @stomany)
- Logged into Apple: `eas credentials` will prompt you when needed

---

## Option A: Install via TestFlight (Recommended)

This is the easiest way. A production build has already been submitted.

1. **On your iPhone**, install **TestFlight** from the App Store (free, made by Apple)
2. Open **TestFlight** — you should see **ReelRank** listed under your apps
3. Tap **Install** next to the latest build
4. If ReelRank doesn't appear in TestFlight, go to [App Store Connect](https://appstoreconnect.apple.com/apps/6761116734/testflight/ios) on your Mac and:
   - Click **Internal Testing** in the left sidebar
   - If no group exists, click **+** to create one, name it anything (e.g. "Testers")
   - Add your Apple ID email as a tester
   - Apple sends an invite email — open it on your iPhone, it redirects to TestFlight
5. Wait ~5-10 min after submission for Apple to finish processing the build

---

## Option B: Local Build & Deploy (Recommended)

Builds the app on your Mac — no queue, takes ~5 minutes total.

Run these commands from `apps/mobile`:

### Step 1: Build the iOS app locally

```bash
cd apps/mobile
EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli build --platform ios --profile production --local --non-interactive
```

- Builds directly on your Mac using Xcode (~5 min)
- Skips the EAS free tier queue entirely
- Outputs an `.ipa` file in the `apps/mobile/` directory (e.g. `build-1774544493373.ipa`)
- The `fix-fmt-consteval` config plugin auto-patches a C++ compatibility issue with Xcode 26

### Step 2: Submit to App Store Connect

```bash
npx eas-cli submit --platform ios --path ./build-XXXXXXXXX.ipa --non-interactive
```

Replace `XXXXXXXXX` with the actual filename from Step 1. Takes ~2 min.

### Step 3: Install via TestFlight

Follow the TestFlight steps in Option A above. Allow ~5-10 min for Apple to process.

---

## Option C: Remote Build (Fallback)

If local builds aren't working, you can build on EAS servers instead. Free tier has a queue (can be minutes to hours).

```bash
cd apps/mobile
EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli build --platform ios --profile production --non-interactive
```

Then submit the latest remote build:

```bash
npx eas-cli submit --platform ios --latest --non-interactive
```

---

## Troubleshooting

### "Build failed — fingerprint error"

Run with fingerprint skipped:

```bash
EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli build --platform ios --profile production --non-interactive
```

### "Provisioning profile doesn't support..."

The credentials are managed remotely by Expo. To reset them:

```bash
npx eas-cli credentials --platform ios
```

Select "Remove Provisioning Profile" then rebuild — EAS creates a new one automatically.

### Local build fails with "consteval" errors

The `fix-fmt-consteval` config plugin in `plugins/fix-fmt-consteval.js` handles this automatically. If you still see these errors, make sure `app.config.js` includes the plugin:

```js
plugins: ['expo-font', './plugins/fix-fmt-consteval'],
```

### Build succeeds but app crashes on launch

Check that `apps/mobile/src/utils/notifications.ts` is a no-op (no `require('expo-notifications')` calls). The `expo-notifications` native module is NOT included in the build.

### TestFlight says "No Builds Available"

- Wait 5-10 minutes after `eas submit` for Apple to finish processing
- Check [App Store Connect](https://appstoreconnect.apple.com/apps/6761116734/testflight/ios) to see if the build is still "Processing"
- Make sure you've added yourself as an internal tester (see Option A step 4)

### "eas-cli: command not found"

```bash
npm install -g eas-cli
eas login
```

---

## Key Details

| Field | Value |
|---|---|
| Bundle ID | `com.reelrank.app` |
| EAS Project ID | `1ab5830b-ef5e-4dbe-8808-a269399e6155` |
| ASC App ID | `6761116734` |
| Apple Team ID | `S3GP5KY3UF` |
| Apple ID | seantomany@icloud.com |
| Expo Account | @stomany |
| Current Version | 1.0.0 |
| Latest Build Number | 28 |
| API URL | https://reel-rank-api.vercel.app |
| TestFlight Link | https://appstoreconnect.apple.com/apps/6761116734/testflight/ios |

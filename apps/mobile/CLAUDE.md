# Mobile App

Expo 52 / React Native 0.76 app with React Navigation.

## Navigation (`src/navigation/index.tsx`)

Splash gate → onboarding (first launch) → auth split:

**Unauthenticated**: `LoginScreen` (email/password only)

**Authenticated bottom tabs** (each wrapped in `ErrorBoundary`):
- Home → `HomeScreen`
- Discover → `SoloSwipeScreen`
- AI → `AIScreen`
- Group → `GroupScreen`
- Profile → `ProfileScreen`

**Stack screens**: SoloSwipe, Search, ThisOrThat, MovieDetail, LogWatched, CreateRoom, JoinRoom, Lobby, SubmitMovies, GroupSwipe, GroupResults, Settings, Friends, FriendProfile, AI, Stats, FriendActivity

## Key Components (`src/components/`)

- `SwipeDeck` — Reanimated + Gesture Handler card stack with imperative swipeLeft/swipeRight
- `MovieCard` — card presentation inside SwipeDeck
- `RankFlowModal` — post-log triage + binary insert ranking flow
- `MovieSearchBar` — debounced TMDB search for group submit
- `MemberList` — room member display with host badge
- `ScoreBreakdown` — group results ranked list with score bars
- `ErrorBoundary` — class boundary with retry for each tab

## Auth

`src/context/AuthContext.tsx` — Firebase Auth with `getReactNativePersistence(AsyncStorage)`. Email/password sign-in/up, `getIdToken` for API calls.

Firebase config loaded from `expo-constants` extra fields (set in `app.config.js`).

## API Client

`src/utils/api.ts` — `apiFetch` with Bearer token, `cachedGet` (60s TTL in-memory Map). Namespaced `api` object mirrors all backend endpoints.

## Realtime

`src/config/ably.ts` — singleton Ably.Realtime with authCallback posting to `/api/auth/ably-token`. `src/hooks/useRoom.ts` — Ably subscription + 4s polling fallback.

## Styling

- React Native Paper MD3 dark theme (`src/theme/index.ts`)
- Design tokens: `colors`, `spacing`, etc.
- Expo Haptics for tactile feedback

## Build & Deploy

EAS Build profiles in `eas.json`:
- `development` — dev client, internal distribution
- `development-simulator` — iOS simulator
- `preview` — internal testing
- `production` — App Store (auto-increment build number)

All profiles inject Firebase config + `API_URL` via env vars.

Bundle ID: `com.reelrank.app`

See `DEPLOY_MOBILE.md` at repo root for full TestFlight/EAS workflow.

## Known Issues

- Push notifications are stubbed (`src/utils/notifications.ts` returns null/no-ops) — the registration calls exist in HomeScreen but produce nothing
- Profile watchlist reorder (up/down chevrons) only updates local state, doesn't persist to server
- `fix-fmt-consteval` plugin in `plugins/` patches Podfile for Xcode 26 `consteval` issue
- Metro config has monorepo-aware `watchFolders` pointing to repo root (`../..`)
- Delete account button in settings shows "contact support" — not implemented yet
- Firebase API keys are in `eas.json` in plain text — should move to EAS secrets before public release

## Auth

- `getIdToken(true)` in AuthContext forces token refresh on every call — prevents stale tokens after Firebase's 1hr expiry
- Settings screen privacy/terms URLs point to `reelrank.vercel.app`

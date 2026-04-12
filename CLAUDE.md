# ReelRank

Movie discovery, ranking, and group decision-making app. Monorepo with three apps and a shared package.

## Project Structure

```
apps/api/      → Next.js 15 API backend (port 3001, deployed on Vercel)
apps/web/      → Next.js 15 web frontend (port 3000, deployed on Vercel)
apps/mobile/   → Expo 52 / React Native 0.76 (EAS Build → TestFlight)
packages/shared/ → Zod schemas, TypeScript types, constants (imported as @reelrank/shared)
```

## Quick Start

```bash
pnpm install                  # install all dependencies
pnpm dev:api                  # start API on :3001
pnpm dev:web                  # start web on :3000
pnpm dev:mobile               # start Expo dev server
pnpm build                    # build everything (turbo)
pnpm test                     # run all tests (vitest)
pnpm lint                     # lint all packages
```

Build shared first when making type/schema changes: `turbo run build --filter=@reelrank/shared`

## Environment Variables

### API (`apps/api/.env`)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — Firebase Admin SDK
- `TMDB_API_KEY` — The Movie Database API
- `ABLY_API_KEY` — realtime messaging for group mode
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — rate limiting
- `ANTHROPIC_API_KEY` — AI chat (Claude Haiku)

### Web (`apps/web/.env.local`)
- `NEXT_PUBLIC_API_URL` — points to API (e.g. `http://localhost:3001`)
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config (apiKey, authDomain, projectId, etc.)

### Mobile (`apps/mobile/.env`)
- `API_URL` — points to API
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, etc.

## Architecture

### Auth Flow
1. Client authenticates via Firebase Auth (Google/Apple sign-in on web, email/password on mobile)
2. Client sends `Authorization: Bearer <Firebase ID token>` on every API request
3. API verifies token with Firebase Admin SDK, loads/creates user in Firestore

### Database (Firestore Collections)
`users`, `soloSwipes`, `pairwiseChoices`, `watchedMovies`, `rankedLists`, `rooms` (with subcollections: `members`, `movies`, `swipes`, `results`, `bonusRounds`), `friendships`, `friendRequests`, `ratingComments`

### External Services
- **TMDB** — movie data, search, trending, discover, recommendations, streaming providers
- **Ably** — realtime pub/sub for group room events (member join/leave, swipe progress, results, bonus rounds)
- **Anthropic Claude** — AI movie recommendation chatbot (SSE streaming, claude-haiku-4-5-20251001)
- **Upstash Redis** — sliding-window rate limiting per IP:userId

### Key Algorithms
- **ELO Rating** — solo pairwise comparisons adjust movie scores (K=32, initial 1500)
- **Beli Ranking** — position-based scoring for explicit ranked lists
- **Simple Majority** — group: % right-swipes per member count
- **ELO Group** — group: pairwise ELO from swipe data
- **Ranked Choice** — group: instant-runoff voting elimination

### Room Lifecycle
`lobby` → `submitting` → `swiping` → `results` (host advances each phase, Ably broadcasts status)

## Code Conventions

- **TypeScript strict** everywhere, path alias `@/*` → `./src/*` in all apps
- **Zod validation** on all API inputs — schemas live in `packages/shared/src/schemas.ts`
- **Shared types** in `packages/shared/src/types.ts` — imported as `@reelrank/shared`. `RoomMember` includes `swipeCount?` and `doneAt?` for group swiping progress
- **API middleware pattern**: `withAuth`, `withAuthAndRateLimit`, `withRateLimitMiddleware`, `withErrorHandling` — compose these to wrap route handlers in `apps/api/src/lib/middleware.ts`
- **API responses**: always `{ data: T }` on success, `{ error: string, requestId: string }` on failure
- **Web styling**: Tailwind CSS v4 with `@theme` tokens in `globals.css`, Framer Motion for animations, hand-rolled shadcn-style UI components (CVA + cn pattern)
- **Mobile styling**: React Native Paper (MD3 dark theme), Reanimated for gesture animations
- **No state management library** — React Context for auth, local useState for everything else, Ably + polling for realtime

## Deployment

- **Web + API**: Vercel (auto-deploy from GitHub pushes to main)
- **Mobile**: EAS Build → TestFlight (see DEPLOY_MOBILE.md)
- **CI**: GitHub Actions runs build + test on push/PR to main

## Gotchas

- `shamefully-hoist=true` in `.npmrc` — required for React Native monorepo compatibility
- Push notifications are stubbed on mobile (`apps/mobile/src/utils/notifications.ts` returns null/no-ops)
- Firebase security rules allow any authenticated user to read/write — real access control is via Admin SDK in the API
- The `fix-fmt-consteval` Expo plugin patches Podfile for Xcode 26 compatibility
- Mobile metro config has monorepo-aware `watchFolders` pointing to repo root
- Room codes are stored in both Redis (24h TTL for fast lookup) and Firestore
- API `next.config.js` uses `serverExternalPackages: ['ably']` — required because Ably's Node.js bundle has native deps that webpack can't resolve
- API root layout exports `dynamic = 'force-dynamic'` — all API routes need runtime env vars (Firebase, TMDB, Redis), so static prerendering is disabled
- Web `next.config.ts` has `eslint: { ignoreDuringBuilds: true }` — ESLint v9 has compat issues with eslint-config-next; lint separately via CI
- Web `next.config.ts` includes `remotePatterns` for `image.tmdb.org`, `lh3.googleusercontent.com`, and `firebasestorage.googleapis.com` for Next.js Image optimization
- Mobile `getIdToken(true)` force-refreshes Firebase tokens on every API call to prevent stale token issues after 1hr
- Bonus round Ably events (`BONUS_STARTED`, `BONUS_VOTE`, `BONUS_COMPLETED`) are defined in shared `ABLY_EVENTS` constant — never use string literals for event names
- Profile watchlist reorder on mobile only updates local state, doesn't persist to server
- Mobile delete account button shows "contact support" — not implemented yet

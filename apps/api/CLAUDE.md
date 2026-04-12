# API App

Next.js 15 backend running on port 3001. All routes are under `src/app/api/`.

## Route Handler Pattern

Every route uses middleware composition from `src/lib/middleware.ts`:

```typescript
// Authenticated + rate-limited
export const POST = withAuthAndRateLimit('general', async (req, { user, requestId, params }) => {
  // user is verified, rate limit checked
  return NextResponse.json({ data: result });
});

// Public with rate limiting only
export const GET = withRateLimitMiddleware('movieSearch', async (req, { requestId }) => { ... });

// Auth only (no rate limit)
export const PATCH = withAuth(async (req, { user, requestId }) => { ... });

// Error handling only (public, no rate limit)
export const GET = withErrorHandling(async (req, { requestId }) => { ... });
```

## Route Map

- `auth/` — verify, profile (PATCH username), photo (POST/DELETE), ably-token
- `movies/` — search, trending, genres, discover, [id] detail, [id]/providers
- `solo/` — swipe, swiped-ids, ranking, rank, pairwise, daily-rec, insights, lists, watched, suggestions, stats, status
- `rooms/` — create, join, pin, history, [code] (GET/PATCH), [code]/start, [code]/submit (POST/DELETE), [code]/swipe, [code]/leave, [code]/results, [code]/bonus-round
- `social/` — friends, requests (GET/POST/PATCH), feed, comments (GET/POST), movie-friends, profile/[userId]
- `users/` — search, push-token
- `ai/` — chat (SSE streaming), movie-search, movie-card/[id]

## Library Files (`src/lib/`)

| File | Purpose |
|------|---------|
| `auth.ts` | `authenticateRequest()` — verify Firebase token, load/upsert user |
| `middleware.ts` | `withAuth`, `withAuthAndRateLimit`, `withRateLimitMiddleware`, `withErrorHandling` |
| `errors.ts` | `ApiError` class, `createRequestId()`, `handleApiError()` |
| `firebase-admin.ts` | Singleton Firebase Admin init from env service account |
| `firestore.ts` | Singleton Firestore db + `COLLECTIONS` enum |
| `redis.ts` | Upstash Redis client singleton |
| `rate-limit.ts` | Sliding-window rate limits via Redis sorted sets |
| `ably.ts` | `publishToRoom()`, Ably token request generation |
| `tmdb.ts` | TMDB API wrapper (search, trending, discover, recommendations, genres, detail) |
| `algorithms.ts` | `computeSimpleMajority`, `computeEloGroup`, `computeRankedChoice` |
| `route-helpers.ts` | JSON body parsing, room code validation, `findRoomByCode`, `verifyRoomMembership` |
| `env.ts` | Lazy env var getters with runtime validation |
| `uuid.ts` | UUID v4 via `crypto.randomBytes` |

## Firestore Collections

`users`, `soloSwipes`, `pairwiseChoices`, `watchedMovies`, `rankedLists`, `rooms` (subcollections: `members`, `movies`, `swipes`, `results`, `bonusRounds`), `friendships`, `friendRequests`, `ratingComments`

## Rate Limit Tiers

- `movieSearch`: 30 req/min per IP
- `roomJoin`: 10 req/min per IP
- `general`: 60 req/min per IP:userId

## Tests

Vitest in `__tests__/` — `algorithms.test.ts` (group ranking), `schemas.test.ts` (Zod validation). Run: `pnpm test --filter=@reelrank/api`

## AI Chat Route

`ai/chat` is a custom handler (not using `withAuth` wrapper) — calls `authenticateRequest` directly, gathers Firestore context (watchlist, rankings, history, genre prefs), then streams Anthropic claude-haiku-4-5-20251001 via SSE.

## Build Configuration

- `next.config.js` uses `serverExternalPackages: ['ably']` — Ably's Node.js bundle includes native deps (`got`, `decompress-response`, `mimic-response`) that webpack can't resolve; this tells Next.js to keep Ably as an external require
- Root `layout.tsx` exports `dynamic = 'force-dynamic'` — prevents Next.js from trying to prerender API routes at build time (they all need Firebase/TMDB/Redis env vars at runtime)
- All routes are dynamic (`ƒ` in build output) — no static prerendering
- `social/feed` uses centralized `safeGetMovieById()` from `@/lib/tmdb` (not raw `process.env.TMDB_API_KEY`)
- `social/profile/[userId]` uses Firestore `.count()` aggregation for accurate `moviesWatched` totals (not limited by query `.limit()`)
- `rooms/[code]` returns `doneAt` as ISO string or null (never boolean)
- Bonus round events use `ABLY_EVENTS.BONUS_STARTED/BONUS_VOTE/BONUS_COMPLETED` from shared constants
- Social feed sort handles Firestore Timestamp objects by converting to ISO strings before comparing

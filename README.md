# ReelRank

Discover, rank, and decide on movies — solo or with friends. A full-stack monorepo with a Next.js API, React web app, and React Native/Expo mobile app.

## Features

### Solo Mode
- **Swipe to Discover** — Tinder-style card deck for trending movies or filtered by genre. Swipe right to add to your watchlist, left to pass.
- **This or That** — Pairwise comparisons that refine your personal Elo-based movie rankings over time.
- **Log Watched** — Record what you've seen with a rating (1–10), venue, date, and notes.
- **Profile & Rankings** — View your ranked list, watchlist, watched history, and stats (total ranked, watched count, win rate).

### Group Mode
- **Create or Join Rooms** — Generate a 6-character room code and invite friends.
- **Submit Movies** — Each member adds movies to the group pool.
- **Group Swipe** — Everyone swipes independently on the shared pool.
- **Results** — Three pluggable ranking algorithms determine the group's top pick:
  - `simple_majority_v1` — percentage of right swipes
  - `elo_group_v1` — Elo ratings derived from each user's swipe preferences
  - `ranked_choice_v1` — ranked-choice voting from individual orderings
- **Real-Time Updates** — Ably powers live member joins, room status changes, swipe progress, and results notifications.

## Architecture

```
ReelRank/
├── apps/
│   ├── api/          Next.js 15 API (App Router, serverless on Vercel)
│   ├── web/          Next.js 15 web app (React 19, Tailwind 4, Framer Motion)
│   └── mobile/       Expo SDK 52 / React Native 0.76
├── packages/
│   └── shared/       Zod schemas, TypeScript types, constants
├── turbo.json        Turborepo task config
├── pnpm-workspace.yaml
└── vercel.json       Vercel deployment config
```

### Key Patterns
- **Shared validation** — `@reelrank/shared` keeps API, web, and mobile aligned on Zod schemas and domain types.
- **Auth middleware** — API routes compose `withAuth`, `withRateLimit`, and `withAuthAndRateLimit` wrappers for Firebase token verification and IP-based rate limiting via Upstash Redis.
- **Elo ranking** — Solo pairwise choices update per-movie Elo ratings (`K=32`, initial `1500`). Rankings blend Elo score with swipe signal.
- **Distributed locking** — Group results use a Redis lock to prevent double computation, then cache in Firestore.
- **Monorepo Metro** — Mobile Metro config resolves `node_modules` at both project and monorepo root for proper workspace package resolution.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Next.js 15, Firebase Admin SDK, Upstash Redis, Ably, Zod |
| **Web** | Next.js 15, React 19, Tailwind CSS 4, Framer Motion, Firebase Auth, Ably |
| **Mobile** | Expo 52, React Native 0.76, React Navigation 7, React Native Paper, Firebase Auth, Ably, Reanimated |
| **Shared** | TypeScript, Zod |
| **Infrastructure** | Vercel (API hosting), EAS Build (mobile CI), Firebase (auth + Firestore), Upstash (Redis), Ably (realtime), TMDB (movie data) |

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm 9.x (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- iOS: Xcode (for simulator) or an Expo Go / dev client build for device testing

### Install

```bash
git clone https://github.com/seantomany/ReelRank.git
cd ReelRank
pnpm install
```

### Environment Variables

Copy the example files and fill in your credentials:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

**API** (`apps/api/.env`):
| Variable | Description |
|----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key (PEM format) |
| `TMDB_API_KEY` | TMDB v3 API key |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` |
| `ABLY_API_KEY` | Ably API key for realtime |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

**Mobile** (`apps/mobile/.env`):
| Variable | Description |
|----------|-------------|
| `FIREBASE_API_KEY` | Firebase web API key |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `FIREBASE_APP_ID` | Firebase app ID |
| `API_URL` | API base URL (`http://localhost:3001` for local dev) |

**Web** (`apps/web/.env.local`):
Same as mobile but prefixed with `NEXT_PUBLIC_` (e.g. `NEXT_PUBLIC_FIREBASE_API_KEY`), plus `NEXT_PUBLIC_API_URL`.

### Run Locally

```bash
# API (port 3001)
pnpm dev:api

# Web (port 3000)
pnpm dev:web

# Mobile (Expo dev server)
pnpm dev:mobile
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/verify` | Verify Firebase token, return user |
| POST | `/api/auth/ably-token` | Generate scoped Ably token for a room |

### Movies (TMDB proxy)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/movies/trending` | Trending movies (paginated) |
| GET | `/api/movies/search` | Search by query |
| GET | `/api/movies/discover` | Discover by genre |
| GET | `/api/movies/genres` | List genres |
| GET | `/api/movies/[id]` | Movie details by TMDB ID |

### Solo
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/solo/swipe` | Record a swipe (want/pass) |
| POST | `/api/solo/pairwise` | Record a pairwise choice |
| GET | `/api/solo/ranking` | Get Elo-based rankings |
| GET | `/api/solo/lists?type=want\|pass` | Get watchlist or passed movies |
| GET | `/api/solo/status?movieId=` | Get user status for a movie |
| GET | `/api/solo/stats` | Get user stats |
| POST | `/api/solo/watched` | Log a watched movie |
| GET | `/api/solo/watched` | Get watched history |

### Rooms (Group)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/rooms/create` | Create a room |
| POST | `/api/rooms/join` | Join by code |
| GET | `/api/rooms/history` | User's room history |
| GET | `/api/rooms/[code]` | Room details + members + movies |
| POST | `/api/rooms/[code]/submit` | Add movie to room pool |
| POST | `/api/rooms/[code]/start` | Advance room phase (host only) |
| POST | `/api/rooms/[code]/swipe` | Record group swipe |
| GET | `/api/rooms/[code]/results` | Compute/fetch results |
| POST | `/api/rooms/[code]/leave` | Leave room |

## Mobile Screens

| Screen | Description |
|--------|-------------|
| Login | Email/password auth (sign in + sign up) |
| Home | Stats, quick actions, trending carousel, genre browse |
| Discover (SoloSwipe) | Swipe card deck with genre filtering |
| Search | Debounced movie search with quick-add to watchlist |
| Movie Detail | Full movie info, watchlist toggle, log watched |
| Log Watched | Rating, venue, notes entry |
| This or That | Side-by-side pairwise comparison |
| Profile | Rankings, watchlist, and watched tabs with stats |
| Group | Create/join rooms, recent room history |
| Create Room | One-tap room creation |
| Join Room | 6-character code entry |
| Lobby | Live member list, room code display, host controls |
| Submit Movies | Search and add movies to room pool |
| Group Swipe | Swipe through the room's movie deck |
| Group Results | Winner reveal with score breakdown |

## Deployment

### API (Vercel)
The API is deployed to Vercel at `https://reelrank-api.vercel.app`. The `vercel.json` at the repo root configures pnpm + Turborepo builds targeting `@reelrank/api`.

### Mobile (EAS Build)
EAS Build handles iOS and Android builds in the cloud. Profiles are configured in `apps/mobile/eas.json`:
- **development** — Dev client with internal distribution
- **preview** — Internal distribution for testing
- **production** — App Store / TestFlight submission with auto-incrementing build numbers

```bash
cd apps/mobile

# Development build (requires Apple Developer credentials)
npx eas-cli build --profile development --platform ios

# Production build
npx eas-cli build --profile production --platform ios

# Submit to TestFlight
npx eas-cli submit --platform ios --latest
```

## License

Private project. All rights reserved.

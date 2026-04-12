# Web App

Next.js 15 frontend on port 3000 with App Router.

## Page Structure

All authenticated pages live under `src/app/(main)/` which wraps with `AuthGuard` + `Navbar`.

| Route | Page |
|-------|------|
| `/` | Home — stats greeting, trending hero, watchlist/suggestions/recently watched strips |
| `/discover` | Swipe deck with genre chips, log-watched sheet, RankFlowModal |
| `/search` | Full-page movie search (debounced) |
| `/ai` | Streaming AI chat with inline movie cards |
| `/this-or-that` | Pairwise ranking refinement (optional `?source=watchlist`) |
| `/stats` | Insights dashboard with Recharts |
| `/profile` | Rankings / watchlist / watched tabs, links to stats and friends |
| `/settings` | Photo upload, username edit, sign out |
| `/movie/[id]` | Movie detail — backdrop, watchlist toggle, where to watch, friends who watched |
| `/movie/[id]/log` | Log watched form → RankFlowModal |
| `/group` | Create/join rooms, room history, pin/unpin |
| `/group/create` | Room name + per-person movie cap |
| `/group/join` | OTP-style code entry |
| `/group/[code]` | Lobby with member list, host controls |
| `/group/[code]/submit` | Search/add movies, Ably + polling |
| `/group/[code]/swipe` | Group swipe deck with progress tracking |
| `/group/[code]/results` | Winner, rankings, vote breakdown, bonus round |
| `/friends` | User search, requests, friend list, activity feed |
| `/friends/[userId]` | Friend profile, compatibility, comments |
| `/privacy` | Static privacy policy (public, no auth guard) |

## Components

- `auth-guard.tsx` — shows `LandingPage` if not authenticated, children if authenticated
- `navbar.tsx` — desktop top nav + mobile bottom tabs (Home, Discover, AI, Group, Profile)
- `search-modal.tsx` — Cmd/Ctrl+K search palette
- `rank-flow-modal.tsx` — post-log triage zones + binary search insert into ranked list
- `landing-page.tsx` — marketing page with Framer Motion, hero, feature grid, auth modal
- `login-form.tsx` — email/password + Google/Apple sign-in
- `ui/` — hand-rolled shadcn-style primitives (button, input, skeleton, slider, tabs) using CVA + `cn`

## Styling

- Tailwind CSS v4 via `@import "tailwindcss"` in `globals.css`
- Custom `@theme` tokens: `--color-bg`, `--color-surface`, `--color-accent` (#ff2d55), etc.
- Google Outfit font loaded in root layout
- Framer Motion for page transitions, swipe deck, micro-interactions
- Recharts for stats visualizations
- Sonner for toasts (dark themed)

## Auth

`src/context/auth-context.tsx` — Firebase `onAuthStateChanged`, Google/Apple popup or redirect, email/password. `AuthGuard` gates all `(main)/` routes.

## API Client

`src/lib/api.ts` — waits for auth readiness, attaches Bearer token, retries on 401 with refreshed token. Base URL from `NEXT_PUBLIC_API_URL`.

## Realtime

`src/lib/ably.ts` — Ably client with token auth from `/api/auth/ably-token`. Group pages also poll as backup.

## Build Configuration

- `next.config.ts` has `eslint: { ignoreDuringBuilds: true }` — ESLint v9 has compatibility issues with `eslint-config-next`; run lint separately
- `next.config.ts` includes `remotePatterns` for TMDB images, Google user photos (`lh3.googleusercontent.com`), and Firebase Storage (`firebasestorage.googleapis.com`)
- Settings page uses `<img>` (not Next.js `<Image>`) for profile photos because they can be base64 data URLs from canvas upload
- Group results page uses typed `ABLY_EVENTS.BONUS_STARTED/BONUS_COMPLETED` from shared constants (not string literals)
- Home page Stats interface includes `uniqueRanked` field (no `as any` casts needed)

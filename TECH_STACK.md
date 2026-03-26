# ReelRank Tech Stack & Tools Breakdown

> Comprehensive reference for interview preparation — explains every technology used and why.

---

## Architecture Overview

ReelRank is a **monorepo** with three main packages:
- `apps/web` — Next.js web app
- `apps/api` — Next.js API backend
- `apps/mobile` — Expo React Native mobile app
- `packages/shared` — Shared types, schemas, and constants

---

## Frontend — Web

| Technology | Version | Why |
|---|---|---|
| **Next.js 15** | 15.x | React framework with App Router, server components, API routes, and automatic code splitting. Chosen for its full-stack capabilities and seamless Vercel deployment. |
| **React 19** | 19.x | Latest React with concurrent features and improved performance. |
| **TypeScript** | 5.x | Type safety across the entire codebase, catching bugs at compile time. |
| **Tailwind CSS v4** | 4.x | Utility-first CSS framework. Rapid prototyping with consistent design tokens. |
| **Framer Motion** | Latest | Declarative animations for page transitions, swipe gestures, and micro-interactions. |
| **Lucide React** | Latest | Modern icon library — lightweight, tree-shakeable SVG icons. |
| **Sonner** | Latest | Toast notification library — clean, accessible, auto-dismissing. |

---

## Frontend — Mobile

| Technology | Version | Why |
|---|---|---|
| **Expo SDK 52** | 52.x | Managed workflow for React Native — simplifies native builds, OTA updates, and device APIs. |
| **React Native** | 0.76 | Cross-platform mobile framework. Single codebase for iOS and Android. |
| **React Native Paper** | Latest | Material Design component library for consistent UI (buttons, cards, snackbars). |
| **Expo Router / React Navigation** | v6 | Stack and tab navigation with deep linking support. |
| **React Native Gesture Handler** | Latest | Native-driven gesture recognition for swipe deck interactions. |
| **React Native Reanimated** | Latest | 60fps animations running on the UI thread for smooth swipe cards. |
| **Expo Haptics** | Latest | Tactile feedback on swipe, tap, and save actions. |
| **Expo Notifications** | Latest | Local and push notification scheduling for daily recommendations and group reminders. |
| **Expo Clipboard** | Latest | Copy room codes to clipboard for easy sharing. |
| **AsyncStorage** | Latest | Persistent key-value storage for onboarding state and local preferences. |
| **EAS Build** | Latest | Cloud build service for producing signed iOS/Android binaries. |

---

## Backend — API

| Technology | Version | Why |
|---|---|---|
| **Next.js API Routes** | 15.x | Co-located with the web app, supports serverless deployment. Route handlers with middleware pattern. |
| **Firebase Admin SDK** | Latest | Server-side Firebase authentication verification and Firestore access. |
| **Firestore** | Latest | NoSQL document database — real-time sync, automatic scaling, no server management. |
| **Upstash Redis** | Latest | Serverless Redis for rate limiting. Per-user and per-IP rate limits to prevent abuse. |
| **Ably** | Latest | Real-time messaging for group room events (member joins, movie submissions, swipe progress). |

---

## AI & Machine Learning

| Technology | Why |
|---|---|
| **Anthropic Claude API** (claude-haiku-4-5-20251001) | AI chatbot for personalized movie recommendations. Chose Haiku for cost efficiency (~$0.001/conversation) while maintaining quality. |
| **Server-Sent Events (SSE)** | Streaming AI responses for real-time chat UX — users see tokens appear as they're generated. |
| **Context Injection** | Server gathers user's watchlist, rankings, watch history, and genre preferences, injecting them into the system prompt so Claude can make informed suggestions. |

---

## Authentication

| Technology | Why |
|---|---|
| **Firebase Auth** | Google and Apple Sign-In with minimal setup. Handles OAuth flows, token refresh, and session persistence. |
| **Firebase Admin SDK** | Server-side token verification — every API request validates the JWT. |
| **getReactNativePersistence** | Mobile auth persistence using AsyncStorage so users stay logged in. |

---

## Database — Firestore Collections

| Collection | Purpose |
|---|---|
| `users` | User profiles, display names, push tokens |
| `soloSwipes` | Individual movie swipe decisions (right/left) |
| `pairwiseChoices` | This-or-That comparison results for ELO scoring |
| `watchedMovies` | Logged watched movies with ratings, venue, notes |
| `rankedLists` | User's ranked movie lists |
| `rooms` | Group mode rooms with subcollections for members, movies, swipes, results |
| `friendships` | Bidirectional friend relationships |
| `friendRequests` | Pending friend request queue |
| `ratingComments` | Comments on friends' movie ratings |

---

## External APIs

| API | Purpose |
|---|---|
| **TMDB (The Movie Database)** | Movie data, posters, trending, search, genres, discover, recommendations, and streaming provider information. |
| **Anthropic Claude** | AI-powered movie recommendation chatbot. |
| **Ably** | Real-time pub/sub for group mode events. |

---

## Algorithms

| Algorithm | Where Used | How It Works |
|---|---|---|
| **ELO Rating** | Solo rankings | Pairwise comparisons adjust movie scores like chess ratings. Winners gain points, losers lose points, with magnitude based on expected outcome. |
| **Simple Majority** | Group mode | Movies ranked by percentage of right-swipes from all group members. Ties broken by popularity bonus. |
| **ELO Group** | Group mode (option) | Pairwise ELO computed from group swipe data for more nuanced rankings. |
| **Ranked Choice** | Group mode (option) | Instant-runoff voting — eliminates lowest-voted movie each round until a winner emerges. |

---

## DevOps & Deployment

| Tool | Purpose |
|---|---|
| **Vercel** | Web and API hosting. Automatic deployments from GitHub pushes. Serverless functions for API routes. |
| **GitHub** | Source control, PR-based workflow. |
| **EAS Build** | Cloud iOS/Android builds with automatic code signing and credential management. |
| **TestFlight** | iOS beta testing distribution. |
| **App Store Connect** | iOS app submission and metadata management. |
| **pnpm** | Fast, disk-efficient package manager with workspace support for monorepo. |
| **Turborepo** | Monorepo build orchestration — caches builds, runs tasks in parallel. |

---

## Monorepo Structure

```
ReelRank/
├── apps/
│   ├── api/          # Next.js API backend
│   ├── web/          # Next.js web frontend
│   └── mobile/       # Expo React Native app
├── packages/
│   └── shared/       # Types, schemas, constants
├── turbo.json        # Turborepo configuration
├── pnpm-workspace.yaml
└── package.json
```

**Why a monorepo?** Shared types and schemas between web, API, and mobile ensure consistency. A change to a Zod schema or TypeScript interface is immediately reflected everywhere, eliminating API contract drift.

---

## Key Design Decisions

1. **Zod schemas in shared package** — Single source of truth for validation. Used in API routes (server-side validation) and could be used client-side too.

2. **Firebase over PostgreSQL** — NoSQL flexibility, real-time listeners, serverless scaling, no database server to manage. Trade-off: no JOINs, but document model fits our data well.

3. **Ably + polling hybrid** — Ably provides instant real-time events for group mode, with polling as a fallback for reliability. Belt and suspenders approach.

4. **Claude Haiku over GPT** — 10x cheaper than GPT-4 for comparable conversational quality. SSE streaming gives snappy UX.

5. **ELO over simple averaging** — ELO captures relative preferences from pairwise comparisons, producing more meaningful rankings than simple star ratings.

6. **Expo managed workflow** — Avoids native code maintenance. EAS handles iOS signing complexity. Trade-off: less control over native modules, but the managed set covers our needs.

---

## Rate Limiting Strategy

- **Upstash Redis** with sliding window algorithm
- Limits are per `{IP}:{userId}` composite key
- Different limits for different endpoint categories (general, AI chat, auth)
- Prevents API abuse while allowing normal usage patterns

---

## Security

- All API routes protected by `withAuth` middleware (Firebase token verification)
- Rate limiting on all mutation endpoints
- Firestore security rules require authentication
- No sensitive data in client bundles
- Environment variables managed via Vercel (web) and EAS secrets (mobile)

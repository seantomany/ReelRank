# ReelRank

ReelRank is a full-stack, real-time movie discovery and decision-making application. It helps users decide what to watch by swiping individually on movies, comparing movies side-by-side, or joining real-time "Rooms" to swipe collaboratively with friends and compute the optimal movie choice for a group.

---

## 🚀 Features

- **Solo Swiping**: Swipe left or right on movies to build your personal taste profile.
- **This or That**: Pairwise movie comparisons (with ELO ranking) to refine your preferences.
- **Group Rooms** (Jackbox/Kahoot-style):
  - Host or join real-time movie-picking rooms with a shareable room code.
  - Submit movies to a shared room pool.
  - Everyone swipes on the nominated movies simultaneously.
  - View algorithm-computed results to find the perfect movie everyone will enjoy.
- **Real-Time Syncing**: Instant updates for lobbies, swiping progress, and results (powered by Ably).

---

## 🛠 Tech Stack

ReelRank is a **Turborepo** monorepo using `pnpm` workspaces:

| Layer | Technology |
|---|---|
| **Mobile App** (`apps/mobile`) | Expo (React Native), React Navigation, React Native Paper |
| **API / Backend** (`apps/api`) | Next.js 15 (API Routes), deployed to Vercel |
| **Database** | Firebase Firestore (NoSQL) |
| **Auth** | Firebase Auth (mobile) + Firebase Admin (API) |
| **Real-Time** | Ably (WebSockets) |
| **Rate Limiting** | Upstash Redis |
| **Movie Data** | TMDB API |
| **Shared Types** (`packages/shared`) | Zod schemas + TypeScript interfaces |

---

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- A [Firebase](https://console.firebase.google.com/) project with **Authentication** and **Firestore** enabled
- A [TMDB](https://www.themoviedb.org/settings/api) API key
- An [Ably](https://ably.com/) account (free tier: 6M messages/mo)
- An [Upstash](https://upstash.com/) Redis database (free tier: 10K commands/day)

---

## ⚙️ Setup & Installation

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd ReelRank
pnpm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create a new project (or use existing).
2. **Enable Authentication**:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Google** and/or **Apple** sign-in providers
3. **Enable Firestore**:
   - Go to **Firestore Database** → **Create database**
   - Start in **production mode** (or test mode for development)
   - Choose your preferred region
4. **Get Service Account credentials** (for the API):
   - Go to **Project Settings** → **Service accounts**
   - Click **Generate new private key** → download the JSON file
   - You'll extract `project_id`, `client_email`, and `private_key` from this file
5. **Get Web/Mobile config** (for the mobile app):
   - Go to **Project Settings** → **General** → **Your apps**
   - Register a Web app if you haven't already
   - Copy the Firebase config values (`apiKey`, `authDomain`, `projectId`, etc.)

### 3. Environment Variables

#### API (`apps/api/.env`)
```env
# Firebase Admin (from service account JSON)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# TMDB
TMDB_API_KEY="your-tmdb-api-key"
TMDB_BASE_URL="https://api.themoviedb.org/3"

# Ably
ABLY_API_KEY="your-ably-api-key"

# Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

#### Mobile (`apps/mobile/.env`)
```env
# Firebase client config
FIREBASE_API_KEY="your-firebase-api-key"
FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
FIREBASE_APP_ID="your-app-id"

# API URL (use your Vercel URL in production)
API_URL="http://localhost:3001"

# Ably (public subscribe-only key)
ABLY_KEY="your-ably-public-key"
```

### 4. Firestore Indexes

Firestore will auto-create single-field indexes. For compound queries used in rankings and lists, Firebase will log a URL with the exact index to create if one is missing — just click the link in the error message.

---

## 🏃‍♂️ Running Locally

You need **two terminals** — one for the API and one for the mobile app.

### Terminal 1: Start the API Server

```bash
pnpm dev:api
```

Runs on `http://localhost:3001`.

### Terminal 2: Start the Mobile App

```bash
cd apps/mobile
npx expo start
```

Then press **i** for iOS Simulator, **a** for Android Emulator, or scan the QR code with Expo Go.

> **Why run Expo directly instead of `pnpm dev:mobile`?**
> Running through Turborepo (`pnpm dev:mobile`) works for starting the server, but Turbo doesn't forward keyboard input — so pressing `i` to open the simulator won't work. Running `npx expo start` directly gives you full interactive control.

> **Node 22 users:** If you see `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` errors, the npm scripts already include the `--no-experimental-strip-types` workaround. If you run `npx expo start` directly, prepend it: `NODE_OPTIONS='--no-experimental-strip-types' npx expo start`.

---

## 🚀 Deploying the Backend to Vercel

### 1. Push to GitHub
Make sure your code is committed and pushed to a GitHub repository.

### 2. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and import your repo
2. Set the **Root Directory** to `apps/api`
3. Vercel will auto-detect it as a Next.js project

### 3. Add Environment Variables
In your Vercel project settings → **Environment Variables**, add all the keys from `apps/api/.env.example`:

| Variable | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Full private key (with `\n` line breaks) |
| `TMDB_API_KEY` | Your TMDB API key |
| `TMDB_BASE_URL` | `https://api.themoviedb.org/3` |
| `ABLY_API_KEY` | Your Ably API key |
| `UPSTASH_REDIS_REST_URL` | Your Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Your Upstash Redis token |

> **⚠️ Important**: For `FIREBASE_PRIVATE_KEY`, paste the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Vercel handles the newline characters automatically.

### 4. Deploy
Click **Deploy**. Your API will be live at `https://your-project.vercel.app`.

### 5. Update Mobile App
Update `API_URL` in `apps/mobile/.env` to point to your Vercel deployment URL:
```env
API_URL="https://your-project.vercel.app"
```

---

## 📚 Useful Commands

| Command | Description |
|---|---|
| `pnpm dev:api` | Start API dev server (port 3001) |
| `cd apps/mobile && npx expo start` | Start mobile dev server (interactive) |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint the entire monorepo |
| `pnpm test` | Run Vitest tests |

---

## 📁 Project Structure

```
ReelRank/
├── apps/
│   ├── api/                    # Next.js API (Vercel)
│   │   └── src/
│   │       ├── app/api/        # API route handlers
│   │       │   ├── auth/       # POST /api/auth/verify
│   │       │   ├── movies/     # GET /api/movies/search, trending, [id]
│   │       │   ├── rooms/      # Room CRUD + swiping + results
│   │       │   └── solo/       # Solo swipe, pairwise, ranking, lists
│   │       └── lib/            # Firestore, auth, Ably, Redis, TMDB
│   └── mobile/                 # Expo (React Native)
│       └── src/
│           ├── screens/        # All app screens
│           ├── components/     # Reusable UI components
│           ├── navigation/     # React Navigation setup
│           └── context/        # Auth context
├── packages/
│   └── shared/                 # Shared types, Zod schemas, constants
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml         # Workspace definition
```

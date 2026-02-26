# ReelRank

ReelRank is a full-stack, real-time movie discovery and decision-making application. It helps users decide what to watch by swiping individually on movies, comparing movies side-by-side, or joining real-time "Rooms" to swipe collaboratively with friends and compute the optimal movie choice for a group.

---

## 🚀 Features

- **Solo Swiping**: Swipe left or right on movies to build your personal taste profile.
- **This or That**: Pairwise movie comparisons to refine your preferences.
- **Group Rooms**: 
  - Host or join real-time movie-picking rooms.
  - Submit movies to a shared room pool.
  - Swipe collectively on the nominated movies.
  - View algorithm-computed results to find the perfect movie everyone will enjoy.
- **Real-Time Syncing**: Instant updates for lobbies and group swiping states (powered by Ably).

---

## 🛠 Tech Stack

ReelRank is structured as a **Turborepo** monorepo using `pnpm` workspace functionality, broken down into two main applications and a shared package:

### 1. Mobile App (`apps/mobile`)
- **Framework**: Expo (React Native)
- **UI**: React Native Paper, React Navigation
- **State/Auth**: Firebase Auth, Ably (WebSockets for Real-Time)

### 2. API / Backend (`apps/api`)
- **Framework**: Next.js 15 (API Routes)
- **Database**: PostgreSQL (via Neon) with Prisma ORM
- **Cache / Rate Limiting**: Upstash Redis
- **Auth**: Firebase Admin
- **External APIs**: TMDB (The Movie Database) for movie metadata
- **Real-Time**: Ably

### 3. Shared (`packages/shared`)
- **Types & Schemas**: Zod for end-to-end type safety across the mobile app and API.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v18+ recommended)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (optional but recommended for global commands)

You will also need to set up accounts and projects on the following services:
- **Neon** (or any Postgres provider) for the database.
- **Firebase** (for authentication on mobile and API).
- **Ably** (for real-time WebSockets).
- **Upstash** (for Redis rate-limiting/caching).
- **TMDB** (for fetching movie data).

---

## ⚙️ Setup & Installation

### 1. Clone & Install Dependencies
From the root directory of the project, install all monorepo dependencies:
```bash
pnpm install
```

### 2. Environment Variables
You need to create `.env` files for both the API and the Mobile apps. Examples are provided in their respective directories.

#### API Environment Variables
Create `apps/api/.env` and fill in your keys:
```env
# Database (Neon Postgres)
DATABASE_URL="postgresql://user:password@host:5432/reelrank?sslmode=require"

# Firebase Admin (Get these from your Firebase Project Settings > Service Accounts)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# TMDB (The Movie Database)
TMDB_API_KEY="your-tmdb-api-key"
TMDB_BASE_URL="https://api.themoviedb.org/3"

# Ably (Real-time syncing)
ABLY_API_KEY="your-ably-api-key"

# Upstash Redis
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

#### Mobile Environment Variables
Create `apps/mobile/.env` and fill in your keys:
```env
# Firebase (Public client config — safe to embed in app)
FIREBASE_API_KEY="your-firebase-api-key"
FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
FIREBASE_APP_ID="your-app-id"

# API URL
API_URL="http://localhost:3001" # Or your production API URL

# Ably (Public subscribe-only key)
ABLY_KEY="your-ably-public-key"
```

### 3. Database Migration
Run the Prisma migrations from the monorepo root to set up your PostgreSQL database tables:
```bash
pnpm db:push
# or
pnpm db:migrate
```
Generate the Prisma Client so it's ready for the Next.js API app:
```bash
pnpm db:generate
```

---

## 🏃‍♂️ Running the Project Locally

Because ReelRank is a Turborepo, you can start the entire stack simultaneously from the root folder, or start individual apps.

### Start Everything
```bash
pnpm dev
```
*(Note: You might need to add a `"dev": "turbo dev"` script in the root `package.json` if it doesn't exist, or just use the specific commands below).*

### Start the API Server
Starts the Next.js API on port `3001`.
```bash
pnpm dev:api
```

### Start the Mobile App
Starts the Expo development server.
```bash
pnpm dev:mobile
```
Once Expo CLI starts, you can:
- Press **i** to open the iOS Simulator
- Press **a** to open the Android Emulator
- Scan the QR code using the Expo Go app on your physical device.

---

## 📚 Useful Commands

All commands can be run from the root of the project using `pnpm` and `turbo`.

- **`pnpm lint`**: Lints the entire monorepo.
- **`pnpm test`**: Runs Vitest across the workspaces.
- **`pnpm build`**: Builds the shared packages, Next.js API, and prepares the mobile app for EAS build.
- **`pnpm --filter @reelrank/api db:studio`**: Opens Prisma Studio to easily view and modify your database records via a web UI.

---

## 🤝 Contributing
- **Shared Types**: If you update the models in `packages/shared`, you will need to run the build script (`pnpm build`) for those types to update across the apps, though `turbo` usually handles this during dev mode.
- **Prisma Schema**: If you change `apps/api/prisma/schema.prisma`, remember to run `pnpm db:push` / `pnpm db:migrate` and `pnpm db:generate` to apply changes and update the generated client.

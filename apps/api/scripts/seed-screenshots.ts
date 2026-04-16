/**
 * Seed a demo account with App Store-safe movie data.
 *
 * Wipes the user's soloSwipes, watchedMovies, pairwiseChoices, and rankedLists,
 * then seeds them with a curated list of non-Disney/Pixar/Marvel/Star Wars titles
 * so that Home, Watchlist, Rankings, and Recently Watched all photograph cleanly
 * for App Store screenshots.
 *
 * Usage (from apps/api/ with Firebase env vars set):
 *
 *   npx tsx scripts/seed-screenshots.ts --email demo@reelrank.app
 *   npx tsx scripts/seed-screenshots.ts --uid <firebase-uid>
 *
 * Requires: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * in the environment (same as running the API locally).
 */

import 'dotenv/config';
import * as admin from 'firebase-admin';

type MovieSeed = {
  id: number;
  title: string;
  rating?: number;
  watchedAt?: string;
};

const RECENTLY_WATCHED: MovieSeed[] = [
  { id: 693134, title: 'Dune: Part Two', rating: 9.5, watchedAt: '2026-04-10' },
  { id: 872585, title: 'Oppenheimer', rating: 9.0, watchedAt: '2026-04-03' },
  { id: 666277, title: 'Past Lives', rating: 8.7, watchedAt: '2026-03-28' },
  { id: 545611, title: 'Everything Everywhere All at Once', rating: 9.3, watchedAt: '2026-03-21' },
  { id: 915935, title: 'Anatomy of a Fall', rating: 8.5, watchedAt: '2026-03-14' },
  { id: 496243, title: 'Parasite', rating: 9.2, watchedAt: '2026-03-07' },
  { id: 792307, title: 'Poor Things', rating: 8.4, watchedAt: '2026-02-28' },
  { id: 467244, title: 'The Zone of Interest', rating: 8.2, watchedAt: '2026-02-20' },
];

const TOP_RANKED_ORDER: number[] = [
  545611, 693134, 496243, 872585, 666277, 915935, 792307, 467244,
];

const WATCHLIST: MovieSeed[] = [
  { id: 937287, title: 'Challengers' },
  { id: 929590, title: 'Civil War' },
  { id: 466420, title: 'Killers of the Flower Moon' },
  { id: 933260, title: 'The Substance' },
  { id: 438631, title: 'Dune' },
  { id: 335984, title: 'Blade Runner 2049' },
  { id: 1064028, title: 'Anora' },
  { id: 974576, title: 'Conclave' },
];

const PASSED: MovieSeed[] = [
  { id: 385687, title: 'Fast X' },
  { id: 934433, title: 'Rebel Moon' },
];

const COLLECTIONS = {
  users: 'users',
  soloSwipes: 'soloSwipes',
  pairwiseChoices: 'pairwiseChoices',
  watchedMovies: 'watchedMovies',
  rankedLists: 'rankedLists',
} as const;

function parseArgs(): { email?: string; uid?: string } {
  const args = process.argv.slice(2);
  const out: { email?: string; uid?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') out.email = args[++i];
    else if (args[i] === '--uid') out.uid = args[++i];
  }
  return out;
}

function initAdmin(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase env. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.',
    );
  }
  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

async function resolveUid(email?: string, uid?: string): Promise<string> {
  if (uid) return uid;
  if (!email) throw new Error('Pass --email <addr> or --uid <id>');
  const userRecord = await admin.auth().getUserByEmail(email);
  return userRecord.uid;
}

async function deleteBatch(query: admin.firestore.Query): Promise<number> {
  const db = admin.firestore();
  let total = 0;
  while (true) {
    const snap = await query.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < 400) break;
  }
  return total;
}

async function wipeUserMovieData(uid: string): Promise<void> {
  const db = admin.firestore();
  console.log(`  Wiping existing movie data for ${uid}…`);
  const [s, w, p] = await Promise.all([
    deleteBatch(db.collection(COLLECTIONS.soloSwipes).where('userId', '==', uid)),
    deleteBatch(db.collection(COLLECTIONS.watchedMovies).where('userId', '==', uid)),
    deleteBatch(db.collection(COLLECTIONS.pairwiseChoices).where('userId', '==', uid)),
  ]);
  await db.collection(COLLECTIONS.rankedLists).doc(uid).delete().catch(() => {});
  console.log(`    soloSwipes: ${s} | watchedMovies: ${w} | pairwiseChoices: ${p} | rankedLists: cleared`);
}

async function seedWatched(uid: string): Promise<void> {
  const db = admin.firestore();
  const now = new Date();
  console.log(`  Seeding ${RECENTLY_WATCHED.length} watched movies…`);
  const batch = db.batch();
  for (const m of RECENTLY_WATCHED) {
    const watchedRef = db.collection(COLLECTIONS.watchedMovies).doc(`${uid}_${m.id}`);
    const createdAt = m.watchedAt ? new Date(`${m.watchedAt}T20:00:00Z`) : now;
    batch.set(watchedRef, {
      id: `${uid}_${m.id}`,
      userId: uid,
      movieId: m.id,
      rating: m.rating ?? null,
      watchedAt: m.watchedAt ?? new Date().toISOString().split('T')[0],
      venue: 'theater',
      notes: null,
      watchedWithFriendIds: [],
      createdAt,
      updatedAt: createdAt,
    });
    const swipeRef = db.collection(COLLECTIONS.soloSwipes).doc(`${uid}_${m.id}`);
    batch.set(swipeRef, {
      id: `${uid}_${m.id}`,
      userId: uid,
      movieId: m.id,
      direction: 'right',
      createdAt,
    });
  }
  await batch.commit();
}

async function seedWatchlist(uid: string): Promise<void> {
  const db = admin.firestore();
  console.log(`  Seeding ${WATCHLIST.length} watchlist items (right swipes)…`);
  const batch = db.batch();
  const base = Date.now();
  WATCHLIST.forEach((m, i) => {
    const ref = db.collection(COLLECTIONS.soloSwipes).doc(`${uid}_${m.id}`);
    batch.set(ref, {
      id: `${uid}_${m.id}`,
      userId: uid,
      movieId: m.id,
      direction: 'right',
      createdAt: new Date(base - i * 60 * 60 * 1000),
    });
  });
  await batch.commit();
}

async function seedPasses(uid: string): Promise<void> {
  const db = admin.firestore();
  console.log(`  Seeding ${PASSED.length} passed movies (left swipes)…`);
  const batch = db.batch();
  PASSED.forEach((m, i) => {
    const ref = db.collection(COLLECTIONS.soloSwipes).doc(`${uid}_${m.id}`);
    batch.set(ref, {
      id: `${uid}_${m.id}`,
      userId: uid,
      movieId: m.id,
      direction: 'left',
      createdAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
    });
  });
  await batch.commit();
}

async function seedRankedList(uid: string): Promise<void> {
  const db = admin.firestore();
  console.log(`  Seeding top-ranked list (${TOP_RANKED_ORDER.length} movies, best first)…`);
  await db.collection(COLLECTIONS.rankedLists).doc(uid).set({
    userId: uid,
    movieIds: TOP_RANKED_ORDER,
    updatedAt: new Date(),
  });
}

async function main(): Promise<void> {
  const { email, uid: uidArg } = parseArgs();
  initAdmin();

  const uid = await resolveUid(email, uidArg);
  console.log(`\nSeeding screenshot data for user ${uid}${email ? ` (${email})` : ''}\n`);

  await wipeUserMovieData(uid);
  await seedWatched(uid);
  await seedWatchlist(uid);
  await seedPasses(uid);
  await seedRankedList(uid);

  console.log('\nDone. Open the app, pull-to-refresh Home, and capture screenshots.');
  console.log('Tip: the Home, Rankings, and Profile screens will now show only App Store-safe titles.\n');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

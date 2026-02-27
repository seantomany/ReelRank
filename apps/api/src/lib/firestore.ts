import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './firebase-admin';

const globalForFirestore = globalThis as unknown as {
  firestore: Firestore | undefined;
};

function initFirestore(): Firestore {
  getFirebaseAdmin(); // ensure app is initialized
  const fs = getFirestore();
  fs.settings({ ignoreUndefinedProperties: true });
  return fs;
}

export const db =
  globalForFirestore.firestore ?? initFirestore();

if (process.env.NODE_ENV !== 'production') {
  globalForFirestore.firestore = db;
}

// Collection references
export const COLLECTIONS = {
  users: 'users',
  soloSwipes: 'soloSwipes',
  pairwiseChoices: 'pairwiseChoices',
  rooms: 'rooms',
  // Subcollections under rooms/{roomId}/
  roomMembers: (roomId: string) => `rooms/${roomId}/members`,
  roomMovies: (roomId: string) => `rooms/${roomId}/movies`,
  roomSwipes: (roomId: string) => `rooms/${roomId}/swipes`,
  roomResults: (roomId: string) => `rooms/${roomId}/results`,
} as const;

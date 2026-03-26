import { getFirebaseAdmin } from './firebase-admin';
import type { firestore } from 'firebase-admin';

let db: firestore.Firestore | undefined;

export function getDb(): firestore.Firestore {
  if (!db) {
    db = getFirebaseAdmin().firestore();
  }
  return db;
}

export const COLLECTIONS = {
  users: 'users',
  soloSwipes: 'soloSwipes',
  pairwiseChoices: 'pairwiseChoices',
  watchedMovies: 'watchedMovies',
  rankedLists: 'rankedLists',
  rooms: 'rooms',
  friendships: 'friendships',
  friendRequests: 'friendRequests',
  ratingComments: 'ratingComments',
} as const;

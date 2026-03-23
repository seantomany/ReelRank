function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get FIREBASE_PROJECT_ID() { return requireEnv('FIREBASE_PROJECT_ID'); },
  get FIREBASE_CLIENT_EMAIL() { return requireEnv('FIREBASE_CLIENT_EMAIL'); },
  get FIREBASE_PRIVATE_KEY() { return requireEnv('FIREBASE_PRIVATE_KEY'); },
  get TMDB_API_KEY() { return requireEnv('TMDB_API_KEY'); },
  get TMDB_BASE_URL() { return process.env.TMDB_BASE_URL ?? 'https://api.themoviedb.org/3'; },
  get ABLY_API_KEY() { return requireEnv('ABLY_API_KEY'); },
  get UPSTASH_REDIS_REST_URL() { return requireEnv('UPSTASH_REDIS_REST_URL'); },
  get UPSTASH_REDIS_REST_TOKEN() { return requireEnv('UPSTASH_REDIS_REST_TOKEN'); },
};

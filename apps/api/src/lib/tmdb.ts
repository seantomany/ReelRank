import { env } from './env';
import type { Movie } from '@reelrank/shared';

interface TmdbMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

interface TmdbPagedResponse {
  page: number;
  results: TmdbMovieResult[];
  total_pages: number;
  total_results: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

function mapTmdbMovie(m: TmdbMovieResult): Movie {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    releaseDate: m.release_date ?? '',
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    popularity: m.popularity,
    genreIds: m.genre_ids ?? [],
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${env.TMDB_BASE_URL}${path}`);
  url.searchParams.set('api_key', env.TMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err as Error;
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
}

export async function searchMovies(
  query: string,
  page: number = 1
): Promise<{ movies: Movie[]; totalPages: number; totalResults: number }> {
  const data = await tmdbFetch<TmdbPagedResponse>('/search/movie', {
    query,
    page: String(page),
  });
  return {
    movies: data.results.map(mapTmdbMovie),
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}

export async function getTrending(
  page: number = 1
): Promise<{ movies: Movie[]; totalPages: number }> {
  const data = await tmdbFetch<TmdbPagedResponse>('/trending/movie/week', {
    page: String(page),
  });
  return {
    movies: data.results.map(mapTmdbMovie),
    totalPages: data.total_pages,
  };
}

export async function getGenres(): Promise<TmdbGenre[]> {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list');
  return data.genres;
}

export async function discoverMovies(
  genreId: number,
  page: number = 1
): Promise<{ movies: Movie[]; totalPages: number }> {
  const data = await tmdbFetch<TmdbPagedResponse>('/discover/movie', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
  });
  return {
    movies: data.results.map(mapTmdbMovie),
    totalPages: data.total_pages,
  };
}

export async function getRecommendations(
  movieId: number,
  page: number = 1
): Promise<{ movies: Movie[]; totalPages: number }> {
  const data = await tmdbFetch<TmdbPagedResponse>(`/movie/${movieId}/recommendations`, {
    page: String(page),
  });
  return {
    movies: data.results.map(mapTmdbMovie),
    totalPages: data.total_pages,
  };
}

interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export async function getMovieById(id: number): Promise<Movie> {
  const m = await tmdbFetch<
    TmdbMovieResult & {
      genres?: TmdbGenre[];
      credits?: { cast?: TmdbCastMember[] };
    }
  >(`/movie/${id}`, { append_to_response: 'credits' });
  const rawCast = m.credits?.cast ?? [];
  const cast = rawCast
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 12)
    .map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? '',
      profilePath: c.profile_path ?? null,
      order: c.order ?? 0,
    }));
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    releaseDate: m.release_date ?? '',
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    popularity: m.popularity,
    genreIds: m.genres?.map((g) => g.id) ?? m.genre_ids ?? [],
    cast,
  };
}

export function createPlaceholderMovie(id: number): Movie {
  return {
    id,
    title: 'Unknown Movie',
    overview: '',
    posterPath: null,
    backdropPath: null,
    releaseDate: '',
    voteAverage: 0,
    voteCount: 0,
    popularity: 0,
    genreIds: [],
  };
}

export async function safeGetMovieById(id: number): Promise<{ movie: Movie; hydrated: boolean }> {
  try {
    const movie = await getMovieById(id);
    return { movie, hydrated: true };
  } catch {
    return { movie: createPlaceholderMovie(id), hydrated: false };
  }
}

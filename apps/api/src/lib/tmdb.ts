import type { Movie } from '@reelrank/shared';

const BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY!;

interface TMDBMovie {
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

interface TMDBSearchResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBDetailMovie extends TMDBMovie {
  genres?: { id: number; name: string }[];
}

function mapTMDBMovie(raw: TMDBMovie): Movie {
  return {
    id: raw.id,
    title: raw.title,
    overview: raw.overview,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: raw.release_date ?? '',
    voteAverage: raw.vote_average,
    voteCount: raw.vote_count,
    popularity: raw.popularity,
    genreIds: raw.genre_ids ?? [],
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function searchMovies(query: string, page = 1) {
  const data = await tmdbFetch<TMDBSearchResponse>('/search/movie', {
    query,
    page: String(page),
    include_adult: 'false',
    language: 'en-US',
  });

  return {
    movies: data.results.map(mapTMDBMovie),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}

export async function getTrendingMovies(page = 1) {
  const data = await tmdbFetch<TMDBSearchResponse>('/trending/movie/week', {
    page: String(page),
    language: 'en-US',
  });

  return {
    movies: data.results.map(mapTMDBMovie),
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}

export async function getMovieById(id: number): Promise<Movie> {
  const raw = await tmdbFetch<TMDBDetailMovie>(`/movie/${id}`, {
    language: 'en-US',
  });

  return {
    ...mapTMDBMovie(raw),
    genreIds: raw.genres?.map((g) => g.id) ?? raw.genre_ids ?? [],
  };
}

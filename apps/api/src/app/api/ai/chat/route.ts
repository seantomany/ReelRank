import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from '@/lib/auth';
import { createRequestId, handleApiError } from '@/lib/errors';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { safeGetMovieById } from '@/lib/tmdb';
import { env } from '@/lib/env';

const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function gatherUserContext(userId: string): Promise<string> {
  const [swipesSnap, watchedSnap, rankedListDoc] = await Promise.all([
    getDb().collection(COLLECTIONS.soloSwipes).where('userId', '==', userId).get(),
    getDb().collection(COLLECTIONS.watchedMovies).where('userId', '==', userId).get(),
    getDb().collection(COLLECTIONS.rankedLists).doc(userId).get(),
  ]);

  const movieIds = new Set<number>();
  const swipesByMovie = new Map<number, 'left' | 'right'>();
  for (const doc of swipesSnap.docs) {
    const data = doc.data();
    movieIds.add(data.movieId);
    swipesByMovie.set(data.movieId, data.direction);
  }

  const watchedDocs: { movieId: number; rating: number }[] = [];
  for (const doc of watchedSnap.docs) {
    const data = doc.data();
    movieIds.add(data.movieId);
    watchedDocs.push({ movieId: data.movieId, rating: data.rating ?? 0 });
  }

  const rankedIds: number[] = rankedListDoc.exists
    ? rankedListDoc.data()!.movieIds ?? []
    : [];
  for (const id of rankedIds) movieIds.add(id);

  const movieResults = await Promise.all(
    Array.from(movieIds).slice(0, 150).map((id) => safeGetMovieById(id))
  );
  const movieMap = new Map(movieResults.map(({ movie }) => [movie.id, movie]));

  const sections: string[] = [];

  // Rankings
  if (rankedIds.length > 0) {
    const total = rankedIds.length;
    const lines = rankedIds.slice(0, 15).map((id, i) => {
      const m = movieMap.get(id);
      const score = total <= 1 ? 10 : Math.round(((total - 1 - i) / (total - 1)) * 100) / 10;
      const genres = m?.genreIds.map(g => GENRE_NAMES[g]).filter(Boolean).join(', ') ?? '';
      return `${i + 1}. ${m?.title ?? `Movie #${id}`} (${m?.releaseDate?.slice(0, 4) ?? '?'}) — Beli ${score.toFixed(1)} — ${genres}`;
    });
    sections.push(`TOP RANKED MOVIES (${total} total):\n${lines.join('\n')}`);
  }

  // Watched with ratings
  if (watchedDocs.length > 0) {
    const lines = watchedDocs
      .filter(w => w.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 15)
      .map(w => {
        const m = movieMap.get(w.movieId);
        return `- ${m?.title ?? `Movie #${w.movieId}`} (${m?.releaseDate?.slice(0, 4) ?? '?'}): ${w.rating}/10`;
      });
    if (lines.length > 0) {
      sections.push(`WATCHED & RATED (${watchedDocs.length} total):\n${lines.join('\n')}`);
    }
  }

  // Swipe stats
  const rightSwipes = Array.from(swipesByMovie.values()).filter(d => d === 'right').length;
  const leftSwipes = Array.from(swipesByMovie.values()).filter(d => d === 'left').length;
  const total = rightSwipes + leftSwipes;
  if (total > 0) {
    sections.push(`SWIPE STATS: ${total} movies swiped — ${rightSwipes} liked (${Math.round((rightSwipes / total) * 100)}%), ${leftSwipes} passed`);
  }

  // Genre preferences from swipes
  const genreCounts = new Map<string, { right: number; total: number }>();
  for (const [movieId, direction] of swipesByMovie) {
    const movie = movieMap.get(movieId);
    if (!movie) continue;
    for (const genreId of movie.genreIds) {
      const name = GENRE_NAMES[genreId];
      if (!name) continue;
      const counts = genreCounts.get(name) ?? { right: 0, total: 0 };
      counts.total++;
      if (direction === 'right') counts.right++;
      genreCounts.set(name, counts);
    }
  }
  if (genreCounts.size > 0) {
    const sorted = Array.from(genreCounts.entries())
      .sort((a, b) => b[1].right - a[1].right)
      .slice(0, 8)
      .map(([name, c]) => `- ${name}: ${c.right}/${c.total} liked (${Math.round((c.right / c.total) * 100)}%)`);
    sections.push(`GENRE PREFERENCES:\n${sorted.join('\n')}`);
  }

  // Recently right-swiped but not watched (their "want to watch" list)
  const watchedSet = new Set(watchedDocs.map(w => w.movieId));
  const wantToWatch = Array.from(swipesByMovie.entries())
    .filter(([id, dir]) => dir === 'right' && !watchedSet.has(id))
    .slice(0, 10)
    .map(([id]) => {
      const m = movieMap.get(id);
      return m ? `- ${m.title} (${m.releaseDate?.slice(0, 4) ?? '?'})` : null;
    })
    .filter(Boolean);
  if (wantToWatch.length > 0) {
    sections.push(`WANT TO WATCH (swiped right, not yet watched):\n${wantToWatch.join('\n')}`);
  }

  if (sections.length === 0) {
    return 'This user is brand new and has no movie history yet.';
  }

  return sections.join('\n\n');
}

function buildSystemPrompt(userContext: string): string {
  return `You are ReelRank AI, a sharp and opinionated movie recommendation assistant embedded in the ReelRank app. You know this user's movie taste deeply based on their data.

${userContext}

INSTRUCTIONS:
- Be conversational, concise, and confident. Don't hedge — commit to your recommendations with clear reasons.
- Tie every recommendation back to what you know about the user's taste (their rankings, ratings, genres they love/hate).
- When suggesting a specific movie, use exactly this format: [MOVIE:TMDB_ID:Title] — for example [MOVIE:27205:Inception]. The UI will render this as a clickable card. ALWAYS include the TMDB ID if you know the movie.
- When you want to present the user with choices to narrow down what they want, use this format on its own line: [CHOICES:Option A|Option B|Option C] — the UI renders these as tappable buttons. Use 2-4 options max.
- Keep responses focused. Suggest 1-3 movies at a time, not a wall of 10.
- You can ask follow-up questions to narrow down the vibe: mood, genre, era, who they're watching with, etc.
- If the user has no history, help them get started by asking about their taste.
- NEVER make up TMDB IDs. If you're not sure of the exact TMDB ID, just mention the movie by name without the [MOVIE:] tag.
- You know popular movie TMDB IDs well. Use them confidently for well-known films.`;
}

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  try {
    const user = await authenticateRequest(req);

    const body = await req.json();
    const messages: ChatMessage[] = body.messages ?? [];

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return new Response(JSON.stringify({ error: 'Messages must end with a user message', requestId }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userContext = await gatherUserContext(user.id);
    const systemPrompt = buildSystemPrompt(userContext);

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    let stream;
    try {
      stream = await client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI service unavailable';
      console.error(`[${requestId}] Anthropic init error:`, msg);
      return new Response(JSON.stringify({ error: msg, requestId }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Stream interrupted';
          console.error(`[${requestId}] Stream error:`, err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

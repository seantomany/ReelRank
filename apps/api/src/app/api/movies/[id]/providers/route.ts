import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/middleware';
import { env } from '@/lib/env';

interface ProviderInfo {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface CountryProviders {
  link?: string;
  flatrate?: ProviderInfo[];
  rent?: ProviderInfo[];
  buy?: ProviderInfo[];
  free?: ProviderInfo[];
}

function mapProviders(raw: ProviderInfo[]) {
  return raw.map((p) => ({
    id: p.provider_id,
    name: p.provider_name,
    logoPath: p.logo_path,
  }));
}

export const GET = withErrorHandling(async (_req: NextRequest, { requestId, params }) => {
  const movieId = params?.id;
  if (!movieId || isNaN(Number(movieId))) {
    return NextResponse.json({ error: 'Invalid movie ID', requestId }, { status: 400 });
  }

  const url = `${env.TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${env.TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch providers', requestId }, { status: 502 });
  }

  const json = await res.json();
  const results = json.results ?? {};
  const us: CountryProviders = results.US ?? {};

  return NextResponse.json({
    data: {
      link: us.link ?? null,
      stream: us.flatrate ? mapProviders(us.flatrate) : [],
      rent: us.rent ? mapProviders(us.rent) : [],
      buy: us.buy ? mapProviders(us.buy) : [],
      free: us.free ? mapProviders(us.free) : [],
    },
    requestId,
  });
});

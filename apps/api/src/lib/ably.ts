import Ably from 'ably';
import { env } from './env';
import { getRoomChannelName } from '@reelrank/shared';

let client: Ably.Rest | undefined;

function getAblyClient(): Ably.Rest {
  if (!client) {
    client = new Ably.Rest({ key: env.ABLY_API_KEY });
  }
  return client;
}

export async function publishToRoom(
  roomCode: string,
  event: string,
  data: unknown
): Promise<void> {
  try {
    const channel = getAblyClient().channels.get(getRoomChannelName(roomCode));
    await channel.publish(event, data);
  } catch (err) {
    console.error(`[Ably] Failed to publish ${event} to room:${roomCode}:`, err);
  }
}

export async function generateAblyToken(
  userId: string,
  roomCode: string
): Promise<Ably.TokenDetails> {
  const ably = getAblyClient();
  const channelName = getRoomChannelName(roomCode);
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: userId,
    capability: { [channelName]: ['subscribe', 'presence'] },
    ttl: 3600 * 1000,
  });
  return tokenRequest as unknown as Ably.TokenDetails;
}

import Ably from "ably";
import { getRoomChannelName } from "@reelrank/shared";
import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let client: Ably.Realtime | null = null;
let clientRoomCode: string | null = null;

async function getAblyToken(roomCode: string): Promise<Ably.TokenRequest> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken(true);
  const res = await fetch(`${API_URL}/api/auth/ably-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roomCode }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Ably token: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.data as Ably.TokenRequest;
}

function getAblyClient(roomCode: string): Ably.Realtime {
  if (client && clientRoomCode === roomCode) return client;

  if (client) {
    client.close();
    client = null;
    clientRoomCode = null;
  }

  client = new Ably.Realtime({
    authCallback: async (_params, callback) => {
      try {
        const tokenRequest = await getAblyToken(roomCode);
        callback(null, tokenRequest);
      } catch (err) {
        const e = err as Error;
        callback(
          { code: 40000, statusCode: 401, message: e.message } as Ably.ErrorInfo,
          null
        );
      }
    },
  });

  clientRoomCode = roomCode;
  return client;
}

export function subscribeToRoom(
  roomCode: string,
  eventHandlers: Record<string, (data: unknown) => void>
): () => void {
  const ably = getAblyClient(roomCode);
  const channelName = getRoomChannelName(roomCode);
  const channel = ably.channels.get(channelName);

  const boundHandlers: Array<{ event: string; handler: (msg: Ably.Message) => void }> = [];

  for (const [event, handler] of Object.entries(eventHandlers)) {
    const bound = (msg: Ably.Message) => handler(msg.data);
    channel.subscribe(event, bound);
    boundHandlers.push({ event, handler: bound });
  }

  return () => {
    for (const { event, handler } of boundHandlers) {
      channel.unsubscribe(event, handler);
    }
  };
}

export function disconnectAbly() {
  if (client) {
    client.close();
    client = null;
    clientRoomCode = null;
  }
}

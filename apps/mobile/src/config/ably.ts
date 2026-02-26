import Ably from 'ably';
import Constants from 'expo-constants';

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    const key = Constants.expoConfig?.extra?.ablyKey;
    if (!key) throw new Error('Ably key not configured');
    client = new Ably.Realtime({ key });
  }
  return client;
}

export function subscribeToRoom(
  roomCode: string,
  event: string,
  callback: (message: Ably.Message) => void,
): () => void {
  const ably = getAblyClient();
  const channel = ably.channels.get(`room:${roomCode}`);
  channel.subscribe(event, callback);

  return () => {
    channel.unsubscribe(event, callback);
  };
}

export function unsubscribeFromRoom(roomCode: string) {
  const ably = getAblyClient();
  const channel = ably.channels.get(`room:${roomCode}`);
  channel.unsubscribe();
  channel.detach();
}

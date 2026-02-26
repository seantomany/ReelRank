import Ably from 'ably';

const globalForAbly = globalThis as unknown as {
  ably: Ably.Rest | undefined;
};

export const ably =
  globalForAbly.ably ??
  new Ably.Rest({ key: process.env.ABLY_API_KEY! });

if (process.env.NODE_ENV !== 'production') {
  globalForAbly.ably = ably;
}

export async function publishToRoom(roomCode: string, event: string, data: unknown) {
  const channel = ably.channels.get(`room:${roomCode}`);
  await channel.publish(event, data);
}

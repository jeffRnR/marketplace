export const sseClients = new Map<string, Set<(data: string) => void>>();

export function broadcastMessage(conversationId: string, payload: object) {
  const clients = sseClients.get(conversationId);
  if (!clients) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const send of clients) {
    try {
      send(data);
    } catch {
      /* client disconnected */
    }
  }
}

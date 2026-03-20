// app/api/messages/[conversationId]/stream/route.ts
// SSE endpoint — client connects once, receives new messages in real-time.
// Uses the in-process sseClients map from the messages route.
// Each conversation has its own set of connected clients.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sseClients } from "@/app/api/messages/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { conversationId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify participant
  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true, marketProfile: { select: { id: true } } },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const conv = await prisma.conversation.findUnique({
    where:  { id: params.conversationId },
    select: { buyerId: true, vendorProfile: { select: { userId: true } } },
  });
  if (!conv) return new Response("Not found", { status: 404 });

  const isParticipant = conv.buyerId === user.id || conv.vendorProfile.userId === user.id;
  if (!isParticipant) return new Response("Forbidden", { status: 403 });

  // Create SSE stream
  const encoder = new TextEncoder();
  let send: (data: string) => void;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      send = (data: string) => {
        if (!isClosed) {
          try { controller.enqueue(encoder.encode(data)); }
          catch { isClosed = true; }
        }
      };

      // Register this client
      if (!sseClients.has(params.conversationId)) {
        sseClients.set(params.conversationId, new Set());
      }
      sseClients.get(params.conversationId)!.add(send);

      // Send a heartbeat comment every 20 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        if (isClosed) { clearInterval(heartbeat); return; }
        try { controller.enqueue(encoder.encode(": heartbeat\n\n")); }
        catch { isClosed = true; clearInterval(heartbeat); }
      }, 20_000);

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(heartbeat);
        sseClients.get(params.conversationId)?.delete(send);
        if (sseClients.get(params.conversationId)?.size === 0) {
          sseClients.delete(params.conversationId);
        }
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
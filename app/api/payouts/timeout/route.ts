export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = payload && typeof payload === "object" && "Result" in payload
    ? (payload as { Result?: { ConversationID?: string; OriginatorConversationID?: string } }).Result
    : undefined;
  if (!result?.ConversationID && !result?.OriginatorConversationID) {
    return Response.json({ error: "Missing Daraja timeout identifiers" }, { status: 400 });
  }
  console.warn("Daraja B2C timeout callback; payout remains reserved pending final result", {
    conversationId: result.ConversationID,
    originatorConversationId: result.OriginatorConversationID,
  });
  return Response.json({ received: true, status: "PROCESSING" });
}

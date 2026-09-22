import { authenticateApiKey } from "@/lib/agent/api-key-store";
import { retrieveChunks } from "@/lib/ai/rag";

// What the local MCP tool in tools/tandem calls to reach the meeting corpus
// it otherwise has no knowledge of. Authenticated by a machine API key, not
// a Clerk session — a CLI has no cookie jar.
//
// Scope comes from the key's owner, never from the request: a key can only
// ever read the meetings of the user it was created by.
export async function POST(request: Request) {
  const userId = await authenticateApiKey(request.headers.get("authorization"));
  if (!userId) {
    return Response.json({ error: "invalid api key" }, { status: 401 });
  }

  const { query, limit } = await request.json();
  if (!query || typeof query !== "string") {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  const chunks = await retrieveChunks(
    query,
    { userId },
    Math.min(Number(limit ?? 8), 20),
  );

  return Response.json({
    results: chunks.map((chunk) => ({
      speaker: chunk.speaker,
      text: chunk.text,
      meetingId: chunk.meetingId,
      startMs: chunk.startMs,
    })),
  });
}

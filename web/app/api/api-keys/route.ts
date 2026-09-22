import { createApiKey, listApiKeys } from "@/lib/agent/api-key-store";
import { getCurrentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Browser-facing management of machine API keys. Clerk-authenticated, unlike
// /api/machine/* which the keys themselves authenticate.
export async function GET() {
  const userId = await getCurrentUserId();
  return Response.json({ keys: await listApiKeys(userId) });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  const limited = await rateLimit("bots", userId);
  if (limited) return limited;

  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  // The plaintext key is in this response and nowhere else, ever again.
  const created = await createApiKey(userId, name.slice(0, 80));
  return Response.json({ key: created }, { status: 201 });
}

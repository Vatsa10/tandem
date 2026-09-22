import { revokeApiKey } from "@/lib/agent/api-key-store";
import { getCurrentUserId } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/api-keys/[id]">,
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const revoked = await revokeApiKey(userId, id);
  if (!revoked) {
    return Response.json({ error: "Key not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}

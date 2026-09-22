import { loadToolContext, runServerTool } from "@/lib/agent/tool-runner";
import { resolveAgentSession } from "@/lib/agent/store";

// The agent page calls this for every tool that needs a secret or the
// database. Unauthenticated in the Clerk sense on purpose — the session
// token is the credential, and it is what binds the call to one meeting and
// one user's corpus. Nothing here reads a user or meeting id from the body:
// if it did, the page could ask for someone else's meetings.
export async function POST(request: Request) {
  const { token, name, args } = await request.json();

  if (!token || typeof token !== "string") {
    return Response.json({ error: "token is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const session = await resolveAgentSession(token);
  if (!session) {
    return Response.json({ error: "unknown or expired session" }, { status: 404 });
  }

  const context = await loadToolContext(session);
  if (!context) {
    return Response.json({ error: "meeting not found" }, { status: 404 });
  }

  try {
    const result = await runServerTool(
      context,
      name,
      (args ?? {}) as Record<string, unknown>,
    );
    return Response.json({ result });
  } catch (error) {
    console.error(`agent tool ${name} failed`, error);
    // Handed back as a result, not an HTTP error: the model should hear that
    // the tool failed and say so, rather than stall mid-sentence.
    return Response.json({ result: `The ${name} tool failed.` });
  }
}

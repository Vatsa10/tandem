import { chargeSeconds, nextGrant } from "@/lib/agent/minutes";
import { resolveAgentSession } from "@/lib/agent/sessions";
import { env } from "@/lib/env";

// Recall loads the agent page with no Clerk session, so this route is
// deliberately unauthenticated in the Clerk sense — the opaque session
// token is the credential. It must never call getCurrentUserId().
//
// The real OpenAI key never reaches the browser. This mints a short-lived
// client secret instead, and only while the meeting still has budget,
// which is what makes the cap unbypassable from the page.
export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token || typeof token !== "string") {
    return Response.json({ error: "token is required" }, { status: 400 });
  }

  const session = await resolveAgentSession(token);
  if (!session) {
    return Response.json({ error: "unknown or expired session" }, { status: 404 });
  }

  const grant = nextGrant(session.secondsUsed);
  if (grant <= 0) {
    return Response.json(
      { error: "this meeting has used its live agent budget" },
      { status: 402 },
    );
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: grant },
      session: { type: "realtime", model: "gpt-realtime" },
    }),
  });

  if (!response.ok) {
    console.error(
      "realtime client secret failed",
      response.status,
      await response.text(),
    );
    return Response.json({ error: "could not start a voice session" }, { status: 502 });
  }

  const body = await response.json();

  // Charged on grant, not on use. Erring toward over-charging keeps the
  // cap honest when a page disappears without reporting back.
  await chargeSeconds(session.id, grant);

  return Response.json({ clientSecret: body.value, expiresInSeconds: grant });
}

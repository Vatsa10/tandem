import { resolveAgentSession } from "@/lib/agent/store";
import { db } from "@/lib/db/client";
import { liveChatMessages } from "@/lib/db/schema";

// Records one spoken exchange. The voice agent answers through the Realtime
// session, so nothing server-side sees what was said — without this, the
// chat responder and the next voice turn would have no idea the question was
// already handled. Both rows carry channel='voice' so spoken and typed turns
// read back as one conversation.
//
// Unauthenticated in the Clerk sense on purpose — see /api/agent/tool.
export async function POST(request: Request) {
  const { token, question, answer, speaker } = await request.json();

  if (!token || typeof token !== "string") {
    return Response.json({ error: "token is required" }, { status: 400 });
  }
  if (typeof question !== "string" || typeof answer !== "string") {
    return Response.json(
      { error: "question and answer are required" },
      { status: 400 },
    );
  }

  const session = await resolveAgentSession(token);
  if (!session) {
    return Response.json({ error: "unknown or expired session" }, { status: 404 });
  }

  await db.insert(liveChatMessages).values([
    {
      meetingId: session.meetingId,
      role: "user",
      participantName: typeof speaker === "string" ? speaker : null,
      text: question,
      channel: "voice",
    },
    {
      meetingId: session.meetingId,
      role: "assistant",
      text: answer,
      channel: "voice",
    },
  ]);

  return Response.json({ ok: true });
}

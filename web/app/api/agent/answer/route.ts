import { desc, eq } from "drizzle-orm";
import { resolveAgentSession } from "@/lib/agent/sessions";
import { answerQuestionText } from "@/lib/ai/rag";
import { db } from "@/lib/db/client";
import { liveChatMessages, meetings } from "@/lib/db/schema";
import { BOT_DISPLAY_NAME } from "@/lib/recall/live-chat";

const HISTORY_LIMIT = 10;

// Spoken and typed turns share one history, so the voice agent knows what
// was already answered in the chat panel and vice versa.
async function recentHistory(meetingId: string): Promise<string | null> {
  const rows = await db
    .select({
      role: liveChatMessages.role,
      participantName: liveChatMessages.participantName,
      text: liveChatMessages.text,
    })
    .from(liveChatMessages)
    .where(eq(liveChatMessages.meetingId, meetingId))
    .orderBy(desc(liveChatMessages.createdAt))
    .limit(HISTORY_LIMIT);

  if (rows.length === 0) return null;

  return rows
    .reverse()
    .map((r) =>
      r.role === "assistant"
        ? `${BOT_DISPLAY_NAME}: ${r.text}`
        : `${r.participantName ?? "Someone"}: ${r.text}`,
    )
    .join("\n");
}

// Unauthenticated in the Clerk sense on purpose — see the note in
// /api/agent/realtime-token. The token scopes retrieval to exactly one
// user's corpus; nothing here reads a user id from the request body.
export async function POST(request: Request) {
  const { token, question, speaker } = await request.json();

  if (!token || typeof token !== "string") {
    return Response.json({ error: "token is required" }, { status: 400 });
  }
  if (!question || typeof question !== "string") {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  const session = await resolveAgentSession(token);
  if (!session) {
    return Response.json({ error: "unknown or expired session" }, { status: 404 });
  }

  const [meeting] = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      categoryId: meetings.categoryId,
    })
    .from(meetings)
    .where(eq(meetings.id, session.meetingId));

  if (!meeting) {
    return Response.json({ error: "meeting not found" }, { status: 404 });
  }

  const answer = await answerQuestionText(
    question,
    {
      userId: meeting.userId,
      ...(meeting.categoryId
        ? { categoryId: meeting.categoryId }
        : { uncategorizedOnly: true }),
    },
    { conversationHistory: await recentHistory(meeting.id) },
  );

  await db.insert(liveChatMessages).values([
    {
      meetingId: meeting.id,
      role: "user",
      participantName: typeof speaker === "string" ? speaker : null,
      text: question,
      channel: "voice",
    },
    { meetingId: meeting.id, role: "assistant", text: answer, channel: "voice" },
  ]);

  return Response.json({ answer });
}

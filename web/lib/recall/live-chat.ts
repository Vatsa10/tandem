import { desc, eq } from "drizzle-orm";
import { answerQuestionText } from "@/lib/ai/rag";
import { db } from "@/lib/db/client";
import { liveChatMessages, meetings } from "@/lib/db/schema";
import { BOT_DISPLAY_NAME, extractQuestion } from "@/lib/agent/trigger";
import { sendChatMessage } from "./client";

// Re-exported so existing callers keep importing the bot identity from the
// Recall layer while the definition lives with the other pure agent logic.
export { BOT_DISPLAY_NAME };

const CHAT_CHAR_LIMITS: Record<string, number> = {
  google_meet: 500,
  zoom: 4096,
  teams: 4096,
};
const DEFAULT_CHAT_CHAR_LIMIT = 500;

// Each webhook delivery is a separate serverless invocation with no shared
// memory, so recent conversation context is read back from
// live_chat_messages rather than held in process.
const HISTORY_LIMIT = 10;

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

async function getRecentHistory(meetingId: string): Promise<string | null> {
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

export async function handleLiveChatMessage(
  botId: string,
  participantName: string | null,
  text: string,
): Promise<void> {
  // Recall reports the bot's own sent messages back through the same
  // participant-chat event — without this guard, a reply containing
  // "Tandem" would re-trigger itself.
  if (participantName === BOT_DISPLAY_NAME) return;

  const question = extractQuestion(text);
  if (!question) return;

  const [meeting] = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      categoryId: meetings.categoryId,
      platform: meetings.platform,
    })
    .from(meetings)
    .where(eq(meetings.recallBotId, botId));

  if (!meeting) return;

  const conversationHistory = await getRecentHistory(meeting.id);

  const answer = await answerQuestionText(
    question,
    {
      userId: meeting.userId,
      ...(meeting.categoryId
        ? { categoryId: meeting.categoryId }
        : { uncategorizedOnly: true }),
    },
    { conversationHistory },
  );

  const limit =
    CHAT_CHAR_LIMITS[meeting.platform ?? ""] ?? DEFAULT_CHAT_CHAR_LIMIT;
  const truncated = truncate(answer, limit);

  await db.insert(liveChatMessages).values([
    { meetingId: meeting.id, role: "user", participantName, text: question },
    { meetingId: meeting.id, role: "assistant", text: truncated },
  ]);

  await sendChatMessage(botId, truncated);
}

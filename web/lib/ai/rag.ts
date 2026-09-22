import { generateObject, generateText, streamText, type ModelMessage } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { meetings } from "@/lib/db/schema";
import { qdrant, TRANSCRIPT_CHUNKS_COLLECTION } from "@/lib/vector/client";
import { embedQuery } from "./embeddings";
import { getChatModel } from "./model";

// Not imported from lib/recall/live-chat.ts's BOT_DISPLAY_NAME (that would
// be a circular import — live-chat.ts already imports from this file) and
// doesn't need exact-match consistency with it anyway, since this is just
// descriptive text for the model, not a value compared anywhere.
const ASSISTANT_SYSTEM_PROMPT =
  "You are Tandem (Abhijeet's Assistant), a helpful AI assistant. Answer " +
  "normally and helpfully — this question doesn't need meeting transcript " +
  "context.";

const NeedsContextSchema = z.object({
  needsMeetingContext: z
    .boolean()
    .describe(
      "true if answering requires looking up the user's past meeting transcripts",
    ),
});

// Cheap classification pass before doing any embedding/retrieval — greetings
// and general questions ("hii", "what's 2+2") shouldn't be forced through
// the RAG pipeline and answered with "no relevant excerpts found".
// `conversationHistory`, when given, lets a bare follow-up ("and pricing?")
// classify correctly instead of looking like unrelated small talk on its own.
async function needsMeetingContext(
  question: string,
  conversationHistory?: string | null,
): Promise<boolean> {
  if (!question.trim()) return false;

  try {
    const result = await generateObject({
      model: getChatModel(),
      schema: NeedsContextSchema,
      system:
        "Decide whether answering the user's message requires searching " +
        "their past meeting transcripts. Say true for anything asking what " +
        "was said, decided, or discussed in a meeting, or requesting a " +
        "summary/recap — including a short follow-up that only makes sense " +
        "in light of the conversation so far. Say false for greetings, " +
        "small talk, or general questions unrelated to their meetings." +
        (conversationHistory
          ? `\n\nRecent conversation:\n${conversationHistory}`
          : ""),
      prompt: question,
    });
    return result.object.needsMeetingContext;
  } catch {
    // Classification failed — default to running the RAG pipeline. A
    // wrong "no relevant excerpts" answer is a safer failure than
    // silently skipping context that was actually needed.
    return true;
  }
}

export interface ChatScope {
  userId: string;
  /** Takes precedence over categoryId/uncategorizedOnly if set. */
  meetingId?: string;
  /** Ignored if meetingId is set. */
  categoryId?: string;
  /** Meetings with no category. Never sent by web chat — this is only the
      live in-meeting @Tandem fallback when the active meeting has no
      category (see lib/recall/live-chat.ts). Ignored if meetingId or
      categoryId is set. */
  uncategorizedOnly?: boolean;
  // Web chat requires meetingId or categoryId (enforced in
  // app/api/chat/route.ts) — there is no unscoped "every meeting"
  // retrieval surface.
}

export interface RetrievedChunk {
  text: string;
  speaker: string | null;
  startMs: number;
  meetingId: string;
  score: number;
}

export async function retrieveChunks(
  question: string,
  scope: ChatScope,
  limit = 8,
): Promise<RetrievedChunk[]> {
  let filter: object;

  if (scope.meetingId) {
    // Verify the caller actually owns this meeting before filtering Qdrant
    // by it — meetingId comes straight from client input (see
    // app/api/chat/route.ts), so without this check any signed-in user
    // could read another user's transcript by guessing/observing their
    // meeting id.
    const [owned] = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(
        and(eq(meetings.id, scope.meetingId), eq(meetings.userId, scope.userId)),
      );

    if (!owned) return [];

    filter = { must: [{ key: "meeting_id", match: { value: scope.meetingId } }] };
  } else if (scope.categoryId || scope.uncategorizedOnly) {
    // Category membership is resolved from Postgres at query time rather
    // than synced into Qdrant payloads — categories get renamed/reassigned,
    // and that sync path isn't worth the drift risk.
    const rows = await db
      .select({ id: meetings.id })
      .from(meetings)
      .where(
        scope.categoryId
          ? and(
              eq(meetings.userId, scope.userId),
              eq(meetings.categoryId, scope.categoryId),
            )
          : and(eq(meetings.userId, scope.userId), isNull(meetings.categoryId)),
      );
    const meetingIds = rows.map((r) => r.id);

    if (meetingIds.length === 0) return [];

    filter = { must: [{ key: "meeting_id", match: { any: meetingIds } }] };
  } else {
    throw new Error(
      "retrieveChunks requires meetingId, categoryId, or uncategorizedOnly",
    );
  }

  const vector = await embedQuery(question);

  const results = await qdrant.search(TRANSCRIPT_CHUNKS_COLLECTION, {
    vector,
    filter,
    limit,
    with_payload: true,
  });

  return results.map((r) => {
    const payload = r.payload as Record<string, unknown>;
    return {
      text: payload.text as string,
      speaker: (payload.speaker as string | null) ?? null,
      startMs: payload.start_ms as number,
      meetingId: payload.meeting_id as string,
      score: r.score,
    };
  });
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant transcript excerpts were found.";
  }
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.speaker ?? "Unknown"} @ ${formatTimestamp(c.startMs)}) ${c.text}`,
    )
    .join("\n");
}

function extractLastUserText(messages: ModelMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  if (typeof lastUser.content === "string") return lastUser.content;
  return lastUser.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
}

export async function answerQuestion(
  messages: ModelMessage[],
  scope: ChatScope,
) {
  const question = extractLastUserText(messages);

  if (!(await needsMeetingContext(question))) {
    return streamText({
      model: getChatModel(),
      system: ASSISTANT_SYSTEM_PROMPT,
      messages,
    });
  }

  const chunks = await retrieveChunks(question, scope);
  const context = buildContext(chunks);

  return streamText({
    model: getChatModel(),
    system:
      "You answer questions about meeting transcripts using only the excerpts " +
      "provided below. Cite excerpts by their [n] marker and mention the " +
      "speaker/timestamp when useful. If the excerpts don't contain the " +
      "answer, say so plainly instead of guessing.\n\n" +
      `Transcript excerpts:\n${context}`,
    messages,
  });
}

// Non-streaming variant for the live in-meeting chat handler, which needs
// a single plain-text reply to hand to Recall's send-chat-message
// endpoint rather than a UI stream. `conversationHistory` is the last ~10
// turns of "@Tandem" exchanges in this same live meeting (see
// lib/recall/live-chat.ts) — there's no multi-turn `messages` array here
// like the streaming web-chat path, so it's folded into the system prompt
// instead of separate role-tagged messages.
export async function answerQuestionText(
  question: string,
  scope: ChatScope,
  options?: { conversationHistory?: string | null },
): Promise<string> {
  const conversationHistory = options?.conversationHistory;
  const liveChatSuffix =
    " This reply is being posted directly into a live meeting's chat " +
    "panel, so keep it to 1-3 short sentences — no markdown.";
  const historyBlock = conversationHistory
    ? `\n\nRecent conversation in this meeting:\n${conversationHistory}`
    : "";

  if (!(await needsMeetingContext(question, conversationHistory))) {
    const result = await generateText({
      model: getChatModel(),
      system: ASSISTANT_SYSTEM_PROMPT + liveChatSuffix + historyBlock,
      prompt: question,
    });
    return result.text;
  }

  const chunks = await retrieveChunks(question, scope);
  const context = buildContext(chunks);

  const result = await generateText({
    model: getChatModel(),
    system:
      "You answer questions about past meetings using the transcript " +
      "excerpts below, grounding your answer in them and not guessing " +
      "beyond what they say." +
      liveChatSuffix +
      " No citation markers." +
      (conversationHistory
        ? " You're also shown the recent conversation in this live " +
          "meeting's chat — if the question is actually about that " +
          "(e.g. \"what did you just say\"), answer from it directly " +
          "instead of the transcript excerpts."
        : "") +
      historyBlock +
      `\n\nTranscript excerpts:\n${context}`,
    prompt: question,
  });

  return result.text;
}

import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { answerQuestion } from "@/lib/ai/rag";
import { getCurrentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(request: Request) {
  const {
    messages,
    meetingId,
    categoryId,
  }: {
    messages: UIMessage[];
    meetingId?: string;
    categoryId?: string;
  } = await request.json();

  // Web chat is deliberately scoped: a single meeting or one category.
  // There is no "all meetings" / uncategorized surface here.
  if (!meetingId && !categoryId) {
    return Response.json(
      { error: "meetingId or categoryId is required" },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();

  const limited = await rateLimit("chat", userId);
  if (limited) return limited;

  const result = await answerQuestion(await convertToModelMessages(messages), {
    userId,
    meetingId,
    categoryId,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

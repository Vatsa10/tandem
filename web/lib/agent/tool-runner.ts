import { and, desc, eq, isNotNull } from "drizzle-orm";
import { retrieveChunks } from "@/lib/ai/rag";
import { db } from "@/lib/db/client";
import {
  calendarConnections,
  liveChatMessages,
  meetings,
  participants,
} from "@/lib/db/schema";
import {
  listCalendarEvents,
  removeBotFromCall,
  sendChatMessage,
} from "@/lib/recall/client";
import { extractEventTitle } from "@/lib/recall/event-title";
import type { AgentSession } from "./store";
import { findTool } from "./tools";
import { BOT_DISPLAY_NAME } from "./trigger";
import { webSearch } from "./web-search";

// Everything a tool call needs that the page must not be trusted to supply:
// resolved from the session token, never from the request body.
export interface ToolContext {
  session: AgentSession;
  meetingId: string;
  userId: string;
  categoryId: string | null;
  recallBotId: string;
}

export async function loadToolContext(
  session: AgentSession,
): Promise<ToolContext | null> {
  const [meeting] = await db
    .select({
      id: meetings.id,
      userId: meetings.userId,
      categoryId: meetings.categoryId,
      recallBotId: meetings.recallBotId,
    })
    .from(meetings)
    .where(eq(meetings.id, session.meetingId));

  if (!meeting) return null;

  return {
    session,
    meetingId: meeting.id,
    userId: meeting.userId,
    categoryId: meeting.categoryId,
    recallBotId: meeting.recallBotId,
  };
}

// Results are spoken, so they are short prose rather than JSON — the model
// reads them aloud with minimal reshaping.
async function searchMeetings(ctx: ToolContext, query: string): Promise<string> {
  const chunks = await retrieveChunks(query, {
    userId: ctx.userId,
    ...(ctx.categoryId
      ? { categoryId: ctx.categoryId }
      : { uncategorizedOnly: true }),
  });

  if (chunks.length === 0) return "Nothing in the past meetings matches that.";

  return chunks
    .slice(0, 5)
    .map((chunk) => `${chunk.speaker ?? "Someone"}: ${chunk.text}`)
    .join("\n");
}

async function getParticipants(ctx: ToolContext): Promise<string> {
  const rows = await db
    .select({ name: participants.name })
    .from(participants)
    .where(eq(participants.meetingId, ctx.meetingId));

  const names = rows
    .map((row) => row.name)
    .filter((name): name is string => Boolean(name))
    .filter((name) => name !== BOT_DISPLAY_NAME);

  if (names.length === 0) return "No participants recorded for this call yet.";
  return names.join(", ");
}

async function getMeetingNotes(
  ctx: ToolContext,
  title: string | undefined,
): Promise<string> {
  const rows = await db
    .select({
      title: meetings.title,
      summary: meetings.summary,
      actionItems: meetings.actionItems,
    })
    .from(meetings)
    .where(and(eq(meetings.userId, ctx.userId), isNotNull(meetings.summary)))
    .orderBy(desc(meetings.createdAt))
    .limit(20);

  const wanted = title?.trim().toLowerCase();
  const match = wanted
    ? rows.find((row) => row.title?.toLowerCase().includes(wanted))
    : rows[0];

  if (!match) return "No notes found for that meeting.";

  const actions = (match.actionItems ?? [])
    .map((item) => `- ${item.text}${item.assignee ? ` (${item.assignee})` : ""}`)
    .join("\n");

  return [
    match.title ?? "Untitled meeting",
    match.summary ?? "",
    actions && `Action items:\n${actions}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function listUpcomingMeetings(
  ctx: ToolContext,
  limit: number,
): Promise<string> {
  const connections = await db
    .select({ recallCalendarId: calendarConnections.recallCalendarId })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, ctx.userId),
        eq(calendarConnections.status, "connected"),
      ),
    );

  if (connections.length === 0) return "No calendar is connected.";

  const now = new Date().toISOString();
  const events = [];

  for (const connection of connections) {
    const result = await listCalendarEvents(connection.recallCalendarId, {
      startTimeGte: now,
    });
    events.push(...result.results.filter((event) => !event.is_deleted));
  }

  if (events.length === 0) return "Nothing upcoming on the calendar.";

  return events
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
    .slice(0, limit)
    .map(
      (event) =>
        `${event.start_time ?? "unscheduled"} — ${extractEventTitle(event) ?? "Untitled"}`,
    )
    .join("\n");
}

// The "don't interrupt" escape hatch: the same path the @Tandem chat
// responder uses, so a spoken turn and a typed one land in one history.
async function sendChat(ctx: ToolContext, text: string): Promise<string> {
  await db.insert(liveChatMessages).values({
    meetingId: ctx.meetingId,
    role: "assistant",
    text,
    channel: "voice",
  });
  await sendChatMessage(ctx.recallBotId, text);
  return "Posted to the meeting chat.";
}

export async function runServerTool(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const tool = findTool(name);
  if (!tool) return `Unknown tool: ${name}`;
  if (tool.location !== "server") {
    return `${name} runs in the meeting page, not on the server.`;
  }

  switch (name) {
    case "search_meetings":
      return searchMeetings(ctx, String(args.query ?? ""));
    case "get_participants":
      return getParticipants(ctx);
    case "get_meeting_notes":
      return getMeetingNotes(ctx, args.title as string | undefined);
    case "list_upcoming_meetings":
      return listUpcomingMeetings(ctx, Number(args.limit ?? 5));
    case "web_search":
      return webSearch(String(args.query ?? ""));
    case "send_chat":
      return sendChat(ctx, String(args.text ?? ""));
    case "leave_meeting":
      await removeBotFromCall(ctx.recallBotId);
      return "Left the meeting.";
    default:
      return `Unknown tool: ${name}`;
  }
}

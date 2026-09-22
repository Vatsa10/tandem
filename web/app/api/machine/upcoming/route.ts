import { and, eq } from "drizzle-orm";
import { authenticateApiKey } from "@/lib/agent/api-key-store";
import { db } from "@/lib/db/client";
import { calendarConnections } from "@/lib/db/schema";
import { listCalendarEvents } from "@/lib/recall/client";
import { extractEventTitle } from "@/lib/recall/event-title";

// Upcoming calendar events for the key's owner — the other half of what the
// local MCP tool cannot know on its own. Same auth rules as
// /api/machine/search: the key decides whose calendar this is.
export async function GET(request: Request) {
  const userId = await authenticateApiKey(request.headers.get("authorization"));
  if (!userId) {
    return Response.json({ error: "invalid api key" }, { status: 401 });
  }

  const limit = Math.min(
    Number(new URL(request.url).searchParams.get("limit") ?? 5),
    20,
  );

  const connections = await db
    .select({ recallCalendarId: calendarConnections.recallCalendarId })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.userId, userId),
        eq(calendarConnections.status, "connected"),
      ),
    );

  const now = new Date().toISOString();
  const events = [];

  for (const connection of connections) {
    const result = await listCalendarEvents(connection.recallCalendarId, {
      startTimeGte: now,
    });
    events.push(...result.results.filter((event) => !event.is_deleted));
  }

  return Response.json({
    events: events
      .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
      .slice(0, limit)
      .map((event) => ({
        title: extractEventTitle(event) ?? "Untitled",
        startTime: event.start_time,
        meetingUrl: event.meeting_url ?? null,
      })),
  });
}

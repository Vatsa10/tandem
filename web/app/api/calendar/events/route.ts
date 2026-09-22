import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { calendarConnections } from "@/lib/db/schema";
import { listCalendarEvents } from "@/lib/recall/client";
import { extractEventTitle } from "@/lib/recall/event-title";

export async function GET() {
  const userId = await getCurrentUserId();

  const connections = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId));

  if (connections.length === 0) {
    return Response.json({ error: "No calendar connected" }, { status: 404 });
  }

  const perConnectionEvents = await Promise.all(
    connections.map(async (connection) => {
      const result = await listCalendarEvents(connection.recallCalendarId, {
        startTimeGte: new Date().toISOString(),
      });
      // Deliberately not spreading the raw event — it carries the full
      // provider payload (attendee emails, etc.) that the client has no
      // need to see.
      return result.results.map((event) => ({
        id: event.id,
        ical_uid: event.ical_uid,
        start_time: event.start_time,
        end_time: event.end_time,
        is_deleted: event.is_deleted,
        meeting_url: event.meeting_url ?? null,
        bots: event.bots,
        title: extractEventTitle(event),
        provider: connection.provider,
        accountEmail: connection.email,
      }));
    }),
  );

  const events = perConnectionEvents
    .flat()
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

  return Response.json({ events });
}

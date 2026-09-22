import { and, eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { calendarConnections } from "@/lib/db/schema";
import { listCalendarEvents } from "@/lib/recall/client";
import { scheduleBotForCalendarEvent } from "@/lib/recall/schedule-event";

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/calendar/connections/[id]">,
) {
  const { id } = await params;
  const { autoRecord } = await request.json();

  if (typeof autoRecord !== "boolean") {
    return Response.json(
      { error: "autoRecord must be a boolean" },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();

  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.id, id),
        eq(calendarConnections.userId, userId),
      ),
    );

  if (!connection) {
    return Response.json({ error: "Connection not found" }, { status: 404 });
  }

  await db
    .update(calendarConnections)
    .set({ autoRecord })
    .where(eq(calendarConnections.id, id));

  // Turning it on should also cover what's already on the calendar, not
  // just events changed from this point forward (that part is handled by
  // the calendar.sync_events webhook).
  let scheduled = 0;
  let failed = 0;

  if (autoRecord) {
    const result = await listCalendarEvents(connection.recallCalendarId, {
      startTimeGte: new Date().toISOString(),
    });

    for (const event of result.results) {
      if (event.is_deleted || !event.meeting_url || event.bots?.length) {
        continue;
      }
      try {
        await scheduleBotForCalendarEvent(userId, event.id, event.ical_uid);
        scheduled++;
      } catch (err) {
        console.error(`Failed to auto-schedule event ${event.id}`, err);
        failed++;
      }
    }
  }

  return Response.json({ autoRecord, scheduled, failed });
}

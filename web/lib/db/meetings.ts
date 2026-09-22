import { and, eq, like, ne, not } from "drizzle-orm";
import { db } from "./client";
import { meetings } from "./schema";

// A meeting is still "active" (Tandem's responsibility) until it reaches a
// terminal state — used to stop a second bot getting dispatched to a
// meeting that's already being handled (e.g. auto-recorded from a
// calendar invite, then also manually joined via a pasted link).
export async function findActiveMeetingForUrl(
  userId: string,
  meetingUrl: string,
): Promise<{ id: string } | null> {
  const [existing] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.userId, userId),
        eq(meetings.meetingUrl, meetingUrl),
        ne(meetings.status, "done"),
        not(like(meetings.status, "fatal%")),
      ),
    )
    .limit(1);

  return existing ?? null;
}

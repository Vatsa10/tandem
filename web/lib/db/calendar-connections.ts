import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { calendarConnections } from "@/lib/db/schema";

export async function upsertCalendarConnection(
  userId: string,
  provider: string,
  recallCalendarId: string,
  status: string,
  email?: string,
): Promise<void> {
  // Without an email we can't tell "reconnecting the same account" apart
  // from "connecting a different one" — always insert rather than risk
  // silently overwriting a different account's connection.
  const existing = email
    ? (
        await db
          .select({ id: calendarConnections.id })
          .from(calendarConnections)
          .where(
            and(
              eq(calendarConnections.userId, userId),
              eq(calendarConnections.provider, provider),
              eq(calendarConnections.email, email),
            ),
          )
      )[0]
    : undefined;

  if (existing) {
    await db
      .update(calendarConnections)
      .set({ recallCalendarId, status })
      .where(eq(calendarConnections.id, existing.id));
  } else {
    await db
      .insert(calendarConnections)
      .values({ userId, provider, recallCalendarId, status, email });
  }
}

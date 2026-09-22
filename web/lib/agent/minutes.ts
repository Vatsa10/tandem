import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentSessions } from "@/lib/db/schema";

// OpenAI Realtime bills per minute of audio, so an agent left running in
// an abandoned meeting is an open tap. 30 minutes of speech per meeting is
// well past a useful session and bounds the worst case.
export const MAX_AGENT_SECONDS_PER_MEETING = 30 * 60;

// The page gets the budget in slices rather than all at once, so a page
// that stops checking in stops costing money.
export const GRANT_SECONDS = 5 * 60;

export function remainingSeconds(secondsUsed: number): number {
  return Math.max(0, MAX_AGENT_SECONDS_PER_MEETING - secondsUsed);
}

export function nextGrant(secondsUsed: number): number {
  return Math.min(GRANT_SECONDS, remainingSeconds(secondsUsed));
}

// Incremented in SQL rather than read-modify-write: two concurrent grants
// for the same session must not lose a charge.
export async function chargeSeconds(
  sessionId: string,
  seconds: number,
): Promise<void> {
  await db
    .update(agentSessions)
    .set({ secondsUsed: sql`${agentSessions.secondsUsed} + ${seconds}` })
    .where(eq(agentSessions.id, sessionId));
}

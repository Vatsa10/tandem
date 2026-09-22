import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentSessions } from "@/lib/db/schema";
import { AGENT_SESSION_TTL_MS, mintToken } from "./token";

export interface AgentSession {
  id: string;
  meetingId: string;
  userId: string;
  secondsUsed: number;
}

export async function createAgentSession(
  meetingId: string,
  userId: string,
): Promise<string> {
  const token = mintToken();
  await db.insert(agentSessions).values({
    token,
    meetingId,
    userId,
    expiresAt: new Date(Date.now() + AGENT_SESSION_TTL_MS),
  });
  return token;
}

// Returns null for an unknown or expired token. The expiry is part of the
// query rather than a post-check, so an expired row can never be used.
export async function resolveAgentSession(
  token: string,
): Promise<AgentSession | null> {
  const [row] = await db
    .select({
      id: agentSessions.id,
      meetingId: agentSessions.meetingId,
      userId: agentSessions.userId,
      secondsUsed: agentSessions.secondsUsed,
    })
    .from(agentSessions)
    .where(
      and(eq(agentSessions.token, token), gt(agentSessions.expiresAt, new Date())),
    );

  return row ?? null;
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

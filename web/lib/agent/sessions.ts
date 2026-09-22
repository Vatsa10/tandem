import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentSessions } from "@/lib/db/schema";

// Long enough to outlive any meeting, short enough that a leaked URL in a
// calendar invite or a screen share stops working the same day.
export const AGENT_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

export interface AgentSession {
  id: string;
  meetingId: string;
  userId: string;
  secondsUsed: number;
}

// 32 bytes, base64url, no padding — 43 characters. This is the only
// credential on the agent page, so it comes from a CSPRNG, never derived
// from the meeting id or anything else a third party could guess.
export function mintToken(): string {
  return randomBytes(32).toString("base64url");
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

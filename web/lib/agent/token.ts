import { randomBytes } from "node:crypto";

// Pure token minting for the agent page, kept apart from the database
// layer in lib/agent/store.ts so it can be tested without an environment.

// Long enough to outlive any meeting, short enough that a leaked URL in a
// calendar invite or a screen share stops working the same day.
export const AGENT_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

// 32 bytes, base64url, no padding — 43 characters. This is the only
// credential on the agent page, so it comes from a CSPRNG, never derived
// from the meeting id or anything else a third party could guess.
export function mintToken(): string {
  return randomBytes(32).toString("base64url");
}

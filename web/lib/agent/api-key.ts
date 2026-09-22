import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Machine credentials for the local MCP tool. Pure crypto and string work —
// the database half lives in lib/agent/api-key-store.ts so this stays
// testable without an environment.

export const API_KEY_PREFIX = "tdm_";

/** Characters kept in the clear for display. Enough to tell two keys apart,
    far too few to guess the rest. */
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 6;

export function mintApiKey(): string {
  return API_KEY_PREFIX + randomBytes(32).toString("base64url");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, DISPLAY_PREFIX_LENGTH);
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length > API_KEY_PREFIX.length + 20;
}

/** Constant-time comparison of two hex digests, so a caller cannot learn a
    stored hash one byte at a time from response timing. */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

/** Pulls the key out of an `Authorization: Bearer …` header. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value.trim() || null;
}

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apiKeys } from "@/lib/db/schema";
import {
  apiKeyPrefix,
  bearerToken,
  hashApiKey,
  hashesMatch,
  looksLikeApiKey,
  mintApiKey,
} from "./api-key";

export interface CreatedApiKey {
  id: string;
  name: string;
  /** Shown once, at creation. Never recoverable afterwards. */
  key: string;
}

export async function createApiKey(
  userId: string,
  name: string,
): Promise<CreatedApiKey> {
  const key = mintApiKey();
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      name,
      keyHash: hashApiKey(key),
      keyPrefix: apiKeyPrefix(key),
    })
    .returning({ id: apiKeys.id, name: apiKeys.name });

  return { id: row.id, name: row.name, key };
}

export async function listApiKeys(userId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));
}

export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, id))
    .returning({ id: apiKeys.id, userId: apiKeys.userId });

  // Checked after the fact rather than in the WHERE clause so a mismatched
  // owner is impossible to confuse with a missing row.
  return deleted.some((row) => row.userId === userId);
}

/** Resolves an `Authorization: Bearer tdm_…` header to a user id, or null.
    The lookup is by hash, so the plaintext key never touches a query. */
export async function authenticateApiKey(
  authorization: string | null,
): Promise<string | null> {
  const key = bearerToken(authorization);
  if (!key || !looksLikeApiKey(key)) return null;

  const hash = hashApiKey(key);
  const [row] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId, keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash));

  if (!row || !hashesMatch(row.keyHash, hash)) return null;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));

  return row.userId;
}

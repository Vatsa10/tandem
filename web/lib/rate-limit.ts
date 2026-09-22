import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// One limiter per cost/abuse profile rather than one global limit — bot
// creation costs real money per call (Recall + AI), chat is cheap but
// high-frequency, and each needs its own ceiling.
let limiters: {
  bots: Ratelimit;
  chat: Ratelimit;
  intelligence: Ratelimit;
} | null = null;

function getLimiters() {
  if (!limiters) {
    const client = getRedis();
    limiters = {
      // Join-now + calendar schedule: creates a real Recall bot per call.
      bots: new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "ratelimit:bots",
      }),
      // Chat: cheap per-call but high-frequency; bound request rate, not
      // just cost.
      chat: new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(30, "5 m"),
        prefix: "ratelimit:chat",
      }),
      // Meeting-intelligence regeneration: a full-transcript DeepSeek call.
      intelligence: new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "ratelimit:intelligence",
      }),
    };
  }
  return limiters;
}

export type RateLimitCategory = keyof ReturnType<typeof getLimiters>;

/**
 * Checks `identifier` (typically the internal user id) against the named
 * limiter. Returns `null` when under the limit, or a ready-to-return 429
 * Response (with Retry-After) when over it — callers just do:
 *
 *   const limited = await rateLimit("chat", userId);
 *   if (limited) return limited;
 */
export async function rateLimit(
  category: RateLimitCategory,
  identifier: string,
): Promise<Response | null> {
  let result: { success: boolean; limit: number; remaining: number; reset: number };
  try {
    result = await getLimiters()[category].limit(identifier);
  } catch (err) {
    // Fail open: this is a cost/abuse safety net, not core functionality —
    // an Upstash outage or missing config shouldn't take down bot creation
    // or chat for every real user.
    console.error(`Rate limit check failed for "${category}"`, err);
    return null;
  }

  const { success, limit, remaining, reset } = result;
  if (success) return null;

  const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

  return Response.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  );
}

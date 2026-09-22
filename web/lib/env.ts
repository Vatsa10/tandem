function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get QDRANT_URL() {
    return required("QUADRANT_CLUSTER_ENDPOINT");
  },
  get QDRANT_API_KEY() {
    return required("QUADRANT_API_KEY");
  },
  get RECALL_API_KEY() {
    return required("RECALL_API_KEY");
  },
  get RECALL_API_REGION() {
    return required("RECALL_API_REGION");
  },
  get GEMINI_API_KEY() {
    return required("GEMINI_API_KEY");
  },
  get RECALL_WEBHOOK_SECRET() {
    return required("RECALL_WEBHOOK_SECRET");
  },
  get GOOGLE_OAUTH_CLIENT_ID() {
    return required("GOOGLE_OAUTH_CLIENT_ID");
  },
  get GOOGLE_OAUTH_CLIENT_SECRET() {
    return required("GOOGLE_OAUTH_CLIENT_SECRET");
  },
  get DEEPSEEK_API_KEY() {
    return required("DEEPSEEK_API_KEY");
  },
  get MICROSOFT_OAUTH_CLIENT_ID() {
    return required("MICROSOFT_OAUTH_CLIENT_ID");
  },
  get MICROSOFT_OAUTH_CLIENT_SECRET() {
    return required("MICROSOFT_OAUTH_CLIENT_SECRET");
  },
  // Absolute origin (no trailing slash) — needed to hand Recall an
  // absolute webhook URL for `realtime_endpoints`, including from
  // contexts with no incoming `Request` to derive it from (e.g. the
  // calendar.sync_events webhook path).
  get APP_BASE_URL() {
    return required("APP_BASE_URL");
  },
  // Upstash Redis REST API — backs rate limiting (lib/rate-limit.ts).
  get UPSTASH_REDIS_REST_URL() {
    return required("UPSTASH_REDIS_REST_URL");
  },
  get UPSTASH_REDIS_REST_TOKEN() {
    return required("UPSTASH_REDIS_REST_TOKEN");
  },
};

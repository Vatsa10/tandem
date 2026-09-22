import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@/lib/env";

// Constructed on first use, not at import — same reason as lib/db/client.ts:
// `next build` imports every route module to collect page data, so reading
// the Qdrant credentials here eagerly broke the build on any machine without
// them.
let instance: QdrantClient | undefined;

function getQdrant(): QdrantClient {
  if (!instance) {
    instance = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY,
    });
  }
  return instance;
}

export const qdrant = new Proxy({} as QdrantClient, {
  get(_target, property, receiver) {
    return Reflect.get(getQdrant(), property, receiver);
  },
});

export const TRANSCRIPT_CHUNKS_COLLECTION = "transcript_chunks";

// gemini-embedding-001 (direct Google provider, truncated via
// outputDimensionality) — revisit if the embedding model changes, since
// the collection would need recreating.
export const EMBEDDING_DIMENSIONS = 768;

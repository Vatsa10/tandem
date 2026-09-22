import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "@/lib/env";

export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});

export const TRANSCRIPT_CHUNKS_COLLECTION = "transcript_chunks";

// gemini-embedding-001 (direct Google provider, truncated via
// outputDimensionality) — revisit if the embedding model changes, since
// the collection would need recreating.
export const EMBEDDING_DIMENSIONS = 768;

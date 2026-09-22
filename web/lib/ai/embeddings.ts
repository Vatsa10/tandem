import { createGoogle, type GoogleEmbeddingModelOptions } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { env } from "@/lib/env";
import { EMBEDDING_DIMENSIONS } from "@/lib/vector/client";

// Lazy — reading env.GEMINI_API_KEY at module load time would make any
// build that imports this file fail before the key is even needed.
let embeddingModel: ReturnType<
  ReturnType<typeof createGoogle>["embedding"]
> | undefined;

function getEmbeddingModel() {
  if (!embeddingModel) {
    const google = createGoogle({ apiKey: env.GEMINI_API_KEY });
    embeddingModel = google.embedding("gemini-embedding-001");
  }
  return embeddingModel;
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      } satisfies GoogleEmbeddingModelOptions,
    },
  });
  return embedding;
}

// Gemini's free tier caps embedContent at 100 requests/minute per project
// — confirmed live (a 238-chunk meeting reliably hit
// EmbedContentRequestsPerMinutePerUserPerProjectPerModel-FreeTier, since
// embedMany's own batching still counts each text against that quota).
// Batching under the cap with a cooldown between batches trades latency
// (a long meeting takes a few extra minutes to finish processing after
// the call ends) for not silently failing partway through — see
// lib/recall/process-meeting.ts, which now also refuses to write
// anything to Postgres until this succeeds, so a genuine failure here
// leaves no partial state to clean up.
const EMBEDDING_BATCH_SIZE = 90;
const EMBEDDING_BATCH_COOLDOWN_MS = 65_000;

export async function embedChunks(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    if (i > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, EMBEDDING_BATCH_COOLDOWN_MS),
      );
    }

    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: getEmbeddingModel(),
      values: batch,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        } satisfies GoogleEmbeddingModelOptions,
      },
    });
    results.push(...embeddings);
  }

  return results;
}

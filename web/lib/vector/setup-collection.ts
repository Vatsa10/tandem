import {
  EMBEDDING_DIMENSIONS,
  qdrant,
  TRANSCRIPT_CHUNKS_COLLECTION,
} from "./client";

async function main() {
  const { collections } = await qdrant.getCollections();
  const existing = collections.find((c) => c.name === TRANSCRIPT_CHUNKS_COLLECTION);

  if (existing) {
    const info = await qdrant.getCollection(TRANSCRIPT_CHUNKS_COLLECTION);
    const currentSize = info.config.params.vectors?.size;

    if (currentSize === EMBEDDING_DIMENSIONS) {
      console.log(`Collection "${TRANSCRIPT_CHUNKS_COLLECTION}" already up to date.`);
      return;
    }

    console.log(
      `Recreating "${TRANSCRIPT_CHUNKS_COLLECTION}" (${currentSize} -> ${EMBEDDING_DIMENSIONS} dims).`,
    );
    await qdrant.deleteCollection(TRANSCRIPT_CHUNKS_COLLECTION);
  }

  await qdrant.createCollection(TRANSCRIPT_CHUNKS_COLLECTION, {
    vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
  });
  console.log(`Created collection "${TRANSCRIPT_CHUNKS_COLLECTION}".`);

  // Payload filters used by RAG scope: single-meeting (meeting_id) and
  // cross-meeting (user_id).
  for (const field of ["meeting_id", "user_id"] as const) {
    await qdrant.createPayloadIndex(TRANSCRIPT_CHUNKS_COLLECTION, {
      field_name: field,
      field_schema: "keyword",
    });
  }

  console.log("Payload indexes ready: meeting_id, user_id.");
}

main();

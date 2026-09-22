import { qdrant, TRANSCRIPT_CHUNKS_COLLECTION } from "./client";

export interface TranscriptChunkPoint {
  id: string;
  vector: number[];
  meetingId: string;
  userId: string;
  speaker: string | null;
  startMs: number;
  endMs: number;
  text: string;
}

export async function upsertTranscriptChunks(
  points: TranscriptChunkPoint[],
): Promise<void> {
  if (points.length === 0) return;

  await qdrant.upsert(TRANSCRIPT_CHUNKS_COLLECTION, {
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: {
        meeting_id: p.meetingId,
        user_id: p.userId,
        speaker: p.speaker,
        start_ms: p.startMs,
        end_ms: p.endMs,
        text: p.text,
      },
    })),
  });
}

export async function deleteTranscriptChunksForMeeting(
  meetingId: string,
): Promise<void> {
  await qdrant.delete(TRANSCRIPT_CHUNKS_COLLECTION, {
    filter: { must: [{ key: "meeting_id", match: { value: meetingId } }] },
  });
}

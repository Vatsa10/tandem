import { and, asc, eq } from "drizzle-orm";
import { generateMeetingIntelligence } from "@/lib/ai/meeting-intelligence";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { meetings, transcriptChunks } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const limited = await rateLimit("intelligence", userId);
  if (limited) return limited;

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)));

  if (!meeting) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (meeting.status !== "done") {
    return Response.json(
      { error: "Meeting must be completed before generating notes" },
      { status: 400 },
    );
  }

  const chunks = await db
    .select({
      speaker: transcriptChunks.speaker,
      startMs: transcriptChunks.startMs,
      text: transcriptChunks.text,
    })
    .from(transcriptChunks)
    .where(eq(transcriptChunks.meetingId, meeting.id))
    .orderBy(asc(transcriptChunks.startMs));

  if (chunks.length === 0) {
    return Response.json(
      { error: "No transcript available for this meeting" },
      { status: 400 },
    );
  }

  try {
    const intelligence = await generateMeetingIntelligence(chunks, {
      title: meeting.title,
    });

    if (!intelligence) {
      return Response.json(
        { error: "Could not generate notes from transcript" },
        { status: 502 },
      );
    }

    const [updated] = await db
      .update(meetings)
      .set({
        summary: intelligence.summary,
        actionItems: intelligence.actionItems,
        highlights: intelligence.highlights,
      })
      .where(eq(meetings.id, meeting.id))
      .returning({
        summary: meetings.summary,
        actionItems: meetings.actionItems,
        highlights: meetings.highlights,
      });

    return Response.json({ intelligence: updated });
  } catch (err) {
    console.error(`Regenerate intelligence failed for meeting ${id}`, err);
    return Response.json(
      { error: "Failed to generate meeting notes" },
      { status: 502 },
    );
  }
}

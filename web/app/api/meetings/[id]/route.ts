import { and, eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  categories,
  liveChatMessages,
  meetings,
  participants,
  transcriptChunks,
} from "@/lib/db/schema";
import {
  cancelScheduledBot,
  removeBotFromCall,
} from "@/lib/recall/client";
import { deleteTranscriptChunksForMeeting } from "@/lib/vector/transcript-chunks";

export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/meetings/[id]">,
) {
  const { id } = await params;
  const { categoryId } = await request.json();

  if (categoryId !== null && typeof categoryId !== "string") {
    return Response.json(
      { error: "categoryId must be a string or null" },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();

  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)));

  if (!meeting) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  if (categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.userId, userId)),
      );

    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }
  }

  const [updated] = await db
    .update(meetings)
    .set({ categoryId })
    .where(eq(meetings.id, id))
    .returning();

  return Response.json({ meeting: updated });
}

export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/meetings/[id]">,
) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, id), eq(meetings.userId, userId)));

  if (!meeting) {
    return Response.json({ error: "Meeting not found" }, { status: 404 });
  }

  const isFinished =
    meeting.status === "done" || meeting.status.startsWith("fatal");

  if (!isFinished) {
    // Not yet joined a call: this cancels it outright. Already in a
    // call: cancelScheduledBot 405s, so fall back to pulling it out of
    // the live call instead of leaving it running unattended after the
    // meeting disappears from Tandem's UI.
    try {
      await cancelScheduledBot(meeting.recallBotId);
    } catch {
      try {
        await removeBotFromCall(meeting.recallBotId);
      } catch (err) {
        console.error(
          `Failed to stop Recall bot ${meeting.recallBotId} during delete`,
          err,
        );
      }
    }
  }

  await deleteTranscriptChunksForMeeting(meeting.id);
  // No onDelete cascade on these FKs — clear them before the meeting row
  // itself or the delete below fails on the foreign key constraint.
  await db.delete(transcriptChunks).where(eq(transcriptChunks.meetingId, meeting.id));
  await db.delete(participants).where(eq(participants.meetingId, meeting.id));
  await db.delete(liveChatMessages).where(eq(liveChatMessages.meetingId, meeting.id));
  await db.delete(meetings).where(eq(meetings.id, meeting.id));

  return Response.json({ deleted: true });
}

import { getCurrentUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { scheduleBotForCalendarEvent } from "@/lib/recall/schedule-event";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/calendar/events/[id]/schedule">,
) {
  const { id } = await params;
  const { icalUid, categoryId, recordVideo, recordAudio } = await request.json();

  if (!icalUid || typeof icalUid !== "string") {
    return Response.json({ error: "icalUid is required" }, { status: 400 });
  }
  if (categoryId !== undefined && categoryId !== null && typeof categoryId !== "string") {
    return Response.json(
      { error: "categoryId must be a string or null" },
      { status: 400 },
    );
  }
  if (recordVideo !== undefined && typeof recordVideo !== "boolean") {
    return Response.json({ error: "recordVideo must be a boolean" }, { status: 400 });
  }
  if (recordAudio !== undefined && typeof recordAudio !== "boolean") {
    return Response.json({ error: "recordAudio must be a boolean" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  const limited = await rateLimit("bots", userId);
  if (limited) return limited;

  try {
    const meeting = await scheduleBotForCalendarEvent(userId, id, icalUid, {
      categoryId,
      recordVideo,
      recordAudio,
    });
    return Response.json({ meeting }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to schedule bot" },
      { status: 502 },
    );
  }
}

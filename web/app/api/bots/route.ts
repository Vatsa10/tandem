import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { findActiveMeetingForUrl } from "@/lib/db/meetings";
import { meetings } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { createBot } from "@/lib/recall/client";
import { BOT_DISPLAY_NAME } from "@/lib/recall/live-chat";
import { detectPlatform } from "@/lib/recall/platform";

export async function POST(request: Request) {
  const { meetingUrl, recordVideo, recordAudio } = await request.json();

  if (!meetingUrl || typeof meetingUrl !== "string") {
    return Response.json({ error: "meetingUrl is required" }, { status: 400 });
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

  // Covers the case a calendar auto-record already dispatched a bot for
  // this same meeting (or a previous manual join did) — without this,
  // pasting the same link twice sends two bots into the same call.
  const existing = await findActiveMeetingForUrl(userId, meetingUrl);
  if (existing) {
    return Response.json(
      {
        error: "Tandem is already in this meeting.",
        meetingId: existing.id,
      },
      { status: 409 },
    );
  }

  const bot = await createBot({
    meetingUrl,
    botName: BOT_DISPLAY_NAME,
    recordVideo,
    recordAudio,
  });
  const latestStatus = bot.status_changes.at(-1)?.code ?? "joining";

  const [meeting] = await db
    .insert(meetings)
    .values({
      userId,
      recallBotId: bot.id,
      platform: detectPlatform(meetingUrl),
      meetingUrl,
      status: latestStatus,
    })
    .returning();

  return Response.json({ meeting }, { status: 201 });
}

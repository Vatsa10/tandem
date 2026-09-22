import { eq } from "drizzle-orm";
import { createAgentSession } from "@/lib/agent/store";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { findActiveMeetingForUrl } from "@/lib/db/meetings";
import { meetings } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { createBot } from "@/lib/recall/client";
import { BOT_DISPLAY_NAME } from "@/lib/recall/live-chat";
import { detectPlatform } from "@/lib/recall/platform";

export async function POST(request: Request) {
  const { meetingUrl, mode = "notetaker", recordVideo, recordAudio } =
    await request.json();

  if (!meetingUrl || typeof meetingUrl !== "string") {
    return Response.json({ error: "meetingUrl is required" }, { status: 400 });
  }
  if (mode !== "notetaker" && mode !== "live") {
    return Response.json(
      { error: "mode must be 'notetaker' or 'live'" },
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

  // Live mode has a chicken-and-egg: the agent page URL carries a token
  // bound to the meeting row, but the bot needs that URL at creation. So
  // the row is inserted first with a placeholder bot id, then patched once
  // Recall returns the real one.
  if (mode === "live") {
    const [pending] = await db
      .insert(meetings)
      .values({
        userId,
        // The column is NOT NULL and unique, so the placeholder has to be
        // unique too — not an empty string.
        recallBotId: `pending:${crypto.randomUUID()}`,
        platform: detectPlatform(meetingUrl),
        meetingUrl,
        status: "joining",
        mode,
      })
      .returning();

    const token = await createAgentSession(pending.id, userId);

    const liveBot = await createBot({
      meetingUrl,
      botName: BOT_DISPLAY_NAME,
      recordVideo,
      recordAudio,
      outputMediaUrl: `${env.APP_BASE_URL}/agent/${token}`,
    });

    const [meeting] = await db
      .update(meetings)
      .set({
        recallBotId: liveBot.id,
        status: liveBot.status_changes.at(-1)?.code ?? "joining",
      })
      .where(eq(meetings.id, pending.id))
      .returning();

    return Response.json({ meeting }, { status: 201 });
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
      mode,
    })
    .returning();

  return Response.json({ meeting }, { status: 201 });
}

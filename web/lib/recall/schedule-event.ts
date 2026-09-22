import { db } from "@/lib/db/client";
import { meetings } from "@/lib/db/schema";
import { scheduleCalendarBot } from "./client";
import { extractEventTitle } from "./event-title";
import { BOT_DISPLAY_NAME } from "./live-chat";
import { detectPlatform } from "./platform";

// Shared by the manual "Record" button and auto-record (backfill +
// calendar.sync_events webhook) — both ultimately need to call Recall's
// schedule-bot-for-event endpoint and turn the response into a
// `meetings` row the same way.
export async function scheduleBotForCalendarEvent(
  userId: string,
  eventId: string,
  icalUid: string,
  options: {
    categoryId?: string | null;
    recordVideo?: boolean;
    recordAudio?: boolean;
  } = {},
) {
  const { categoryId, recordVideo, recordAudio } = options;

  const event = await scheduleCalendarBot(eventId, {
    deduplicationKey: icalUid,
    botConfig: { botName: BOT_DISPLAY_NAME, recordVideo, recordAudio },
  });

  // Recall returns scheduled bots as a `bots` array (confirmed live) —
  // take the most recently scheduled one.
  const botId = event.bots?.at(-1)?.bot_id;
  if (!botId) {
    throw new Error(`Recall did not return a bot id for event ${eventId}`);
  }

  const meetingUrl =
    typeof event.meeting_url === "string" ? event.meeting_url : "";
  const title = extractEventTitle(event);

  const [meeting] = await db
    .insert(meetings)
    .values({
      userId,
      recallBotId: botId,
      title,
      categoryId: categoryId ?? null,
      platform: meetingUrl ? detectPlatform(meetingUrl) : null,
      meetingUrl,
      calendarEventId: event.id,
      scheduledStart: new Date(event.start_time),
      status: "scheduled",
    })
    .onConflictDoUpdate({
      target: meetings.recallBotId,
      set: {
        title,
        status: "scheduled",
        scheduledStart: new Date(event.start_time),
        // Only auto-record/backfill call sites omit categoryId — don't
        // let a re-sync silently clear a category picked at schedule time.
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
    })
    .returning();

  return meeting;
}

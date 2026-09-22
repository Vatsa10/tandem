import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db/client";
import { calendarConnections } from "@/lib/db/schema";
import { listCalendarEvents, retrieveCalendar } from "@/lib/recall/client";
import { handleLiveChatMessage } from "@/lib/recall/live-chat";
import { markBotFatal, processCompletedBot } from "@/lib/recall/process-meeting";
import { scheduleBotForCalendarEvent } from "@/lib/recall/schedule-event";
import {
  RecallBotWebhookPayloadSchema,
  RecallCalendarWebhookPayloadSchema,
  RecallChatMessageWebhookPayloadSchema,
} from "@/lib/recall/types";
import { verifyRecallWebhookSignature } from "@/lib/recall/verify-webhook";

// The response itself acks in well under a second (all real work happens
// in after()), but after() still runs within this function's own
// duration budget — processCompletedBot's throttled embedding batches
// (see lib/ai/embeddings.ts) can take a few minutes on a long meeting,
// so this needs real headroom rather than an implicit/short default.
export const maxDuration = 300;

async function syncCalendarStatus(calendarId: string): Promise<void> {
  const calendar = await retrieveCalendar(calendarId);
  await db
    .update(calendarConnections)
    .set({ status: calendar.status })
    .where(eq(calendarConnections.recallCalendarId, calendarId));
}

async function autoScheduleChangedEvents(
  calendarId: string,
  updatedAtGte?: string,
): Promise<void> {
  const [connection] = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.recallCalendarId, calendarId));

  if (!connection || !connection.autoRecord) return;

  const result = await listCalendarEvents(calendarId, { updatedAtGte });

  for (const event of result.results) {
    if (event.is_deleted || !event.meeting_url || event.bots?.length) {
      continue;
    }
    try {
      await scheduleBotForCalendarEvent(
        connection.userId,
        event.id,
        event.ical_uid,
      );
    } catch (err) {
      console.error(`Failed to auto-schedule event ${event.id}`, err);
    }
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyRecallWebhookSignature(request.headers, rawBody)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const parsed = JSON.parse(rawBody);
  const eventName = typeof parsed.event === "string" ? parsed.event : "";

  if (eventName.startsWith("bot.")) {
    const payload = RecallBotWebhookPayloadSchema.parse(parsed);
    const botId = payload.data.bot.id;

    if (payload.event === "bot.done") {
      after(() =>
        processCompletedBot(botId).catch((err) => {
          console.error(`Failed to process bot ${botId}`, err);
        }),
      );
    } else if (payload.event === "bot.fatal") {
      const subCode = payload.data.data?.sub_code ?? null;
      after(() =>
        markBotFatal(botId, subCode).catch((err) => {
          console.error(`Failed to mark bot ${botId} fatal`, err);
        }),
      );
    }
  } else if (eventName.startsWith("calendar.")) {
    const payload = RecallCalendarWebhookPayloadSchema.parse(parsed);

    if (payload.event === "calendar.update") {
      const calendarId = payload.data.calendar_id;
      after(() =>
        syncCalendarStatus(calendarId).catch((err) => {
          console.error(`Failed to sync calendar ${calendarId}`, err);
        }),
      );
    } else if (payload.event === "calendar.sync_events") {
      const calendarId = payload.data.calendar_id;
      const updatedAtGte = payload.data.last_updated_ts;
      after(() =>
        autoScheduleChangedEvents(calendarId, updatedAtGte).catch((err) => {
          console.error(`Failed to auto-schedule for calendar ${calendarId}`, err);
        }),
      );
    }
  } else if (eventName === "participant_events.chat_message") {
    const payload = RecallChatMessageWebhookPayloadSchema.parse(parsed);
    const botId = payload.data.bot.id;
    const { participant, data } = payload.data.data;
    after(() =>
      handleLiveChatMessage(botId, participant.name, data.text).catch(
        (err) => {
          console.error(`Failed to handle live chat message for bot ${botId}`, err);
        },
      ),
    );
  }

  return Response.json({ received: true });
}

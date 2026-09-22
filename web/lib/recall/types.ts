import { z } from "zod";

export type RecallPlatform = "zoom" | "google_meet" | "teams" | "webex";

export interface CreateBotParams {
  meetingUrl: string;
  botName?: string;
  /** ISO 8601. Omit for an immediate "join now" bot. */
  joinAt?: string;
  metadata?: Record<string, string>;
  /** Default true. Transcript is always captured regardless of these. */
  recordVideo?: boolean;
  /** Default true. Transcript is always captured regardless of these. */
  recordAudio?: boolean;
  /** Overrides the built recording config (including the video/audio flags above) entirely. */
  recordingConfig?: Record<string, unknown>;
}

export interface RecallBotStatusChange {
  code: string;
  sub_code: string | null;
  updated_at: string;
}

export interface RecallMediaShortcut {
  // `download_url` for media shortcuts (transcript, video/audio mixed);
  // `title` is specific to meeting_metadata — confirmed live, comes back
  // null for Google Meet, may be populated for Zoom.
  data?: { download_url?: string; title?: string | null };
  status?: { code?: string };
}

export interface RecallRecording {
  id: string;
  media_shortcuts?: {
    video_mixed?: RecallMediaShortcut;
    audio_mixed?: RecallMediaShortcut;
    transcript?: RecallMediaShortcut;
    participant_events?: RecallMediaShortcut;
    meeting_metadata?: RecallMediaShortcut;
  };
}

// Recall's full bot schema isn't fully resolvable from their public docs
// (interactive schema viewer, not a static page) — `recordings`/
// `media_shortcuts` are typed from documented examples but validated at
// runtime (see TranscriptEntrySchema below) rather than trusted blindly.
export interface RecallBot {
  id: string;
  // Confirmed live: on a retrieved bot this is a structured object, not
  // the plain URL string you pass in on create.
  meeting_url: {
    meeting_id: string;
    meeting_password: string | null;
    platform: RecallPlatform;
    [key: string]: unknown;
  };
  status_changes: RecallBotStatusChange[];
  metadata?: Record<string, unknown>;
  recordings?: RecallRecording[];
  [key: string]: unknown;
}

// Webhook payload for bot lifecycle events (e.g. `bot.done`, `bot.fatal`).
export const RecallBotWebhookPayloadSchema = z.object({
  event: z.string(),
  data: z.object({
    data: z
      .object({
        code: z.string().optional(),
        sub_code: z.string().nullable().optional(),
      })
      .optional(),
    bot: z.object({
      id: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }),
});
export type RecallBotWebhookPayload = z.infer<typeof RecallBotWebhookPayloadSchema>;

// Transcript download artifact — one entry per contiguous speaker turn.
const TranscriptTimestampSchema = z.object({
  // Confirmed live: `absolute` comes back null in practice — only
  // `relative` (seconds from recording start) is reliably populated.
  absolute: z.string().nullable(),
  relative: z.number(),
});

const TranscriptWordSchema = z.object({
  text: z.string(),
  start_timestamp: TranscriptTimestampSchema,
  end_timestamp: TranscriptTimestampSchema,
});

const TranscriptParticipantSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  is_host: z.boolean().nullable().optional(),
  platform: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export const TranscriptEntrySchema = z.object({
  participant: TranscriptParticipantSchema,
  language_code: z.string().optional(),
  words: z.array(TranscriptWordSchema),
});

export const TranscriptSchema = z.array(TranscriptEntrySchema);
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>;

export interface CreateCalendarParams {
  platform: "google_calendar" | "microsoft_outlook";
  oauthClientId: string;
  oauthClientSecret?: string;
  oauthRefreshToken: string;
  oauthEmail?: string;
}

export interface RecallCalendar {
  id: string;
  platform: string;
  status: string;
  [key: string]: unknown;
}

export interface RecallCalendarEventBot {
  bot_id: string;
  start_time: string;
  deduplication_key: string;
  meeting_url?: string;
}

// Confirmed live: scheduled bots come back as a `bots` array (recurring
// events can have more than one), never a top-level `bot_id` — an earlier
// version of this type assumed the latter, which silently misreported
// every successful schedule as a failure.
export interface RecallCalendarEvent {
  id: string;
  calendar_id: string;
  ical_uid: string;
  start_time: string;
  end_time: string;
  is_deleted: boolean;
  meeting_url?: string | null;
  bots?: RecallCalendarEventBot[];
  // Provider-native event payload — where the title actually lives
  // (Google: `summary`, Microsoft Graph: `subject`). Confirmed live for
  // Google; no top-level title field exists outside this.
  raw?: unknown;
  [key: string]: unknown;
}

export interface ListCalendarEventsQuery {
  startTimeGte?: string;
  updatedAtGte?: string;
  cursor?: string;
}

export interface ListCalendarEventsResult {
  results: RecallCalendarEvent[];
  next_cursor: string | null;
}

export interface ScheduleCalendarBotParams {
  /** Stable across all events representing the same recurring meeting. */
  deduplicationKey: string;
  // meetingUrl/joinAt are auto-derived from the calendar event unless
  // overridden here, so both are optional (unlike a direct createBot call).
  botConfig: Omit<CreateBotParams, "meetingUrl"> &
    Partial<Pick<CreateBotParams, "meetingUrl">> &
    Record<string, unknown>;
}

// Calendar V2 webhooks: `calendar.update` (status changed — re-fetch via
// Retrieve Calendar) and `calendar.sync_events` (events changed — call
// List Calendar Events with updated_at__gte).
export const RecallCalendarWebhookPayloadSchema = z.object({
  event: z.enum(["calendar.update", "calendar.sync_events"]),
  data: z.object({
    calendar_id: z.string(),
    last_updated_ts: z.string().optional(),
  }),
});
export type RecallCalendarWebhookPayload = z.infer<
  typeof RecallCalendarWebhookPayloadSchema
>;

// Real-time webhook fired when a participant sends a message in the
// meeting's chat panel (config: recording_config.realtime_endpoints).
// Confirmed live shape — note the doubly-nested `data.data.data`, same
// nesting style as RecallBotWebhookPayloadSchema above.
export const RecallChatMessageWebhookPayloadSchema = z.object({
  event: z.literal("participant_events.chat_message"),
  data: z.object({
    bot: z.object({ id: z.string() }),
    data: z.object({
      participant: z.object({
        id: z.number(),
        name: z.string().nullable(),
      }),
      data: z.object({
        text: z.string(),
      }),
    }),
  }),
});
export type RecallChatMessageWebhookPayload = z.infer<
  typeof RecallChatMessageWebhookPayloadSchema
>;

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Extracted follow-up from a completed meeting transcript. */
export type MeetingActionItem = {
  text: string;
  assignee: string | null;
  dueHint: string | null;
};

/** Notable moment with optional timestamp for media seek. */
export type MeetingHighlight = {
  text: string;
  speaker: string | null;
  startMs: number | null;
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  // Nullable — pre-auth (Phase 1) rows get linked to a Clerk account on
  // first sign-in rather than migrated up front.
  clerkUserId: text("clerk_user_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const calendarConnections = pgTable("calendar_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  provider: text("provider").notNull(), // 'google' | 'microsoft_outlook'
  // The connected account's email — lets a user connect multiple accounts
  // per provider (e.g. personal + work Gmail) as distinct rows, deduped
  // on (userId, provider, email) rather than just (userId, provider).
  email: text("email"),
  recallCalendarId: text("recall_calendar_id").notNull(),
  status: text("status").notNull(), // 'connected' | 'disconnected' | 'error'
  // When on, every meeting synced from this connection gets a bot
  // scheduled automatically (via the calendar.sync_events webhook), no
  // manual "Record" click needed.
  autoRecord: boolean("auto_record").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  recallBotId: text("recall_bot_id").notNull().unique(),
  title: text("title"),
  // One category per meeting (confirmed, not multi-tag). Deleting a
  // category uncategorizes its meetings rather than cascading/blocking.
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  platform: text("platform"), // 'zoom' | 'google_meet' | 'teams'
  meetingUrl: text("meeting_url").notNull(),
  calendarEventId: text("calendar_event_id"),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: text("status").notNull(), // mirrors Recall bot lifecycle status
  // 'notetaker' — record and answer afterwards. 'live' — also join the
  // conversation out loud via the Output Media agent page.
  mode: text("mode").notNull().default("notetaker"),
  recordingVideoUrl: text("recording_video_url"),
  recordingAudioUrl: text("recording_audio_url"),
  // Post-meeting intelligence — filled after transcript is ready.
  // Null until generated (or if generation failed); empty arrays mean
  // "looked and found nothing", not "not yet run".
  summary: text("summary"),
  actionItems: jsonb("action_items").$type<MeetingActionItem[]>(),
  highlights: jsonb("highlights").$type<MeetingHighlight[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id),
  name: text("name"),
  email: text("email"),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  leftAt: timestamp("left_at", { withTimezone: true }),
});

// Text/metadata only — the embedding for each row lives in Qdrant's
// `transcript_chunks` collection, keyed by this same `id`.
export const transcriptChunks = pgTable("transcript_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id),
  speaker: text("speaker"),
  startMs: integer("start_ms").notNull(),
  endMs: integer("end_ms").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Q&A turns from the live in-meeting "@Tandem" chat — each webhook delivery
// is a separate serverless invocation with no shared memory, so recent
// conversation context has to be persisted here rather than held in
// process. Read as a short, capped window (last 10), not paginated.
export const liveChatMessages = pgTable("live_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id),
  role: text("role").notNull(), // 'user' | 'assistant'
  // 'chat' — typed in the meeting chat panel. 'voice' — spoken by or to
  // the live agent. Both feed the same conversation history, so the gate
  // and the chat responder see one another's turns.
  channel: text("channel").notNull().default("chat"),
  participantName: text("participant_name"),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Credential for a machine that acts on a user's behalf — specifically the
// local MCP tool in tools/tandem, so the voice agent running on someone's
// laptop can search their meeting corpus. Clerk sessions are for browsers;
// a CLI has no cookie jar, so it carries one of these instead.
//
// Only the SHA-256 of the key is stored. A leaked database row therefore
// cannot be replayed against the API, and the plaintext is shown once at
// creation and never again.
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  // The leading characters of the key, for telling rows apart in a list
  // without storing anything that could be used to authenticate.
  keyPrefix: text("key_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Credential for the Output Media agent page. Recall loads that page with
// no Clerk session, so this opaque token is the only thing standing
// between the public internet and a meeting's RAG corpus. Short-lived,
// single-meeting, and it carries the Realtime second-budget so the page
// cannot extend its own session.
export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  secondsUsed: integer("seconds_used").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

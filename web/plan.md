# Meeting Bot — Plan

Recall.ai-powered meeting bot: joins meetings via pasted link or Google Calendar invite,
records audio/video, captures transcript + participant/meeting metadata, and answers
questions over transcripts (RAG). Single-user first, multi-user later.

Full architecture/reasoning lives in the approved plan at
`/Users/abhijeet/.claude/plans/starry-tickling-flask.md` — this file is the taskwise
tracker split by phase.

---

## Phase 1 — Join, Capture, Post-Meeting Q&A

Scope: single user, Google Calendar only for auto-detection, bot can join
Zoom/Meet/**Teams**, rely on Recall's hosted media (no self-storage of recordings).

1. **Scaffold Next.js app** — App Router + TypeScript, minimal Tailwind, git init.
2. **Provision Neon Postgres via Vercel Marketplace** — link Vercel project, install Neon
   integration, pull `DATABASE_URL`. Relational data only — no `pgvector`.
3. **Provision Qdrant (vector DB)** — Qdrant is not a native Vercel Marketplace integration,
   so this is a manual external service: create a Qdrant Cloud cluster, add `QDRANT_URL` /
   `QDRANT_API_KEY` to Vercel env. Create the `transcript_chunks` collection.
4. **Drizzle ORM + schema** — `users`, `calendar_connections`, `meetings`, `participants`,
   `transcript_chunks` (text/speaker/timestamps, **no vector column** — vectors live in
   Qdrant only, keyed by the same row id); run initial migration; seed one user row.
5. **Recall.ai client wrapper** (`lib/recall/client.ts`) — `createBot`, `retrieveBot`,
   `scheduleCalendarBot`, `listCalendarEvents`, against `RECALL_API_KEY` / `RECALL_API_REGION`.
6. **Webhook route + post-meeting pipeline** — `app/api/webhooks/recall/route.ts` +
   `lib/recall/process-meeting.ts`: on `bot.done`, retrieve bot data, normalize transcript,
   chunk, embed (AI SDK), insert chunk rows in Postgres, upsert matching points into Qdrant
   (payload includes `meeting_id`, `user_id`, `speaker`, timestamps, and the chunk `text`
   itself so RAG reads don't need a Postgres join). Must ack within 15s, process async.
7. **"Join now" flow end-to-end** — paste a meeting link → `createBot`. Fastest path to a
   real, testable loop since it skips calendar OAuth entirely. First real verification point.
8. **Google Calendar connection + event listing** — Recall Calendar V2 OAuth connect,
   list events, schedule-bot-for-event, handle calendar sync webhooks (create/update/delete).
9. **Meetings list + transcript viewer pages** — upcoming (from calendar) + past meetings;
   meeting detail page with transcript (from Postgres), participants, recording link.
10. **RAG chat (per-meeting + cross-meeting)** — `lib/ai/rag.ts` (`embedQuery`,
    `retrieveChunks` — Qdrant search with a `meeting_id` or `user_id` payload filter,
    `answerQuestion`); wire into meeting detail chat and a cross-meeting chat page with a
    scope toggle (this meeting / all meetings).

**Verification gates:**
- After (7): real link → bot joins → `bot.done` fires → Postgres + Qdrant both populated.
- After (8): test Google Calendar event with a Teams link → syncs → bot auto-joins at `join_at`.
- After (10): question against a completed meeting returns a grounded answer with citation;
  scope toggle works both ways.

---

## Phase 2 — Live In-Meeting Q&A + Multi-User

Each item builds on Phase 1 infra (same `bot_id`, same webhook route) rather
than replacing it. Status reflects what's actually shipped, not the original
order below.

1. **Real-time transcript ingestion** — not started. Subscribe to
   `transcript.data` / `transcript.partial_data` webhooks during an active
   call; stream partial transcript to a live dashboard view.
2. **In-meeting chat Q&A agent** — not started. Detect a directed question
   in the live transcript/chat, run RAG against transcript-so-far + past
   meetings, respond via Recall's `output_media.chat`. Needs a "is this
   message for the bot" heuristic to avoid answering unrelated chatter.
3. **Multi-user auth** — ✅ done. Clerk, resource-based auth (`auth.protect()`
   inside `getCurrentUserId()`, not middleware path-matching — Clerk
   deprecated `createRouteMatcher` mid-build). JIT-links a Clerk account to
   an existing pre-auth `users` row by email on first sign-in.
4. **Outlook/Microsoft Calendar support** — ✅ code done, ⏳ not configured.
   `app/api/calendar/outlook/{connect,callback}/route.ts` built and
   symmetric with Google's; `MICROSOFT_OAUTH_CLIENT_ID`/`SECRET` still need
   an Azure Portal app registration before it's live.
5. **Live meeting dashboard** — not started. Streaming UI (websocket/SSE)
   showing an in-progress meeting's transcript and any live Q&A exchanges.
6. **(Stretch, not scoped yet)** Spoken/voice agent responses — only if
   chat-based Q&A (item 2) proves insufficient.

**Also shipped, not in the original Phase 2 list:**
- **Multiple calendar accounts per provider** — `calendar_connections`
  dedupes on `(userId, provider, email)`; connect flow forces Google/
  Microsoft's account picker (`prompt=select_account`) so adding a second
  account doesn't silently re-auth the first.
- **Auto-record toggle** — per-provider (not per-account) switch on
  `/settings/calendar`; backfills currently-upcoming events immediately on
  enable, and auto-schedules future invites via the `calendar.sync_events`
  webhook once that webhook is actually registered with Recall (see
  Outstanding below).
- **Meeting titles** — pulled from the calendar event's native title
  (Google `summary` / Microsoft `subject`) at schedule time, or from
  Recall's `meeting_metadata` post-meeting for "join now" bots with no
  calendar event to draw from.

**Outstanding, blocking full automation:**
- Recall webhook URL still isn't registered in Recall's dashboard (needs a
  public URL — tunnel or real deployment). Until then: completed meetings
  need manual reprocessing, and auto-record only catches what exists at
  toggle-on time, not new invites arriving after.

---

## Phase 2.5 — Meeting Categories + Category-Scoped Chat

Full design in the approved plan at
`/Users/abhijeet/.claude/plans/resilient-sauteeing-sedgewick.md`. Chat
currently scopes to one meeting or literally all of them — this adds a
middle tier so a sequence of related meetings (e.g. recurring freelance
client calls) keeps its own context instead of mixing with unrelated ones.
One category per meeting (confirmed with user, not multi-tag).

1. **Schema** — `categories` table (`id`, `userId`, `name`, `createdAt`);
   nullable `meetings.categoryId` FK, `onDelete: "set null"`.
2. **Category CRUD** — `app/api/categories/route.ts` (GET list w/ counts,
   POST create), `app/api/categories/[id]/route.ts` (DELETE).
3. **Meeting → category assignment** — `app/api/meetings/[id]/route.ts`
   (PATCH `categoryId`); inline selector on the meeting detail page, no
   separate management page for v1.
4. **Category-scoped retrieval** — `lib/ai/rag.ts`'s `ChatScope` gains
   `categoryId`; resolves category → member meeting IDs from Postgres at
   query time, filters Qdrant with a `match.any` on `meeting_id` (not
   synced into vector payloads — categories get renamed/reassigned, and
   that sync path isn't worth the drift risk).
5. **Chat page redesign** — `/chat` becomes a picker (All meetings /
   Uncategorized / each category) driving the existing `ChatPanel`, which
   just grows a `categoryId` prop alongside `meetingId`.
6. **Visibility** — category badge on `MeetingList` rows.

**Verification gates:**
- Automatable: assign a category to a real meeting with existing
  transcript chunks, confirm `retrieveChunks` with that `categoryId`
  returns only that meeting's chunks.
- Needs user: create categories, assign real meetings, confirm the badge
  and the `/chat` picker both work end-to-end.

---

## Credentials Needed Before Live Wiring (Phase 1)

- `RECALL_API_KEY` + `RECALL_API_REGION` (e.g. `us-east-1`) — must match signup region.
- Google Cloud OAuth client (Client ID/Secret, Calendar API scope) for Calendar V2.
- Vercel Marketplace Neon Postgres (provisioned during step 2).
- Qdrant Cloud cluster URL + API key (provisioned during step 3 — manual, not Vercel-managed).
- AI Gateway model access (automatic on Vercel via OIDC; no separate key needed unless a
  specific provider key is preferred).

None of these block scaffolding — steps 1–4 can proceed with stubbed Recall calls.

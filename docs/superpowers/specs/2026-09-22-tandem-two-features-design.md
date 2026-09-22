# Tandem — one product, two features

**Date:** 2026-09-22
**Status:** approved design, not yet implemented

## Problem

Two working codebases existed side by side with no relationship:

- A Go MCP server that drives a headless Chrome into a Google Meet so the
  user's own Claude Code session participates by voice.
- A Next.js SaaS (formerly "Rika") that sends Recall.ai bots into
  Zoom/Meet/Teams, records, transcribes, and answers questions afterwards.

They solve halves of the same problem — an AI that is useful *during* a meeting
and *after* one — but shared nothing: no repo, no auth, no transcript store, no
brand.

## Goal

One product, **Tandem**, with two features over one corpus:

1. **Notetaker** (asynchronous) — record, transcribe, summarise, extract action
   items and highlights, answer questions afterwards via RAG chat.
2. **Live agent** (synchronous) — in the call, decide when to speak, answer out
   loud grounded in the transcript so far plus past meetings, and fall back to
   the meeting chat when speaking would interrupt.

Same bot, same meeting record, same retrieval layer. The live agent's answers
come from the notetaker's corpus; that coupling is the product.

## Decisions

### Runtime: Recall output-media, not self-hosted Chrome

Three options were weighed for where the live voice agent runs.

| | Local Go binary | Host the Go/Chrome stack | Recall output-media |
|---|---|---|---|
| Infrastructure | none | container per call, Xvfb, audio, scaling | none new |
| Platforms | Meet only | Meet only | Zoom, Meet, Teams |
| Answer grounding | user's local Claude (repo, files, git) | RAG only | RAG only |
| Onboarding | install a binary + Claude Code + an OpenAI key | web | web |
| Code to maintain | ~5k lines of Chrome driving | same, plus ops | delete ~1.3k lines |

**Chosen: Recall output-media.** Recall's Output Media feature has the bot load
a webpage the application controls and streams that page's audio and video into
the meeting, while exposing a websocket of real-time transcript data to the
page. Their documentation names the exact pattern intended here — pipe it to
OpenAI's Realtime API for speech-to-speech and play the response through the
page's audio element.

References:
- https://docs.recall.ai/docs/stream-media
- https://docs.recall.ai/docs/output-audio-in-meetings
- https://docs.recall.ai/docs/real-time-websocket-endpoints

Consequence: the live agent becomes a page in the Next.js app, not a Go
service. `meet.go`, `xvfb.go`, `pulse.go`, and `audiocapture.go` leave the
product path. The speak/stay-quiet gate and the avatar are ported to the
browser — `gate.js` and `hook.js` already exist as JavaScript.

The Go MCP server is **kept, unchanged**, as a standalone developer tool at
`tools/tandem/`. It is the only way to get the user's own Claude session, with
repo and filesystem access, into a call. It costs nothing to keep and is not
part of the hosted product.

### Repository: single repo, Go moved down a level

```
/                      github.com/Vatsa10/tandem
  web/                 the product (Next.js 16, React 19, TypeScript)
  tools/tandem/        the standalone Go MCP dev tool
  docs/                specs
```

The former `rika/` directory carried its own git remote belonging to a third
party who is not working on this project. Its history was dropped locally and
the files folded in as ordinary source; the upstream repository is untouched.

## Architecture

### Notetaker (exists, unchanged)

Paste a link or sync a calendar → `createBot` / `scheduleCalendarBot` →
`bot.done` webhook → `lib/recall/process-meeting.ts` normalises the transcript,
chunks it, embeds with Gemini, writes rows to Neon Postgres and points to
Qdrant → meeting intelligence and RAG chat read from there.

### Live agent

Already shipped: `lib/recall/live-chat.ts` handles the text half. It matches
`@Rika`-style addressing, answers through `answerQuestionText`, respects
per-platform chat character limits, and reads recent context back from
`live_chat_messages` because each webhook delivery is a separate serverless
invocation. Only the **voice** half is new.

Flow:

1. `POST /api/bots` accepts `mode: "notetaker" | "live"`. In live mode the bot
   is created with an `output_media` URL pointing at
   `https://<app>/agent/<token>`.
2. `app/agent/[token]/page.tsx` is the page Recall streams. Client-side it:
   - subscribes to `wss://meeting-data.bot.recall.ai/api/v1/transcript`
   - runs the **gate** — a port of `gate.js` / `gate.go` — which classifies each
     incoming utterance as *speak*, *stay quiet*, or *answer in chat*
   - on *speak*, opens an OpenAI Realtime session using an ephemeral key from
     `/api/agent/realtime-token` and plays the response through an `<audio>`
     element on the page
   - grounds the answer by calling `/api/agent/answer`, which runs the existing
     `lib/ai/rag.ts` retrieval scoped to this meeting and its category, and
     injects the result as Realtime context
   - renders the avatar to a canvas as the page's video output
3. On *answer in chat*, it reuses the existing `sendChatMessage` path.

### Security

`/agent/*` must be exempt from Clerk. Recall loads it unauthenticated, so the
opaque per-bot token is the only credential. The token maps to a user and a
meeting, is single-purpose, and expires. It must not be guessable and must not
appear in any client-visible surface other than the bot configuration.

### Data model

- `meetings.mode` — `notetaker` | `live`
- new table `agent_sessions(token, meeting_id, user_id, expires_at)`
- `live_chat_messages.channel` — `chat` | `voice`, so spoken turns land in the
  same history the gate and the chat responder already read

### Cost control

OpenAI Realtime bills per minute of audio. A per-meeting minute cap is enforced
server-side in `/api/agent/realtime-token`; the page cannot extend its own
session past it.

## Testing

The gate is the only substantial piece of pure logic — utterance in, decision
out — and gets unit tests covering: direct address, follow-up to the bot's own
last turn, unrelated crosstalk, and the "conversation moved on, answer in chat"
transition. The rest is integration-shaped and is verified by a real call:
bot joins → transcript arrives → a directed question produces spoken audio →
the turn appears in `live_chat_messages` with `channel = 'voice'`.

## Risks

- **Recall Output Media may be plan-gated.** Verify on the account before
  building against it. If unavailable, the fallback is the existing text-chat
  agent alone.
- **Realtime cost per minute.** Mitigated by the server-side cap above.
- **Gate quality is the product.** A bot that talks over people is worse than no
  bot. The gate defaults to silence when uncertain.

## Explicitly out of scope

Hosting the Go/Chrome stack; a server-side Go voice path; migrating the dropped
git history; renaming beyond what the Tandem name requires (`BOT_DISPLAY_NAME`,
the chat trigger pattern, and landing copy).

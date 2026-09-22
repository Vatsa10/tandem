# Tandem — One Product, Two Features: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one product, Tandem, with a notetaker feature and a live in-meeting voice agent that share one meeting record and one retrieval corpus.

**Architecture:** The monorepo holds the Next.js product in `web/` and the standalone Go MCP dev tool in `tools/tandem/`. The live voice agent is a public, token-authenticated Next.js page that Recall.ai loads and streams into the meeting; that page reads Recall's realtime transcript websocket, runs a speak/hand/silent gate, grounds answers through the existing RAG layer, and speaks through OpenAI Realtime.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Drizzle + Neon Postgres, Qdrant, Clerk, Recall.ai (bots + Output Media), OpenAI Realtime, Vercel AI SDK, Go 1.26 (dev tool only).

**Spec:** `docs/superpowers/specs/2026-09-22-tandem-two-features-design.md`

## Global Constraints

- Product name is **Tandem**. The bot's meeting display name, the chat trigger, and all user-facing copy say Tandem, never Rika.
- `BOT_DISPLAY_NAME` must exactly match the `botName` passed to `createBot`/`scheduleCalendarBot`, or the self-message guard in `lib/recall/live-chat.ts` breaks and the bot answers itself in a loop.
- `/agent/*` and `/api/agent/*` are loaded by Recall **unauthenticated**. They must never call `getCurrentUserId()`. The opaque session token is their only credential.
- The gate defaults to silence when uncertain. A bot that talks over people is worse than no bot.
- OpenAI Realtime bills per minute. The per-meeting cap is enforced server-side in `/api/agent/realtime-token`; the page cannot extend its own session.
- Tests run with Node's built-in runner and `tsx`. No new test dependency: `node --import tsx --test <file>`.
- `tools/tandem/` is not modified by this plan beyond its path. It stays a working Go MCP server.
- Read `node_modules/next/dist/docs/` before writing Next.js code — this Next version has breaking changes vs. training data (see `web/AGENTS.md`).

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `web/lib/agent/gate.ts` | Pure speak/hand/silent heuristic. No I/O. |
| `web/lib/agent/gate.test.ts` | Unit tests for the gate. |
| `web/lib/agent/sessions.ts` | Mint/verify/expire agent session tokens. |
| `web/lib/agent/sessions.test.ts` | Token shape + expiry tests. |
| `web/lib/agent/minutes.ts` | Per-meeting Realtime second accounting + cap. |
| `web/lib/agent/minutes.test.ts` | Cap arithmetic tests. |
| `web/app/agent/[token]/page.tsx` | Public page Recall streams. Server shell only. |
| `web/app/agent/[token]/agent-client.tsx` | Client: transcript ws, gate, Realtime, audio. |
| `web/app/agent/[token]/avatar.tsx` | Canvas avatar reflecting agent state. |
| `web/app/api/agent/realtime-token/route.ts` | Ephemeral OpenAI key, cap-enforced. |
| `web/app/api/agent/answer/route.ts` | Token-scoped RAG answer for the page. |
| `web/lib/db/schema.ts` | `meetings.mode`, `liveChatMessages.channel`, `agentSessions`. |
| `web/lib/recall/client.ts` | `output_media` on bot creation. |
| `web/app/api/bots/route.ts` | `mode` parameter. |

---

### Task 1: Land the monorepo move

The working tree already holds the restructure: Go moved to `tools/tandem/`, the former `rika/` is now `web/` with its git history dropped, CI paths repointed, root `.gitignore` rewritten, a product `README.md` written, and the spec added. This task commits it in reviewable pieces.

**Files:**
- Modify: `.github/workflows/publish.yml`, `.github/workflows/release.yml`, `.gitignore`
- Create: `README.md`, `docs/superpowers/specs/2026-09-22-tandem-two-features-design.md`, `docs/superpowers/plans/2026-09-22-tandem-two-features.md`
- Move: all root `*.go`, `go.mod`, `go.sum`, `Dockerfile`, `docker-entrypoint.sh`, `build.sh`, `.dockerignore`, `gate.js`, `hook.js`, `eval.js`, `app/`, `orpheus-3b`, `README.md`, `.env.example` → `tools/tandem/`
- Move: `rika/` → `web/`

**Interfaces:**
- Consumes: nothing.
- Produces: the `web/` and `tools/tandem/` paths every later task refers to.

- [ ] **Step 1: Verify the Go engine still builds from its new home**

```bash
cd tools/tandem && go build -o /dev/null . && echo BUILD_OK
```
Expected: `BUILD_OK`

- [ ] **Step 2: Commit the Go relocation**

```bash
git add -A tools/tandem
git commit -m "refactor: move the Go MCP engine to tools/tandem"
```

- [ ] **Step 3: Commit the CI path updates**

```bash
git add .github/workflows/publish.yml .github/workflows/release.yml
git commit -m "ci: point image and release builds at tools/tandem"
```

- [ ] **Step 4: Commit the root gitignore rewrite**

The old root ignore file listed `package-lock.json`, which would have silently excluded `web/package-lock.json`. Confirm it no longer matches:

```bash
git check-ignore -v web/package-lock.json || echo "lockfile is tracked"
git add .gitignore
git commit -m "chore: rewrite root gitignore for the monorepo layout"
```
Expected: `lockfile is tracked`

- [ ] **Step 5: Commit the web app**

```bash
git add -A web
git commit -m "feat: bring the web product into the monorepo as web/"
```

- [ ] **Step 6: Commit the product README**

```bash
git add README.md
git commit -m "docs: add a product README covering both features"
```

- [ ] **Step 7: Commit the spec and this plan**

```bash
git add docs/superpowers
git commit -m "docs: add the two-feature design spec and implementation plan"
```

---

### Task 2: Rename Rika to Tandem

**Files:**
- Modify: `web/lib/recall/live-chat.ts` (`BOT_DISPLAY_NAME`, `TRIGGER_PATTERN`, comments)
- Modify: `web/app/api/bots/route.ts` (the 409 error message)
- Modify: `web/package.json` (`name`)
- Modify: `web/README.md`, `web/plan.md`
- Modify: every landing/legal component carrying the old name
- Test: `web/lib/agent/trigger.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `BOT_DISPLAY_NAME === "TANDEM"`, and `extractQuestion` exported from `lib/recall/live-chat.ts` for testing.

- [ ] **Step 1: Find every occurrence**

```bash
cd web && grep -rniI "rika" --exclude-dir=node_modules --exclude-dir=.next . | wc -l
```
Expected: a non-zero count. Keep the full listing as the checklist for step 7.

- [ ] **Step 2: Write the failing trigger test**

`extractQuestion` is currently module-private. Export it from `web/lib/recall/live-chat.ts` (change `function extractQuestion` to `export function extractQuestion`), then create `web/lib/agent/trigger.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { BOT_DISPLAY_NAME, extractQuestion } from "../recall/live-chat.ts";

test("the bot answers to its own name", () => {
  assert.equal(BOT_DISPLAY_NAME, "TANDEM");
});

test("plain address", () => {
  assert.equal(extractQuestion("Tandem what did we agree on?"), "what did we agree on?");
});

test("at-prefixed address with a comma", () => {
  assert.equal(extractQuestion("@Tandem, what did we agree on?"), "what did we agree on?");
});

test("a message for someone else is ignored", () => {
  assert.equal(extractQuestion("Bob, can you review my PR?"), null);
});

test("the old name no longer triggers", () => {
  assert.equal(extractQuestion("Rika, what did we agree on?"), null);
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
cd web && node --import tsx --test lib/agent/trigger.test.ts
```
Expected: FAIL — `BOT_DISPLAY_NAME` is still `"RIKA"` and the old name still triggers.

- [ ] **Step 4: Rename in `live-chat.ts`**

```typescript
export const BOT_DISPLAY_NAME = "TANDEM";

// Directed at Tandem if the message starts with its name, optionally
// preceded by "@" and followed by punctuation/whitespace before the
// actual question — e.g. "@Tandem, what did we agree on pricing?".
const TRIGGER_PATTERN = /^@?tandem[,:\s]+(.+)/i;
```

- [ ] **Step 5: Run the test again**

```bash
cd web && node --import tsx --test lib/agent/trigger.test.ts
```
Expected: PASS, 5/5.

- [ ] **Step 6: Commit the trigger rename**

```bash
git add web/lib/recall/live-chat.ts web/lib/agent/trigger.test.ts
git commit -m "feat: rename the meeting bot from Rika to Tandem"
```

- [ ] **Step 7: Rename in user-facing copy**

Work through the listing from step 1. Replace every remaining occurrence in `web/app/api/bots/route.ts` (`"Tandem is already in this meeting."`), `web/package.json` (`"name": "tandem-web"`), the landing components, the legal pages, `web/README.md`, and `web/plan.md`. Leave `tools/tandem/` untouched.

- [ ] **Step 8: Verify nothing is left and the app still type-checks**

```bash
cd web && grep -rniI "rika" --exclude-dir=node_modules --exclude-dir=.next . ; npx tsc --noEmit
```
Expected: no grep output, and a clean `tsc`.

- [ ] **Step 9: Commit the copy rename**

```bash
git add -A web
git commit -m "feat: rename Rika to Tandem across the product copy"
```

---

### Task 3: Schema — meeting mode, message channel, agent sessions

**Files:**
- Modify: `web/lib/db/schema.ts`
- Create: `web/lib/db/migrations/0007_*.sql` (generated)

**Interfaces:**
- Consumes: the existing `meetings` and `liveChatMessages` tables.
- Produces:
  - `meetings.mode: text` — `'notetaker' | 'live'`, not null, default `'notetaker'`
  - `liveChatMessages.channel: text` — `'chat' | 'voice'`, not null, default `'chat'`
  - `agentSessions` table with columns `id: uuid`, `token: text` (unique), `meetingId: uuid`, `userId: uuid`, `secondsUsed: integer` (default 0), `expiresAt: timestamp`, `createdAt: timestamp`

- [ ] **Step 1: Add the columns and the table**

In `web/lib/db/schema.ts`, add to `meetings`:

```typescript
  // 'notetaker' — record and answer afterwards. 'live' — also join the
  // conversation out loud via the Output Media agent page.
  mode: text("mode").notNull().default("notetaker"),
```

Add to `liveChatMessages`:

```typescript
  // 'chat' — typed in the meeting chat panel. 'voice' — spoken by or to
  // the live agent. Both feed the same conversation history, so the gate
  // and the chat responder see one another's turns.
  channel: text("channel").notNull().default("chat"),
```

Add a new table after `liveChatMessages`:

```typescript
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
```

- [ ] **Step 2: Generate the migration**

```bash
cd web && npm run db:generate
```
Expected: a new `lib/db/migrations/0007_*.sql` adding two columns and one table.

- [ ] **Step 3: Read the generated SQL before trusting it**

```bash
cd web && cat lib/db/migrations/0007_*.sql
```
Expected: `ALTER TABLE "meetings" ADD COLUMN "mode"`, `ALTER TABLE "live_chat_messages" ADD COLUMN "channel"`, `CREATE TABLE "agent_sessions"`. No `DROP` statements — if any appear, stop and investigate before applying.

- [ ] **Step 4: Apply it**

```bash
cd web && npm run db:migrate
```
Expected: migration applied, no error.

- [ ] **Step 5: Commit**

```bash
git add web/lib/db/schema.ts web/lib/db/migrations
git commit -m "feat: add meeting mode, message channel, and agent sessions"
```

---

### Task 4: Port the gate to TypeScript

The gate is the product. It decides, for each utterance, whether Tandem speaks, raises a hand, or stays quiet. `tools/tandem/gate.js` is the reference; this is a port, not a redesign, with one deliberate change: an unrecognised situation returns `silent`, not `maybe`, because the caller in this codebase has no LLM fallback wired on the first pass.

**Files:**
- Create: `web/lib/agent/gate.ts`
- Test: `web/lib/agent/gate.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```typescript
  export type GateDecision = "speak" | "hand" | "silent";
  export interface GateTurn { speaker: string; text: string }
  export interface GateResult { decision: GateDecision; reason: string }
  export const BOT_NAME: string;
  export const BOT_ALIASES: string[];
  export function ruleGate(text: string, transcript: GateTurn[], botName?: string, aliases?: string[]): GateResult;
  ```

- [ ] **Step 1: Write the failing tests**

Create `web/lib/agent/gate.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { ruleGate, type GateTurn } from "./gate.ts";

const empty: GateTurn[] = [];

test("direct address speaks", () => {
  assert.equal(ruleGate("Tandem, what time is standup?", empty).decision, "speak");
});

test("an alias speaks", () => {
  assert.equal(ruleGate("hey ai, summarise that", empty).decision, "speak");
});

test("a passing mention does not speak", () => {
  assert.equal(ruleGate("we were testing tandem yesterday", empty).decision, "silent");
});

test("an immediate follow-up to the bot speaks", () => {
  const transcript: GateTurn[] = [
    { speaker: "Alice", text: "what's the deploy schedule?" },
    { speaker: "TANDEM", text: "Thursdays at 4." },
  ];
  assert.equal(ruleGate("and who owns it?", transcript).decision, "speak");
});

test("an open question raises a hand", () => {
  assert.equal(ruleGate("does anyone know the deploy schedule?", empty).decision, "hand");
});

test("one turn after the bot spoke raises a hand", () => {
  const transcript: GateTurn[] = [
    { speaker: "TANDEM", text: "Thursdays at 4." },
    { speaker: "Bob", text: "got it" },
  ];
  assert.equal(ruleGate("makes sense", transcript).decision, "hand");
});

test("humans talking to each other stays silent", () => {
  assert.equal(ruleGate("Bob, can you review my PR?", empty).decision, "silent");
});

test("small talk stays silent", () => {
  assert.equal(ruleGate("yeah I saw that too", empty).decision, "silent");
});

test("an unrecognised situation never speaks", () => {
  assert.notEqual(ruleGate("mm hmm", empty).decision, "speak");
});
```

- [ ] **Step 2: Run them and watch them fail**

```bash
cd web && node --import tsx --test lib/agent/gate.test.ts
```
Expected: FAIL — `Cannot find module './gate.ts'`.

- [ ] **Step 3: Write the gate**

Create `web/lib/agent/gate.ts`:

```typescript
// Social reasoning gate, ported from tools/tandem/gate.js.
//
// Three outcomes:
//   speak  — directly addressed, or a clear follow-up is expected
//   hand   — has something useful but was not asked; signal, don't barge in
//   silent — humans are talking to each other; stay out
//
// The default is silence. A bot that talks over people is worse than no
// bot, so anything this doesn't recognise falls through to `silent`
// rather than guessing.

export type GateDecision = "speak" | "hand" | "silent";

export interface GateTurn {
  speaker: string;
  text: string;
}

export interface GateResult {
  decision: GateDecision;
  reason: string;
}

export const BOT_NAME = "TANDEM";

export const BOT_ALIASES = ["tandem", "hey ai", "the ai", "the agent"];

// Mentions that talk *about* the bot rather than *to* it.
function isPassingMention(lower: string, name: string): boolean {
  return [
    `testing ${name}`,
    `tried ${name}`,
    `using ${name}`,
    `${name} yesterday`,
    `${name} crashed`,
    `${name} broke`,
    `about ${name}`,
  ].some((phrase) => lower.includes(phrase));
}

function isAddressed(lower: string, name: string): boolean {
  return (
    lower.startsWith(name) ||
    lower.includes(`${name},`) ||
    lower.includes(`${name} `) ||
    lower.endsWith(name) ||
    lower.endsWith(`${name}.`) ||
    lower.endsWith(`${name}?`) ||
    lower.endsWith(`${name}!`)
  );
}

// Turns since the bot last spoke: 0 means it spoke most recently, -1
// means it has not spoken in this window.
function turnsSinceBotSpoke(transcript: GateTurn[], botName: string): number {
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (transcript[i].speaker.toLowerCase() === botName.toLowerCase()) {
      return transcript.length - 1 - i;
    }
  }
  return -1;
}

export function ruleGate(
  text: string,
  transcript: GateTurn[],
  botName: string = BOT_NAME,
  aliases: string[] = BOT_ALIASES,
): GateResult {
  const lower = text.toLowerCase();

  for (const alias of aliases) {
    const name = alias.toLowerCase();
    if (!isAddressed(lower, name)) continue;
    if (isPassingMention(lower, name)) {
      return { decision: "silent", reason: "passing mention" };
    }
    return { decision: "speak", reason: "name invoked" };
  }

  const since = turnsSinceBotSpoke(transcript, botName);
  if (since === 0) return { decision: "speak", reason: "follow-up to the bot" };

  if (text.trim().endsWith("?")) {
    return { decision: "hand", reason: "open question" };
  }

  if (since === 1) {
    return { decision: "hand", reason: "possible follow-up" };
  }

  return { decision: "silent", reason: "humans talking" };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd web && node --import tsx --test lib/agent/gate.test.ts
```
Expected: PASS, 9/9.

- [ ] **Step 5: Commit**

```bash
git add web/lib/agent/gate.ts web/lib/agent/gate.test.ts
git commit -m "feat: port the speak/hand/silent gate to TypeScript"
```

---

### Task 5: Agent session tokens

**Files:**
- Create: `web/lib/agent/sessions.ts`
- Test: `web/lib/agent/sessions.test.ts`

**Interfaces:**
- Consumes: `agentSessions` from Task 3; `db` from `@/lib/db/client`.
- Produces:
  ```typescript
  export const AGENT_SESSION_TTL_MS: number;   // 4 hours
  export function mintToken(): string;          // 43-char base64url, 32 bytes of entropy
  export interface AgentSession { id: string; meetingId: string; userId: string; secondsUsed: number }
  export function createAgentSession(meetingId: string, userId: string): Promise<string>;
  export function resolveAgentSession(token: string): Promise<AgentSession | null>;
  ```

- [ ] **Step 1: Write the failing test**

`mintToken` is pure, so it is tested directly; `resolveAgentSession` hits the database and is covered by the Task 15 real-call check instead.

Create `web/lib/agent/sessions.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENT_SESSION_TTL_MS, mintToken } from "./sessions.ts";

test("tokens carry 32 bytes of entropy, url-safe", () => {
  const token = mintToken();
  assert.equal(token.length, 43);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test("tokens do not repeat", () => {
  const tokens = new Set(Array.from({ length: 1000 }, mintToken));
  assert.equal(tokens.size, 1000);
});

test("sessions expire within the working day", () => {
  assert.ok(AGENT_SESSION_TTL_MS > 0);
  assert.ok(AGENT_SESSION_TTL_MS <= 8 * 60 * 60 * 1000);
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd web && node --import tsx --test lib/agent/sessions.test.ts
```
Expected: FAIL — `Cannot find module './sessions.ts'`.

- [ ] **Step 3: Write the module**

Create `web/lib/agent/sessions.ts`:

```typescript
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentSessions } from "@/lib/db/schema";

// Long enough to outlive any meeting, short enough that a leaked URL in a
// calendar invite or a screen share stops working the same day.
export const AGENT_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

export interface AgentSession {
  id: string;
  meetingId: string;
  userId: string;
  secondsUsed: number;
}

// 32 bytes, base64url, no padding — 43 characters. This is the only
// credential on the agent page, so it is generated from a CSPRNG, never
// derived from the meeting id or anything else a third party could guess.
export function mintToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createAgentSession(
  meetingId: string,
  userId: string,
): Promise<string> {
  const token = mintToken();
  await db.insert(agentSessions).values({
    token,
    meetingId,
    userId,
    expiresAt: new Date(Date.now() + AGENT_SESSION_TTL_MS),
  });
  return token;
}

// Returns null for an unknown or expired token. The expiry is part of the
// query rather than a post-check, so an expired row can never be used.
export async function resolveAgentSession(
  token: string,
): Promise<AgentSession | null> {
  const [row] = await db
    .select({
      id: agentSessions.id,
      meetingId: agentSessions.meetingId,
      userId: agentSessions.userId,
      secondsUsed: agentSessions.secondsUsed,
    })
    .from(agentSessions)
    .where(
      and(eq(agentSessions.token, token), gt(agentSessions.expiresAt, new Date())),
    );

  return row ?? null;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd web && node --import tsx --test lib/agent/sessions.test.ts
```
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add web/lib/agent/sessions.ts web/lib/agent/sessions.test.ts
git commit -m "feat: add opaque session tokens for the agent page"
```

---

### Task 6: Realtime minute cap

**Files:**
- Create: `web/lib/agent/minutes.ts`
- Test: `web/lib/agent/minutes.test.ts`

**Interfaces:**
- Consumes: `agentSessions` from Task 3.
- Produces:
  ```typescript
  export const MAX_AGENT_SECONDS_PER_MEETING: number; // 1800
  export const GRANT_SECONDS: number;                  // 300
  export function remainingSeconds(secondsUsed: number): number;
  export function nextGrant(secondsUsed: number): number;
  export function chargeSeconds(sessionId: string, seconds: number): Promise<void>;
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/agent/minutes.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GRANT_SECONDS,
  MAX_AGENT_SECONDS_PER_MEETING,
  nextGrant,
  remainingSeconds,
} from "./minutes.ts";

test("a fresh meeting has the full budget", () => {
  assert.equal(remainingSeconds(0), MAX_AGENT_SECONDS_PER_MEETING);
});

test("usage draws the budget down", () => {
  assert.equal(remainingSeconds(600), MAX_AGENT_SECONDS_PER_MEETING - 600);
});

test("an overspent budget floors at zero, never negative", () => {
  assert.equal(remainingSeconds(MAX_AGENT_SECONDS_PER_MEETING + 90), 0);
});

test("a grant is capped by the remaining budget", () => {
  assert.equal(nextGrant(0), GRANT_SECONDS);
  assert.equal(nextGrant(MAX_AGENT_SECONDS_PER_MEETING - 60), 60);
  assert.equal(nextGrant(MAX_AGENT_SECONDS_PER_MEETING), 0);
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd web && node --import tsx --test lib/agent/minutes.test.ts
```
Expected: FAIL — `Cannot find module './minutes.ts'`.

- [ ] **Step 3: Write the module**

Create `web/lib/agent/minutes.ts`:

```typescript
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { agentSessions } from "@/lib/db/schema";

// OpenAI Realtime bills per minute of audio, so an agent left running in
// an abandoned meeting is an open tap. 30 minutes of speech per meeting is
// well past a useful session and bounds the worst case.
export const MAX_AGENT_SECONDS_PER_MEETING = 30 * 60;

// The page gets the budget in slices rather than all at once, so a page
// that stops checking in stops costing money.
export const GRANT_SECONDS = 5 * 60;

export function remainingSeconds(secondsUsed: number): number {
  return Math.max(0, MAX_AGENT_SECONDS_PER_MEETING - secondsUsed);
}

export function nextGrant(secondsUsed: number): number {
  return Math.min(GRANT_SECONDS, remainingSeconds(secondsUsed));
}

// Incremented in SQL rather than read-modify-write: two concurrent grants
// for the same session must not lose a charge.
export async function chargeSeconds(
  sessionId: string,
  seconds: number,
): Promise<void> {
  await db
    .update(agentSessions)
    .set({ secondsUsed: sql`${agentSessions.secondsUsed} + ${seconds}` })
    .where(eq(agentSessions.id, sessionId));
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd web && node --import tsx --test lib/agent/minutes.test.ts
```
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add web/lib/agent/minutes.ts web/lib/agent/minutes.test.ts
git commit -m "feat: cap Realtime spend per meeting server-side"
```

---

### Task 7: Bot creation in live mode

**Files:**
- Modify: `web/lib/recall/types.ts` (add `outputMediaUrl` to `CreateBotParams`)
- Modify: `web/lib/recall/client.ts` (`createBot` body → `output_media`)
- Modify: `web/app/api/bots/route.ts` (accept `mode`)
- Modify: `web/lib/env.ts` (add `OPENAI_API_KEY`)

**Interfaces:**
- Consumes: `createAgentSession` (Task 5), `meetings.mode` (Task 3).
- Produces: `POST /api/bots` accepts `{ meetingUrl, mode?, recordVideo?, recordAudio? }` and returns `{ meeting }` with `meeting.mode` set.

- [ ] **Step 1: Add the env var**

In `web/lib/env.ts`, add alongside the other getters:

```typescript
  // Realtime speech-to-speech for the live agent page. Only read on the
  // /api/agent/* paths — the notetaker feature never touches it.
  get OPENAI_API_KEY() {
    return required("OPENAI_API_KEY");
  },
```

- [ ] **Step 2: Add the parameter to the Recall types**

In `web/lib/recall/types.ts`, inside `CreateBotParams`:

```typescript
  /** Absolute URL of the Output Media page Recall streams into the call.
      Set only for live-mode bots; omitted for notetaker bots. */
  outputMediaUrl?: string;
```

- [ ] **Step 3: Send `output_media` on bot creation**

In `web/lib/recall/client.ts`, inside `createBot`, add the field to the request body as a sibling of `recording_config`:

```typescript
    // Recall loads this page in its own browser and streams the page's
    // audio and video into the meeting — that page is the live agent.
    ...(params.outputMediaUrl
      ? {
          output_media: {
            camera: {
              kind: "webpage",
              config: { url: params.outputMediaUrl },
            },
          },
        }
      : {}),
```

- [ ] **Step 4: Accept `mode` in the route**

In `web/app/api/bots/route.ts`, destructure `mode` from the body and validate it before the `createBot` call:

```typescript
  const { meetingUrl, mode = "notetaker", recordVideo, recordAudio } = await request.json();

  if (mode !== "notetaker" && mode !== "live") {
    return Response.json(
      { error: "mode must be 'notetaker' or 'live'" },
      { status: 400 },
    );
  }
```

The agent page URL needs the meeting row's id, and the bot needs that URL — a chicken-and-egg. Resolve it by inserting the meeting first with a placeholder bot id, minting the session, creating the bot, then patching the real bot id in. Add this branch ahead of the existing notetaker path:

```typescript
  if (mode === "live") {
    const [meeting] = await db
      .insert(meetings)
      .values({
        userId,
        // Replaced below once Recall returns the real id. The column is
        // NOT NULL and unique, so it needs a unique placeholder, not "".
        recallBotId: `pending:${crypto.randomUUID()}`,
        platform: detectPlatform(meetingUrl),
        meetingUrl,
        status: "joining",
        mode,
      })
      .returning();

    const token = await createAgentSession(meeting.id, userId);

    const bot = await createBot({
      meetingUrl,
      botName: BOT_DISPLAY_NAME,
      recordVideo,
      recordAudio,
      outputMediaUrl: `${env.APP_BASE_URL}/agent/${token}`,
    });

    const [updated] = await db
      .update(meetings)
      .set({
        recallBotId: bot.id,
        status: bot.status_changes.at(-1)?.code ?? "joining",
      })
      .where(eq(meetings.id, meeting.id))
      .returning();

    return Response.json({ meeting: updated }, { status: 201 });
  }
```

Leave the existing notetaker path below it unchanged apart from adding `mode` to its insert values. Add the imports it now needs: `eq` from `drizzle-orm`, `env` from `@/lib/env`, and `createAgentSession` from `@/lib/agent/sessions`.

- [ ] **Step 5: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add web/lib/env.ts web/lib/recall/types.ts web/lib/recall/client.ts web/app/api/bots/route.ts
git commit -m "feat: dispatch live-mode bots with an Output Media agent page"
```

---

### Task 8: Ephemeral Realtime token endpoint

**Files:**
- Create: `web/app/api/agent/realtime-token/route.ts`

**Interfaces:**
- Consumes: `resolveAgentSession` (Task 5); `nextGrant`, `chargeSeconds` (Task 6); `env.OPENAI_API_KEY` (Task 7).
- Produces: `POST /api/agent/realtime-token` with body `{ token: string }` → `{ clientSecret: string, expiresInSeconds: number }`, or 402 when the budget is spent.

- [ ] **Step 1: Write the route**

Create `web/app/api/agent/realtime-token/route.ts`:

```typescript
import { chargeSeconds, nextGrant } from "@/lib/agent/minutes";
import { resolveAgentSession } from "@/lib/agent/sessions";
import { env } from "@/lib/env";

// Recall loads the agent page with no Clerk session, so this route is
// deliberately unauthenticated in the Clerk sense — the opaque session
// token is the credential. It must never call getCurrentUserId().
//
// The real OpenAI key never reaches the browser. This mints a short-lived
// client secret instead, and only while the meeting still has budget,
// which is what makes the cap unbypassable from the page.
export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token || typeof token !== "string") {
    return Response.json({ error: "token is required" }, { status: 400 });
  }

  const session = await resolveAgentSession(token);
  if (!session) {
    return Response.json({ error: "unknown or expired session" }, { status: 404 });
  }

  const grant = nextGrant(session.secondsUsed);
  if (grant <= 0) {
    return Response.json(
      { error: "this meeting has used its live agent budget" },
      { status: 402 },
    );
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: grant },
      session: { type: "realtime", model: "gpt-realtime" },
    }),
  });

  if (!response.ok) {
    console.error("realtime client secret failed", response.status, await response.text());
    return Response.json({ error: "could not start a voice session" }, { status: 502 });
  }

  const body = await response.json();

  // Charged on grant, not on use. Erring toward over-charging keeps the
  // cap honest when a page disappears without reporting back.
  await chargeSeconds(session.id, grant);

  return Response.json({ clientSecret: body.value, expiresInSeconds: grant });
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Verify it rejects an unknown token**

```bash
cd web && npm run dev &
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/agent/realtime-token \
  -H 'content-type: application/json' -d '{"token":"nope"}'
```
Expected: `404`. Stop the dev server afterwards.

- [ ] **Step 4: Commit**

```bash
git add web/app/api/agent/realtime-token/route.ts
git commit -m "feat: mint capped, ephemeral Realtime credentials for the agent"
```

---

### Task 9: Grounded answer endpoint

**Files:**
- Create: `web/app/api/agent/answer/route.ts`

**Interfaces:**
- Consumes: `resolveAgentSession` (Task 5); `answerQuestionText` from `@/lib/ai/rag`; `meetings`, `liveChatMessages` from schema.
- Produces: `POST /api/agent/answer` with body `{ token, question, speaker? }` → `{ answer: string }`.

- [ ] **Step 1: Write the route**

Create `web/app/api/agent/answer/route.ts`:

```typescript
import { desc, eq } from "drizzle-orm";
import { resolveAgentSession } from "@/lib/agent/sessions";
import { answerQuestionText } from "@/lib/ai/rag";
import { db } from "@/lib/db/client";
import { liveChatMessages, meetings } from "@/lib/db/schema";
import { BOT_DISPLAY_NAME } from "@/lib/recall/live-chat";

const HISTORY_LIMIT = 10;

// Spoken and typed turns share one history, so the voice agent knows what
// was already answered in the chat panel and vice versa.
async function recentHistory(meetingId: string): Promise<string | null> {
  const rows = await db
    .select({
      role: liveChatMessages.role,
      participantName: liveChatMessages.participantName,
      text: liveChatMessages.text,
    })
    .from(liveChatMessages)
    .where(eq(liveChatMessages.meetingId, meetingId))
    .orderBy(desc(liveChatMessages.createdAt))
    .limit(HISTORY_LIMIT);

  if (rows.length === 0) return null;

  return rows
    .reverse()
    .map((r) =>
      r.role === "assistant"
        ? `${BOT_DISPLAY_NAME}: ${r.text}`
        : `${r.participantName ?? "Someone"}: ${r.text}`,
    )
    .join("\n");
}

// Unauthenticated in the Clerk sense on purpose — see the note in
// /api/agent/realtime-token. The token scopes retrieval to exactly one
// user's corpus; nothing here reads a user id from the request body.
export async function POST(request: Request) {
  const { token, question, speaker } = await request.json();

  if (!token || typeof token !== "string") {
    return Response.json({ error: "token is required" }, { status: 400 });
  }
  if (!question || typeof question !== "string") {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  const session = await resolveAgentSession(token);
  if (!session) {
    return Response.json({ error: "unknown or expired session" }, { status: 404 });
  }

  const [meeting] = await db
    .select({ id: meetings.id, userId: meetings.userId, categoryId: meetings.categoryId })
    .from(meetings)
    .where(eq(meetings.id, session.meetingId));

  if (!meeting) {
    return Response.json({ error: "meeting not found" }, { status: 404 });
  }

  const answer = await answerQuestionText(
    question,
    {
      userId: meeting.userId,
      ...(meeting.categoryId
        ? { categoryId: meeting.categoryId }
        : { uncategorizedOnly: true }),
    },
    { conversationHistory: await recentHistory(meeting.id) },
  );

  await db.insert(liveChatMessages).values([
    {
      meetingId: meeting.id,
      role: "user",
      participantName: typeof speaker === "string" ? speaker : null,
      text: question,
      channel: "voice",
    },
    { meetingId: meeting.id, role: "assistant", text: answer, channel: "voice" },
  ]);

  return Response.json({ answer });
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add web/app/api/agent/answer/route.ts
git commit -m "feat: ground the live agent's answers in the meeting corpus"
```

---

### Task 10: The agent page

**Files:**
- Create: `web/app/agent/[token]/page.tsx`
- Create: `web/app/agent/[token]/agent-client.tsx`

**Interfaces:**
- Consumes: `ruleGate`, `GateTurn` (Task 4); `/api/agent/realtime-token` (Task 8); `/api/agent/answer` (Task 9); `Avatar` (Task 11).
- Produces: `export type AgentState = "idle" | "listening" | "thinking" | "speaking"` from `agent-client.tsx`, used by the avatar.

- [ ] **Step 1: Write the server shell**

Create `web/app/agent/[token]/page.tsx`:

```tsx
import AgentClient from "./agent-client";

// Recall's browser loads this page and streams its audio and video into
// the meeting. It renders for a bot, not a person: no chrome, no nav, no
// Clerk. The token in the path is the only credential — see
// lib/agent/sessions.ts.
export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main
      style={{
        margin: 0,
        width: "100vw",
        height: "100vh",
        background: "#0a0a0a",
        display: "grid",
        placeItems: "center",
      }}
    >
      <AgentClient token={token} />
    </main>
  );
}
```

- [ ] **Step 2: Write the client**

Create `web/app/agent/[token]/agent-client.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ruleGate, type GateTurn } from "@/lib/agent/gate";
import Avatar from "./avatar";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

const TRANSCRIPT_WS = "wss://meeting-data.bot.recall.ai/api/v1/transcript";

// Keep the gate's window small: it reasons about the last few turns, and
// an unbounded array in a long meeting is just a leak.
const TRANSCRIPT_WINDOW = 12;

export default function AgentClient({ token }: { token: string }) {
  const [state, setState] = useState<AgentState>("idle");
  const transcriptRef = useRef<GateTurn[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    // Opens a Realtime session and speaks `answer` aloud. A fresh peer
    // connection per answer keeps the billing window tight — budget is
    // charged per grant, so holding an idle session open wastes it.
    async function speak(answer: string) {
      const res = await fetch("/api/agent/realtime-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        busyRef.current = false;
        setState("listening");
        return;
      }
      const { clientSecret } = await res.json();

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      peer.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          void audioRef.current.play();
        }
      };

      const channel = peer.createDataChannel("oai-events");
      channel.onopen = () => {
        channel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Say the following to the meeting — same meaning, natural " +
                "delivery, one or two sentences: " + answer,
            },
          }),
        );
      };
      channel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type !== "response.done") return;
        setState("listening");
        peer.close();
        peerRef.current = null;
        busyRef.current = false;
      };

      const offer = await peer.createOffer({ offerToReceiveAudio: true });
      await peer.setLocalDescription(offer);

      const sdp = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      await peer.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
      setState("speaking");
    }

    async function handleUtterance(speaker: string, text: string) {
      const transcript = transcriptRef.current;
      transcript.push({ speaker, text });
      if (transcript.length > TRANSCRIPT_WINDOW) transcript.shift();

      // One answer at a time. Queuing them would have the bot replying to
      // a question the room has already moved past.
      if (busyRef.current) return;

      const { decision } = ruleGate(text, transcript.slice(0, -1));
      if (decision !== "speak") return;

      busyRef.current = true;
      setState("thinking");

      const res = await fetch("/api/agent/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, question: text, speaker }),
      });

      if (!res.ok) {
        busyRef.current = false;
        setState("listening");
        return;
      }

      const { answer } = await res.json();
      transcript.push({ speaker: "TANDEM", text: answer });
      await speak(answer);
    }

    const socket = new WebSocket(TRANSCRIPT_WS);

    socket.onopen = () => setState("listening");

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const words = message?.data?.words;
      if (!Array.isArray(words) || words.length === 0) return;

      const text = words.map((w: { text: string }) => w.text).join(" ").trim();
      if (!text) return;

      const speaker = message?.data?.participant?.name ?? "Someone";
      void handleUtterance(speaker, text);
    };

    socket.onclose = () => setState("idle");

    return () => {
      socket.close();
      peerRef.current?.close();
    };
  }, [token]);

  return (
    <>
      <Avatar state={state} />
      <audio ref={audioRef} autoPlay />
    </>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
cd web && npx tsc --noEmit
```
Expected: one error — `./avatar` does not exist yet. Task 11 resolves it. Do not stub the avatar to silence this.

- [ ] **Step 4: Commit**

```bash
git add web/app/agent
git commit -m "feat: add the live agent page Recall streams into the call"
```

---

### Task 11: Avatar

**Files:**
- Create: `web/app/agent/[token]/avatar.tsx`

**Interfaces:**
- Consumes: `AgentState` from `agent-client.tsx`.
- Produces: `export default function Avatar({ state }: { state: AgentState })`.

- [ ] **Step 1: Write it**

Create `web/app/agent/[token]/avatar.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { AgentState } from "./agent-client";

// This is the bot's video tile in the meeting — the only thing anyone in
// the call sees of Tandem. It has one job: make the agent's state legible
// at a glance, so nobody wonders whether it heard them.
const COLORS: Record<AgentState, string> = {
  idle: "#3f3f46",
  listening: "#22d3ee",
  thinking: "#a78bfa",
  speaking: "#34d399",
};

export default function Avatar({ state }: { state: AgentState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Read inside the animation loop rather than restarting the loop on
  // every state change — the loop runs for the whole meeting.
  const stateRef = useRef<AgentState>(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;

    function draw(now: number) {
      if (!canvas || !context) return;

      const { width, height } = canvas;
      context.fillStyle = "#0a0a0a";
      context.fillRect(0, 0, width, height);

      // Breathing pulse — slow when idle, quicker while speaking, so the
      // tile reads as alive without being distracting.
      const speed = stateRef.current === "speaking" ? 400 : 1400;
      const pulse = 0.5 + 0.5 * Math.sin(now / speed);
      const radius = Math.min(width, height) * (0.22 + 0.05 * pulse);

      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = COLORS[stateRef.current];
      context.globalAlpha = 0.85;
      context.fill();
      context.globalAlpha = 1;

      context.font = "500 28px ui-sans-serif, system-ui, sans-serif";
      context.fillStyle = "#e4e4e7";
      context.textAlign = "center";
      context.fillText("Tandem", width / 2, height / 2 + radius + 56);

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

- [ ] **Step 2: Type-check the whole agent surface**

```bash
cd web && npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "web/app/agent/[token]/avatar.tsx"
git commit -m "feat: show the agent's state as its meeting video tile"
```

---

### Task 12: Keep Clerk off the agent routes

Clerk's middleware matcher currently covers `/(api|trpc)(.*)` and nearly every page path. `clerkMiddleware()` with no auth logic does not itself reject anonymous requests, so the agent routes would work today — but only by accident, and a future `auth.protect()` in middleware would silently break the bot. This makes the exemption explicit.

**Files:**
- Modify: `web/proxy.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `/agent/*` and `/api/agent/*` bypass Clerk middleware entirely.

- [ ] **Step 1: Exclude the agent paths from the matcher**

In `web/proxy.ts`, replace the `config` export:

```typescript
// `/agent/*` and `/api/agent/*` are excluded deliberately: Recall's
// browser loads the agent page with no cookies and no Clerk session, and
// those routes authenticate with an opaque per-meeting token instead (see
// lib/agent/sessions.ts). Routing them through Clerk gains nothing and
// would break the bot the moment anyone adds auth.protect() here.
export const config = {
  matcher: [
    "/((?!agent|api/agent|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api(?!/agent)(.*)",
    "/trpc(.*)",
  ],
};
```

- [ ] **Step 2: Verify the agent page renders anonymously**

```bash
cd web && npm run dev &
sleep 8
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/agent/anything
```
Expected: `200` — the shell renders for any token; the token is only checked when the page calls the API routes. Stop the dev server afterwards.

- [ ] **Step 3: Commit**

```bash
git add web/proxy.ts
git commit -m "fix: keep Clerk middleware off the token-authenticated agent routes"
```

---

### Task 13: Choose the mode when joining

**Files:**
- Modify: `web/components/join-meeting-form.tsx`

**Interfaces:**
- Consumes: the `mode` parameter on `POST /api/bots` (Task 7).
- Produces: nothing for later tasks.

- [ ] **Step 1: Read the form as it stands**

```bash
cd web && cat components/join-meeting-form.tsx
```

- [ ] **Step 2: Add the mode control**

Add a `mode` state defaulting to `"notetaker"`, render two radio inputs labelled **Take notes** ("Tandem records and answers afterwards") and **Join the conversation** ("Tandem also speaks up during the call"), and include `mode` in the JSON body already posted to `/api/bots`. Follow the form's existing state and styling patterns rather than introducing new ones.

- [ ] **Step 3: Type-check and lint**

```bash
cd web && npx tsc --noEmit && npm run lint
```
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add web/components/join-meeting-form.tsx
git commit -m "feat: let people pick notetaker or live mode when joining"
```

---

### Task 14: Documentation

**Files:**
- Modify: `web/README.md`, `web/plan.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Correct the stale phase tracker**

`web/plan.md` lists "In-meeting chat Q&A agent" as not started; it shipped as `lib/recall/live-chat.ts`. Mark it done, and add the live voice agent as its own entry describing what this plan built.

- [ ] **Step 2: Document the new environment variable**

Add `OPENAI_API_KEY` to the prerequisites and setup sections of `web/README.md`, noting it is only needed for the live agent feature.

- [ ] **Step 3: Document the two features**

Update the feature list in `web/README.md` so the live voice agent sits alongside the notetaker, and link to the spec.

- [ ] **Step 4: Commit**

```bash
git add web/README.md web/plan.md
git commit -m "docs: document the live agent feature and its configuration"
```

---

### Task 15: Full verification

**Files:** none.

- [ ] **Step 1: Run every test**

```bash
cd web && node --import tsx --test lib/agent/*.test.ts
```
Expected: all pass — 9 gate, 3 session, 4 minute, 5 trigger.

- [ ] **Step 2: Type-check and lint the product**

```bash
cd web && npx tsc --noEmit && npm run lint
```
Expected: both clean.

- [ ] **Step 3: Build the product**

```bash
cd web && npm run build
```
Expected: a successful production build.

- [ ] **Step 4: Build the Go dev tool**

```bash
cd tools/tandem && go build -o /dev/null .
```
Expected: exit 0.

- [ ] **Step 5: Real-call verification**

This is the gate the unit tests cannot cover. With `APP_BASE_URL` pointing at a publicly reachable deployment:

1. Join a real meeting in live mode.
2. Confirm the bot appears with the Tandem avatar tile.
3. Say "Tandem, what did we discuss last week?" and confirm it speaks an answer.
4. Say something unrelated to it and confirm it stays quiet.
5. Confirm both turns landed in `live_chat_messages` with `channel = 'voice'`:

```sql
select channel, role, participant_name, left(text, 60)
from live_chat_messages
where meeting_id = '<the meeting id>'
order by created_at;
```

- [ ] **Step 6: Commit any fixes the real call surfaced**

```bash
git add -A
git commit -m "fix: address issues found in live-call verification"
```

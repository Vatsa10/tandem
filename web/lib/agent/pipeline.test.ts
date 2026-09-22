import assert from "node:assert/strict";
import { test } from "node:test";
import { ruleGate, type GateTurn } from "./gate";
import { nextGrant, remainingSeconds } from "./budget";
import { AGENT_TOOLS, realtimeToolSpecs, runsOnClient } from "./tools";
import { extractQuestion } from "./trigger";

// An offline walk through a meeting, end to end, with no database, no Recall,
// no OpenAI and no network: utterances arrive, the gate decides, tool calls
// are routed to the side that can serve them, and the budget is drawn down.
//
// What this does NOT prove: that Recall streams the page, that the Realtime
// session speaks, or that retrieval returns anything. Those need the live
// call in the plan's final task. What it does prove is that every wire
// between our own pieces is connected, and it catches the failure that
// actually costs money in a meeting — the bot talking when it should not.

type ToolResult = { name: string; side: "client" | "server" };

/** Stands in for the agent page's tool routing. */
function routeTool(name: string): ToolResult {
  return { name, side: runsOnClient(name) ? "client" : "server" };
}

/** Stands in for the live transcript buffer the page keeps. */
function transcriptTool(transcript: GateTurn[], limit = 20): string {
  const recent = transcript.slice(-limit);
  if (recent.length === 0) return "Nothing has been said yet.";
  return recent.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n");
}

test("a meeting runs start to finish without the bot barging in", () => {
  const transcript: GateTurn[] = [];
  const spoken: string[] = [];
  let secondsUsed = 0;

  const meeting = [
    { speaker: "Alice", text: "morning everyone" },
    { speaker: "Bob", text: "Alice, did you push that branch?" },
    { speaker: "Alice", text: "yeah I saw that too" },
    { speaker: "Bob", text: "Tandem, what did we agree on the deploy window?" },
    { speaker: "Alice", text: "and who owns the rollback?" },
    { speaker: "Bob", text: "cool, thanks" },
  ];

  for (const turn of meeting) {
    const history = [...transcript];
    transcript.push(turn);

    const { decision } = ruleGate(turn.text, history);
    if (decision !== "speak") continue;

    // Answering costs a grant of Realtime budget.
    const grant = nextGrant(secondsUsed);
    assert.ok(grant > 0, "budget exhausted mid-meeting");
    secondsUsed += grant;

    const answer = `answer to: ${turn.text}`;
    spoken.push(turn.text);
    transcript.push({ speaker: "TANDEM", text: answer });
  }

  // Spoke exactly twice: when addressed by name, and on the immediate
  // follow-up to its own answer.
  assert.deepEqual(spoken, [
    "Tandem, what did we agree on the deploy window?",
    "and who owns the rollback?",
  ]);

  // Never spoke over the small talk or the question aimed at Alice.
  assert.ok(!spoken.includes("morning everyone"));
  assert.ok(!spoken.includes("Alice, did you push that branch?"));
  assert.ok(!spoken.includes("yeah I saw that too"));

  // Both spoken turns are in the transcript the next gate decision reads.
  assert.equal(transcript.filter((t) => t.speaker === "TANDEM").length, 2);

  // And the budget moved by exactly what was granted.
  assert.equal(remainingSeconds(secondsUsed) + secondsUsed, 30 * 60);
});

test("tool calls are routed to the side that can serve them", () => {
  assert.deepEqual(routeTool("get_transcript"), {
    name: "get_transcript",
    side: "client",
  });
  assert.deepEqual(routeTool("search_meetings"), {
    name: "search_meetings",
    side: "server",
  });

  // Every tool the model can call resolves somewhere — an unrouted tool
  // would hang the turn.
  for (const tool of AGENT_TOOLS) {
    const routed = routeTool(tool.name);
    assert.ok(routed.side === "client" || routed.side === "server");
  }
});

test("the transcript tool answers from the page's own buffer", () => {
  assert.equal(transcriptTool([]), "Nothing has been said yet.");

  const transcript: GateTurn[] = [
    { speaker: "Alice", text: "ship it friday" },
    { speaker: "Bob", text: "works for me" },
  ];
  assert.equal(
    transcriptTool(transcript),
    "Alice: ship it friday\nBob: works for me",
  );
  assert.equal(transcriptTool(transcript, 1), "Bob: works for me");
});

test("the chat channel and the voice channel share one trigger", () => {
  // The same message typed in chat reaches the same agent that would have
  // answered it aloud.
  assert.equal(
    extractQuestion("@Tandem, what did we agree on the deploy window?"),
    "what did we agree on the deploy window?",
  );
  assert.equal(
    ruleGate("Tandem, what did we agree on the deploy window?", []).decision,
    "speak",
  );
});

test("a budget that runs out stops the agent rather than overspending", () => {
  let secondsUsed = 0;
  let answered = 0;

  // Keep answering until the cap is hit; it must stop, not go negative.
  while (nextGrant(secondsUsed) > 0) {
    secondsUsed += nextGrant(secondsUsed);
    answered += 1;
    assert.ok(answered < 100, "budget never ran out");
  }

  assert.equal(remainingSeconds(secondsUsed), 0);
  assert.equal(nextGrant(secondsUsed), 0);
});

test("the model is handed a usable tool spec for every tool", () => {
  const specs = realtimeToolSpecs();
  const names = specs.map((spec) => spec.name);
  assert.ok(names.includes("search_meetings"));
  assert.ok(names.includes("send_chat"));
  assert.equal(new Set(names).size, names.length);
});

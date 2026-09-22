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

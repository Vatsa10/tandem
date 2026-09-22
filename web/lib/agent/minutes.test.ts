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

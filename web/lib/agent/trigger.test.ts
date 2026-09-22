import assert from "node:assert/strict";
import { test } from "node:test";
import { BOT_DISPLAY_NAME, extractQuestion } from "./trigger";

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

// The bot answered to "Rika" before the rename. A meeting where someone
// still says the old name must not wake it up.
test("the old name no longer triggers", () => {
  assert.equal(extractQuestion("Rika, what did we agree on?"), null);
});

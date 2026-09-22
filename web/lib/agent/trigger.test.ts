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

// Only this bot's own name wakes it up — another assistant's name in the
// room is someone else's business.
test("another assistant's name does not trigger", () => {
  assert.equal(extractQuestion("Otto, what did we agree on?"), null);
});

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
  assert.equal(extractQuestion("Tandem, what did we agree on?"), null);
});

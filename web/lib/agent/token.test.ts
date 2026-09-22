import assert from "node:assert/strict";
import { test } from "node:test";
import { AGENT_SESSION_TTL_MS, mintToken } from "./token";

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

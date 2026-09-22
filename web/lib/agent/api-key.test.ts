import assert from "node:assert/strict";
import { test } from "node:test";
import {
  API_KEY_PREFIX,
  apiKeyPrefix,
  bearerToken,
  hashApiKey,
  hashesMatch,
  looksLikeApiKey,
  mintApiKey,
} from "./api-key";

test("keys are prefixed and unguessable", () => {
  const key = mintApiKey();
  assert.ok(key.startsWith(API_KEY_PREFIX));
  assert.ok(key.length > 40);
  assert.match(key.slice(API_KEY_PREFIX.length), /^[A-Za-z0-9_-]+$/);
});

test("keys do not repeat", () => {
  const keys = new Set(Array.from({ length: 1000 }, mintApiKey));
  assert.equal(keys.size, 1000);
});

test("hashing is stable and one-way", () => {
  const key = mintApiKey();
  assert.equal(hashApiKey(key), hashApiKey(key));
  assert.equal(hashApiKey(key).length, 64);
  assert.ok(!hashApiKey(key).includes(key.slice(API_KEY_PREFIX.length)));
});

test("different keys hash differently", () => {
  assert.notEqual(hashApiKey(mintApiKey()), hashApiKey(mintApiKey()));
});

test("the stored prefix is too short to authenticate with", () => {
  const key = mintApiKey();
  const prefix = apiKeyPrefix(key);
  assert.ok(prefix.startsWith(API_KEY_PREFIX));
  assert.ok(prefix.length < key.length / 2);
  assert.notEqual(hashApiKey(prefix), hashApiKey(key));
});

test("hash comparison accepts equal digests and rejects others", () => {
  const key = mintApiKey();
  assert.equal(hashesMatch(hashApiKey(key), hashApiKey(key)), true);
  assert.equal(hashesMatch(hashApiKey(key), hashApiKey(mintApiKey())), false);
});

test("hash comparison rejects malformed input instead of throwing", () => {
  assert.equal(hashesMatch("", ""), false);
  assert.equal(hashesMatch("abcd", ""), false);
  assert.equal(hashesMatch(hashApiKey(mintApiKey()), "abcd"), false);
});

test("only well-formed keys are accepted for lookup", () => {
  assert.equal(looksLikeApiKey(mintApiKey()), true);
  assert.equal(looksLikeApiKey("tdm_short"), false);
  assert.equal(looksLikeApiKey("sk-proj-not-ours-but-long-enough-to-pass"), false);
  assert.equal(looksLikeApiKey(""), false);
});

test("bearer tokens are parsed, other schemes are not", () => {
  assert.equal(bearerToken("Bearer tdm_abc"), "tdm_abc");
  assert.equal(bearerToken("bearer tdm_abc"), "tdm_abc");
  assert.equal(bearerToken("Basic tdm_abc"), null);
  assert.equal(bearerToken("tdm_abc"), null);
  assert.equal(bearerToken(null), null);
});

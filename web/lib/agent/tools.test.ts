import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AGENT_TOOLS,
  findTool,
  realtimeToolSpecs,
  runsOnClient,
} from "./tools";

test("tool names are unique", () => {
  const names = AGENT_TOOLS.map((tool) => tool.name);
  assert.equal(new Set(names).size, names.length);
});

test("every tool declares where it runs", () => {
  for (const tool of AGENT_TOOLS) {
    assert.ok(
      tool.location === "server" || tool.location === "client",
      `${tool.name} has no valid location`,
    );
  }
});

test("every required parameter is declared", () => {
  for (const tool of AGENT_TOOLS) {
    for (const required of tool.parameters.required) {
      assert.ok(
        required in tool.parameters.properties,
        `${tool.name} requires undeclared parameter ${required}`,
      );
    }
  }
});

test("the transcript tool runs in the page, which owns the live buffer", () => {
  assert.equal(runsOnClient("get_transcript"), true);
});

test("tools needing secrets or the database run on the server", () => {
  for (const name of [
    "search_meetings",
    "web_search",
    "send_chat",
    "leave_meeting",
  ]) {
    assert.equal(runsOnClient(name), false, `${name} must not run in the page`);
  }
});

// The local MCP tool can reach the user's own machine. The hosted agent
// cannot, and a publicly-reachable page must never be given a shell.
test("machine-level tools are not exposed to the hosted agent", () => {
  for (const name of [
    "run_shell",
    "write_file",
    "computer_use",
    "read_document",
    "consult_agent",
  ]) {
    assert.equal(findTool(name), undefined, `${name} must stay local-only`);
  }
});

test("realtime specs carry a name, description, and schema", () => {
  const specs = realtimeToolSpecs();
  assert.equal(specs.length, AGENT_TOOLS.length);
  for (const spec of specs) {
    assert.equal(spec.type, "function");
    assert.ok(spec.name);
    assert.ok(spec.description);
    assert.ok(spec.parameters);
  }
});

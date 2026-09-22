// The live agent's tool surface — one registry, shared by the voice agent on
// the Output Media page and the "@Tandem" chat responder.
//
// It merges the two tool sets the product grew separately:
//
//   * the MCP server in tools/tandem (get_transcript, get_participants,
//     send_chat, leave_meeting) — what a meeting bot can do about the call
//     it is sitting in;
//   * the notetaker's own corpus (search_meetings, get_meeting_notes,
//     list_upcoming_meetings) — what this product knows that the Go tool
//     never did;
//   * web_search, ported from tools/tandem/tools.go.
//
// Deliberately NOT ported: run_shell, write_file, computer_use,
// read_document, and consult_agent. Those reach into the machine the Go
// binary runs on — the user's own laptop, with their files and their Claude
// session. The hosted agent has no such machine, and giving a
// publicly-reachable page shell access to a server would be a hole, not a
// feature. They stay exclusive to the local MCP tool.

export type ToolLocation = "server" | "client";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  /** `client` runs in the agent page (it owns the live transcript buffer);
      `server` runs behind /api/agent/tool, where the database, the Recall
      key and the OpenAI key live. */
  location: ToolLocation;
}

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "search_meetings",
    description:
      "Search past meeting transcripts for what was actually said, and get back matching quotes with their speaker. Use whenever someone asks what was decided, agreed, promised, or discussed before — this is the memory the rest of the meeting does not have.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to look for, phrased as the question being asked.",
        },
      },
      required: ["query"],
    },
    location: "server",
  },
  {
    name: "get_transcript",
    description:
      "Get what has been said so far in this meeting, most recent last. Use to catch up on a thread, resolve a pronoun, or check whether something was already answered before you answer it again.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "How many recent turns to return. Defaults to 20.",
        },
      },
      required: [],
    },
    location: "client",
  },
  {
    name: "get_participants",
    description:
      "List who is currently in this call. Use before addressing someone by name, or when asked who is here.",
    parameters: { type: "object", properties: {}, required: [] },
    location: "server",
  },
  {
    name: "get_meeting_notes",
    description:
      "Get the summary, action items, and highlights generated for a past meeting. Use when someone asks what came out of a previous call rather than what was literally said in it.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "Part of the meeting's title, or leave empty for the most recent completed meeting.",
        },
      },
      required: [],
    },
    location: "server",
  },
  {
    name: "list_upcoming_meetings",
    description:
      "List the next few meetings on the connected calendars. Use when asked about scheduling, availability, or what is coming up.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "How many to return. Defaults to 5.",
        },
      },
      required: [],
    },
    location: "server",
  },
  {
    name: "web_search",
    description:
      "Search the web for current or factual information and get a concise answer with sources. Use for recent events, facts you are unsure of, or anything that benefits from up-to-date information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
      },
      required: ["query"],
    },
    location: "server",
  },
  {
    name: "send_chat",
    description:
      "Post a message into the meeting's chat panel instead of saying it out loud. Use when the answer is long, contains a link or a list, or when the conversation has moved on and speaking would interrupt.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The message to post." },
      },
      required: ["text"],
    },
    location: "server",
  },
  {
    name: "leave_meeting",
    description:
      "Leave the call. Use only when someone clearly asks you to leave, drop off, or stop recording.",
    parameters: { type: "object", properties: {}, required: [] },
    location: "server",
  },
];

/** Tool definitions in the shape OpenAI Realtime expects in `session.update`. */
export function realtimeToolSpecs(): Array<Record<string, unknown>> {
  return AGENT_TOOLS.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export function findTool(name: string): ToolDefinition | undefined {
  return AGENT_TOOLS.find((tool) => tool.name === name);
}

export function runsOnClient(name: string): boolean {
  return findTool(name)?.location === "client";
}

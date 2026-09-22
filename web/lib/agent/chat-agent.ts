import { generateText, jsonSchema, stepCountIs, tool } from "ai";
import { getChatModel } from "@/lib/ai/model";
import { runServerTool, type ToolContext } from "./tool-runner";
import { AGENT_TOOLS } from "./tools";
import { BOT_DISPLAY_NAME } from "./trigger";

// The "@Tandem" chat responder, given the same tools as the voice agent so
// both halves of the product answer from the same capabilities. The only
// difference is the channel: this one types, so it can afford a link or a
// short list where the voice agent cannot.
//
// get_transcript is skipped here — it reads the live buffer held by the
// agent page, which this server-side path has no access to.

const MAX_STEPS = 5;

function chatTools(ctx: ToolContext) {
  return Object.fromEntries(
    AGENT_TOOLS.filter((definition) => definition.location === "server").map(
      (definition) => [
        definition.name,
        tool({
          description: definition.description,
          inputSchema: jsonSchema(definition.parameters),
          execute: async (args) =>
            runServerTool(ctx, definition.name, args as Record<string, unknown>),
        }),
      ],
    ),
  );
}

export async function answerWithTools(
  ctx: ToolContext,
  question: string,
  conversationHistory: string | null,
): Promise<string> {
  const result = await generateText({
    model: getChatModel(),
    tools: chatTools(ctx),
    // Without a cap a tool loop can run away on a meeting's budget; five
    // steps is enough for search, a follow-up search, and an answer.
    stopWhen: stepCountIs(MAX_STEPS),
    system:
      `You are ${BOT_DISPLAY_NAME}, answering in a live meeting's chat panel. ` +
      "Keep it to one to three short sentences, no markdown. " +
      "Use search_meetings for anything about what was said or decided " +
      "before rather than guessing. Say so plainly when you do not know." +
      (conversationHistory
        ? `\n\nRecent conversation in this meeting:\n${conversationHistory}`
        : ""),
    prompt: question,
  });

  return result.text.trim();
}

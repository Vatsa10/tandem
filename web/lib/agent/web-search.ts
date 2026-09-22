import { env } from "@/lib/env";

// Ported from tools/tandem/tools.go — same approach, same provider: the
// OpenAI Responses API with its hosted web_search tool, asked for a short
// answer with inline sources so the agent can speak it without editing.

const SEARCH_TIMEOUT_MS = 30_000;

export async function webSearch(query: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        tools: [{ type: "web_search_preview" }],
        tool_choice: "auto",
        input:
          "Search the web and answer concisely (2-4 sentences), citing sources inline: " +
          query,
      }),
    });

    if (!response.ok) {
      return `web search failed (${response.status})`;
    }

    // The Responses API returns an `output` array of items; the assistant's
    // words are the `output_text` parts of the message item, with the search
    // call itself sitting alongside them.
    const body = await response.json();
    const text = (body.output ?? [])
      .flatMap((item: { content?: Array<{ type?: string; text?: string }> }) =>
        (item.content ?? [])
          .filter((part) => part.type === "output_text")
          .map((part) => part.text ?? ""),
      )
      .join(" ")
      .trim();

    return text || "web search returned nothing";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return "web search timed out";
    }
    return "web search failed";
  } finally {
    clearTimeout(timeout);
  }
}

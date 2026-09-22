import { generateText, Output } from "ai";
import { z } from "zod";
import type {
  MeetingActionItem,
  MeetingHighlight,
} from "@/lib/db/schema";
import { getChatModel } from "./model";

const IntelligenceSchema = z.object({
  summary: z
    .string()
    .describe(
      "2–4 sentence recap of what was discussed and decided. Plain prose, no bullets.",
    ),
  actionItems: z
    .array(
      z.object({
        text: z.string().describe("Concrete follow-up task"),
        assignee: z
          .string()
          .nullable()
          .describe("Person named as owner, or null if unclear"),
        dueHint: z
          .string()
          .nullable()
          .describe(
            "Any mentioned deadline or timing (e.g. 'by Friday'), or null",
          ),
      }),
    )
    .describe("Explicit commitments and next steps. Empty if none."),
  highlights: z
    .array(
      z.object({
        text: z
          .string()
          .describe("Short quote or paraphrase of a key moment"),
        speaker: z
          .string()
          .nullable()
          .describe("Speaker name if known, else null"),
        startMs: z
          .number()
          .nullable()
          .describe(
            "Approximate start time in milliseconds from a transcript line, or null",
          ),
      }),
    )
    .describe(
      "3–8 notable decisions, quotes, or turning points. Prefer moments with timestamps.",
    ),
});

export type MeetingIntelligence = {
  summary: string;
  actionItems: MeetingActionItem[];
  highlights: MeetingHighlight[];
};

export type TranscriptLine = {
  speaker: string | null;
  startMs: number;
  text: string;
};

// DeepSeek handles long context, but keep prompts bounded so free-tier
// and webhook maxDuration stay predictable.
const MAX_TRANSCRIPT_CHARS = 80_000;

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTranscriptForIntelligence(
  lines: TranscriptLine[],
): string {
  if (lines.length === 0) return "";

  const formatted = lines
    .map(
      (l) =>
        `[${formatTimestamp(l.startMs)}] ${l.speaker ?? "Unknown"}: ${l.text}`,
    )
    .join("\n");

  if (formatted.length <= MAX_TRANSCRIPT_CHARS) return formatted;

  return (
    formatted.slice(0, MAX_TRANSCRIPT_CHARS) +
    "\n\n[Transcript truncated for length.]"
  );
}

export async function generateMeetingIntelligence(
  lines: TranscriptLine[],
  options?: { title?: string | null },
): Promise<MeetingIntelligence | null> {
  const transcript = formatTranscriptForIntelligence(lines);
  if (!transcript.trim()) return null;

  const titleLine = options?.title
    ? `Meeting title: ${options.title}\n\n`
    : "";

  const result = await generateText({
    model: getChatModel(),
    output: Output.object({ schema: IntelligenceSchema }),
    system:
      "You extract structured meeting notes from a speaker-attributed " +
      "transcript. Only use what was actually said — do not invent " +
      "action items or decisions. Prefer concrete, specific language. " +
      "For highlights, copy startMs from the nearest transcript line " +
      "timestamp (convert m:ss labels: minutes*60000 + seconds*1000).",
    prompt:
      `${titleLine}Transcript:\n${transcript}\n\n` +
      "Produce a summary, action items, and highlights for this meeting.",
  });

  const output = result.output;
  if (!output) return null;

  return {
    summary: output.summary.trim(),
    actionItems: output.actionItems.map((item) => ({
      text: item.text.trim(),
      assignee: item.assignee?.trim() || null,
      dueHint: item.dueHint?.trim() || null,
    })),
    highlights: output.highlights.map((h) => ({
      text: h.text.trim(),
      speaker: h.speaker?.trim() || null,
      startMs:
        typeof h.startMs === "number" && Number.isFinite(h.startMs)
          ? Math.max(0, Math.round(h.startMs))
          : null,
    })),
  };
}

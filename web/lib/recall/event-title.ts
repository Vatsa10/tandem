import type { RecallCalendarEvent } from "./types";

// Recall doesn't normalize a title field — it lives in the provider-native
// `raw` payload under different keys per platform.
export function extractEventTitle(event: RecallCalendarEvent): string | null {
  const raw = event.raw as Record<string, unknown> | undefined;
  if (!raw) return null;

  const summary = raw.summary; // Google Calendar
  if (typeof summary === "string" && summary.trim()) return summary;

  const subject = raw.subject; // Microsoft Graph
  if (typeof subject === "string" && subject.trim()) return subject;

  return null;
}

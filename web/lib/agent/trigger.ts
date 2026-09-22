// Who the bot is, and how it knows a message is meant for it. Pure string
// work, no database or model imports, so both the live chat responder and
// the voice agent can share it and it stays unit-testable.

// Must match the `botName` passed to createBot/scheduleCalendarBot exactly,
// or the self-message guard in lib/recall/live-chat.ts breaks and Tandem
// starts replying to itself in a loop.
export const BOT_DISPLAY_NAME = "TANDEM";

// Directed at Tandem if the message starts with its name, optionally
// preceded by "@" and followed by punctuation/whitespace before the actual
// question — e.g. "@Tandem, what did we agree on pricing?".
const TRIGGER_PATTERN = /^@?tandem[,:\s]+(.+)/i;

export function extractQuestion(text: string): string | null {
  const match = TRIGGER_PATTERN.exec(text.trim());
  const question = match?.[1]?.trim();
  return question || null;
}

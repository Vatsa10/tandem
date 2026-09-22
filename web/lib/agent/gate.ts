// Social reasoning gate, ported from tools/tandem/gate.js.
//
// Three outcomes:
//   speak  — directly addressed, or a clear follow-up is expected
//   hand   — has something useful but was not asked; signal, don't barge in
//   silent — humans are talking to each other; stay out
//
// The default is silence. A bot that talks over people is worse than no
// bot, so anything this doesn't recognise falls through to `silent`
// rather than guessing.

export type GateDecision = "speak" | "hand" | "silent";

export interface GateTurn {
  speaker: string;
  text: string;
}

export interface GateResult {
  decision: GateDecision;
  reason: string;
}

export const BOT_NAME = "TANDEM";

export const BOT_ALIASES = ["tandem", "hey ai", "the ai", "the agent"];

// Mentions that talk *about* the bot rather than *to* it.
function isPassingMention(lower: string, name: string): boolean {
  return [
    `testing ${name}`,
    `tried ${name}`,
    `using ${name}`,
    `${name} yesterday`,
    `${name} crashed`,
    `${name} broke`,
    `about ${name}`,
  ].some((phrase) => lower.includes(phrase));
}

function isAddressed(lower: string, name: string): boolean {
  return (
    lower.startsWith(name) ||
    lower.includes(`${name},`) ||
    lower.includes(`${name} `) ||
    lower.endsWith(name) ||
    lower.endsWith(`${name}.`) ||
    lower.endsWith(`${name}?`) ||
    lower.endsWith(`${name}!`)
  );
}

// Turns since the bot last spoke: 0 means it spoke most recently, -1 means
// it has not spoken inside this window.
function turnsSinceBotSpoke(transcript: GateTurn[], botName: string): number {
  for (let i = transcript.length - 1; i >= 0; i--) {
    if (transcript[i].speaker.toLowerCase() === botName.toLowerCase()) {
      return transcript.length - 1 - i;
    }
  }
  return -1;
}

export function ruleGate(
  text: string,
  transcript: GateTurn[],
  botName: string = BOT_NAME,
  aliases: string[] = BOT_ALIASES,
): GateResult {
  const lower = text.toLowerCase();

  for (const alias of aliases) {
    const name = alias.toLowerCase();
    if (!isAddressed(lower, name)) continue;
    if (isPassingMention(lower, name)) {
      return { decision: "silent", reason: "passing mention" };
    }
    return { decision: "speak", reason: "name invoked" };
  }

  const since = turnsSinceBotSpoke(transcript, botName);
  if (since === 0) return { decision: "speak", reason: "follow-up to the bot" };

  // "Bob, can you review my PR?" is a question, but it is aimed at Bob.
  // A leading capitalised name and comma is the clearest signal a human
  // is addressing another human, and answering it would be barging in.
  if (/^[A-Z][a-z]+,/.test(text.trim())) {
    return { decision: "silent", reason: "addressed to someone else" };
  }

  if (text.trim().endsWith("?")) {
    return { decision: "hand", reason: "open question" };
  }

  if (since === 1) {
    return { decision: "hand", reason: "possible follow-up" };
  }

  return { decision: "silent", reason: "humans talking" };
}

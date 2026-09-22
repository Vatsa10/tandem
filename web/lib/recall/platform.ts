import type { RecallPlatform } from "./types";

export function detectPlatform(meetingUrl: string): RecallPlatform | null {
  let host = "";
  try {
    host = new URL(meetingUrl).hostname;
  } catch {
    return null;
  }

  if (host.includes("zoom.us")) return "zoom";
  if (host.includes("meet.google.com")) return "google_meet";
  if (host.includes("teams.microsoft.com") || host.includes("teams.live.com")) {
    return "teams";
  }
  if (host.includes("webex.com")) return "webex";
  return null;
}

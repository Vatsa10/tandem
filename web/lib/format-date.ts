/** Stable display formatting — never use the runtime default locale,
 * or SSR (often en-US / UTC host) and the browser disagree and hydrate
 * with a mismatch. */
const DISPLAY_LOCALE = "en-US";

export function formatMeetingWhen(date: Date | string | null | undefined): string {
  if (!date) return "Not scheduled";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Not scheduled";

  return d.toLocaleString(DISPLAY_LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

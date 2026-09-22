function humanize(status: string): string {
  return status
    .replace(/^fatal:?/, "")
    .split(/[_:]/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

type Tone = "recording" | "captured" | "failed" | "neutral";

function toneFor(status: string): { tone: Tone; label: string } {
  if (status === "done") return { tone: "captured", label: "Captured" };
  if (status.startsWith("fatal")) return { tone: "failed", label: "Failed" };
  if (status === "in_call_recording") {
    return { tone: "recording", label: "Recording" };
  }

  const label = humanize(status) || "Scheduled";
  return { tone: "neutral", label };
}

const TONE_CLASSES: Record<Tone, string> = {
  recording: "border-rec/25 bg-rec/8 text-rec",
  captured: "border-moss/25 bg-moss/8 text-moss",
  failed: "border-rec/30 bg-rec/10 text-rec",
  neutral: "border-line bg-card text-ink-muted",
};

const DOT_CLASSES: Record<Tone, string> = {
  recording: "bg-rec animate-pulse",
  captured: "bg-moss",
  failed: "bg-rec",
  neutral: "bg-ink-muted",
};

export function StatusBadge({ status }: { status: string }) {
  const { tone, label } = toneFor(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase ${TONE_CLASSES[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`}
      />
      {label}
    </span>
  );
}

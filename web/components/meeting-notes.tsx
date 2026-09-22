"use client";

import { CheckSquare, Loader2, Quote, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  MeetingActionItem,
  MeetingHighlight,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function MeetingNotes({
  meetingId,
  summary,
  actionItems,
  highlights,
  onSeek,
  canGenerate,
}: {
  meetingId: string;
  summary: string | null;
  actionItems: MeetingActionItem[] | null;
  highlights: MeetingHighlight[] | null;
  onSeek?: (startMs: number) => void;
  /** Show generate/regenerate when the meeting is done. */
  canGenerate?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNotes =
    Boolean(summary?.trim()) ||
    (actionItems?.length ?? 0) > 0 ||
    (highlights?.length ?? 0) > 0;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/intelligence`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Failed to generate notes");
      }
      toast({
        title: "Notes ready",
        description: "Summary, action items, and highlights were updated.",
        tone: "success",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate notes");
    } finally {
      setGenerating(false);
    }
  }

  if (!hasNotes) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line/80 bg-white/40 px-6 py-10 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-soft text-ink-muted">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="max-w-sm">
          <p className="font-display text-[15px] font-semibold text-ink">
            No notes yet
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Tandem writes a summary, action items, and highlights after the
            transcript is ready.
          </p>
        </div>
        {canGenerate && (
          <Button
            type="button"
            size="sm"
            disabled={generating}
            onClick={handleGenerate}
            className="mt-1"
          >
            {generating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Generate notes
              </>
            )}
          </Button>
        )}
        {error && (
          <p className="font-mono text-[12px] text-rec">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pr-1">
      {canGenerate && (
        <div className="flex shrink-0 items-center justify-end gap-2">
          {error && (
            <p className="mr-auto font-mono text-[12px] text-rec">{error}</p>
          )}
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-ink-muted uppercase transition-colors hover:text-ink disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            ) : (
              <RefreshCw className="h-3 w-3" strokeWidth={2} />
            )}
            {generating ? "Refreshing…" : "Regenerate"}
          </button>
        </div>
      )}

      {summary && (
        <section className="flex flex-col gap-2">
          <h3 className="section-label">Summary</h3>
          <p className="text-[15px] leading-relaxed text-ink">{summary}</p>
        </section>
      )}

      {(actionItems?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="section-label">Action items</h3>
          <ul className="flex flex-col gap-2">
            {actionItems!.map((item, i) => (
              <li
                key={`${i}-${item.text.slice(0, 24)}`}
                className="flex gap-2.5 rounded-xl border border-line/80 bg-white/70 px-3 py-2.5"
              >
                <CheckSquare
                  className="mt-0.5 h-4 w-4 shrink-0 text-moss"
                  strokeWidth={1.75}
                />
                <div className="min-w-0">
                  <p className="text-sm text-ink">{item.text}</p>
                  {(item.assignee || item.dueHint) && (
                    <p className="mt-1 font-mono text-[11px] text-ink-muted">
                      {[item.assignee, item.dueHint].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(highlights?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="section-label">Highlights</h3>
          <ul className="flex flex-col gap-2">
            {highlights!.map((h, i) => {
              const seekable =
                onSeek && typeof h.startMs === "number" && h.startMs >= 0;
              const content = (
                <>
                  <Quote
                    className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{h.text}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink-muted">
                      {[
                        h.speaker,
                        typeof h.startMs === "number"
                          ? formatTimestamp(h.startMs)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={`${i}-${h.text.slice(0, 24)}`}>
                  {seekable ? (
                    <button
                      type="button"
                      onClick={() => onSeek(h.startMs!)}
                      className="flex w-full gap-2.5 rounded-xl border border-line/80 bg-white/70 px-3 py-2.5 text-left transition-colors hover:border-ink/25 hover:bg-white"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex gap-2.5 rounded-xl border border-line/80 bg-white/70 px-3 py-2.5">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

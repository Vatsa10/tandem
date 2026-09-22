"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export interface TranscriptChunkItem {
  id: string;
  speaker: string | null;
  startMs: number;
  text: string;
}

const AVATAR_COLORS = [
  "#1F6F54",
  "#B45309",
  "#6D28D9",
  "#BE185D",
  "#1D4ED8",
  "#0F766E",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function SpeakerAvatar({ name }: { name: string | null }) {
  const label = name ?? "?";
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
      style={{ backgroundColor: colorFor(label) }}
    >
      {label[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Wraps every case-insensitive occurrence of `query` in a brand <mark>. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < text.length) {
    const found = lower.indexOf(needle, index);
    if (found === -1) {
      parts.push(text.slice(index));
      break;
    }
    if (found > index) parts.push(text.slice(index, found));
    parts.push(
      <mark
        key={key++}
        className="rounded-[3px] bg-rec/15 px-0.5 text-inherit"
      >
        {text.slice(found, found + needle.length)}
      </mark>,
    );
    index = found + needle.length;
  }

  return <>{parts}</>;
}

export function TranscriptViewer({
  chunks,
  onSeek,
  activeChunkId,
  className,
}: {
  chunks: TranscriptChunkItem[];
  /** Omit to render read-only timestamps (no recording to seek). */
  onSeek?: (startMs: number) => void;
  activeChunkId?: string | null;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [matchCursor, setMatchCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();

  const matchIds = useMemo(() => {
    if (!trimmedQuery) return [];
    const needle = trimmedQuery.toLowerCase();
    return chunks
      .filter((chunk) =>
        `${chunk.speaker ?? ""} ${chunk.text}`.toLowerCase().includes(needle),
      )
      .map((chunk) => chunk.id);
  }, [chunks, trimmedQuery]);

  const matchIdSet = useMemo(() => new Set(matchIds), [matchIds]);
  const cursor = Math.min(matchCursor, Math.max(0, matchIds.length - 1));
  const currentMatchId = matchIds.length > 0 ? matchIds[cursor] : null;

  // Keep the focused search hit in view as the query/cursor changes.
  useEffect(() => {
    if (!currentMatchId) return;
    rootRef.current
      ?.querySelector(`[data-chunk-id="${currentMatchId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentMatchId]);

  function stepMatch(delta: number) {
    if (matchIds.length === 0) return;
    setMatchCursor(
      (cursor + delta + matchIds.length) % matchIds.length,
    );
  }

  if (chunks.length === 0) {
    return <EmptyState>No transcript available yet.</EmptyState>;
  }

  return (
    <div
      ref={rootRef}
      className={cn("max-h-[min(70vh,640px)] overflow-y-auto", className)}
    >
      {/* Search — sticky so it stays reachable mid-transcript */}
      <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center gap-2 bg-paper/90 px-1 pt-1 pb-2 backdrop-blur-sm">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
            strokeWidth={1.75}
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setMatchCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                stepMatch(e.shiftKey ? -1 : 1);
              }
            }}
            placeholder="Search transcript…"
            aria-label="Search transcript"
            className="w-full rounded-lg border border-line bg-white/80 py-1.5 pr-7 pl-8 text-[13px] text-ink outline-none placeholder:text-ink-muted focus:border-ink/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setMatchCursor(0);
              }}
              aria-label="Clear transcript search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-ink-muted transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {trimmedQuery && (
          <>
            <span className="shrink-0 font-mono text-[11px] text-ink-muted tabular-nums">
              {matchIds.length > 0
                ? `${cursor + 1} / ${matchIds.length}`
                : "No matches"}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => stepMatch(-1)}
                disabled={matchIds.length === 0}
                aria-label="Previous match"
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-soft hover:text-ink disabled:opacity-40"
              >
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => stepMatch(1)}
                disabled={matchIds.length === 0}
                aria-label="Next match"
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-soft hover:text-ink disabled:opacity-40"
              >
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </>
        )}
      </div>

      <ol className="flex flex-col gap-1">
        {chunks.map((chunk) => {
          const isActive = chunk.id === activeChunkId;
          const isMatch = matchIdSet.has(chunk.id);
          const isCurrentMatch = chunk.id === currentMatchId;
          return (
            <li
              key={chunk.id}
              data-chunk-id={chunk.id}
              className={cn(
                "flex gap-3 rounded-xl px-3 py-2.5 transition-colors",
                isActive
                  ? "bg-white shadow-[inset_3px_0_0_0_var(--color-rec)]"
                  : "hover:bg-white/60",
                trimmedQuery && !isMatch && "opacity-45",
                isCurrentMatch && "bg-white ring-1 ring-rec/40",
              )}
            >
              <SpeakerAvatar name={chunk.speaker} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-ink">
                    <HighlightedText
                      text={chunk.speaker ?? "Unknown"}
                      query={trimmedQuery}
                    />
                  </span>
                  {onSeek ? (
                    <button
                      type="button"
                      onClick={() => onSeek(chunk.startMs)}
                      className="font-mono text-[11px] tracking-wide text-ink-muted tabular-nums underline-offset-2 hover:text-ink hover:underline"
                    >
                      {formatTimestamp(chunk.startMs)}
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] tracking-wide text-ink-muted tabular-nums">
                      {formatTimestamp(chunk.startMs)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[14px] leading-relaxed text-ink-muted">
                  <HighlightedText text={chunk.text} query={trimmedQuery} />
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

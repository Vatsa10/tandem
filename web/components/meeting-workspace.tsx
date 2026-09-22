"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { ChatPanel } from "@/components/chat-panel";
import { MeetingNotes } from "@/components/meeting-notes";
import { TranscriptViewer, type TranscriptChunkItem } from "@/components/transcript-viewer";
import type {
  MeetingActionItem,
  MeetingHighlight,
} from "@/lib/db/schema";

const EXPORT_FORMATS = [
  { format: "txt", label: "TXT" },
  { format: "srt", label: "SRT" },
  { format: "pdf", label: "PDF" },
] as const;

type Tab = "notes" | "transcript" | "chat";

export function MeetingWorkspace({
  meetingId,
  chunks,
  videoUrl,
  audioUrl,
  summary,
  actionItems,
  highlights,
  status,
}: {
  meetingId: string;
  chunks: TranscriptChunkItem[];
  videoUrl: string | null;
  audioUrl: string | null;
  summary: string | null;
  actionItems: MeetingActionItem[] | null;
  highlights: MeetingHighlight[] | null;
  status: string;
}) {
  const hasNotes =
    Boolean(summary?.trim()) ||
    (actionItems?.length ?? 0) > 0 ||
    (highlights?.length ?? 0) > 0;

  const [tab, setTab] = useState<Tab>(hasNotes ? "notes" : "transcript");
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const hasRecording = Boolean(videoUrl || audioUrl);
  const canGenerate = status === "done" && chunks.length > 0;
  const canExport = chunks.length > 0;
  const [exportOpen, setExportOpen] = useState(false);

  function handleSeek(startMs: number) {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = startMs / 1000;
    void media.play();
  }

  function handleTimeUpdate() {
    const media = mediaRef.current;
    if (!media) return;
    const currentMs = media.currentTime * 1000;

    let current: TranscriptChunkItem | null = null;
    for (const chunk of chunks) {
      if (chunk.startMs > currentMs) break;
      current = chunk;
    }
    setActiveChunkId(current?.id ?? null);
  }

  useEffect(() => {
    if (!activeChunkId) return;
    transcriptRef.current
      ?.querySelector(`[data-chunk-id="${activeChunkId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeChunkId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "notes", label: "Notes" },
    { id: "transcript", label: "Transcript" },
    { id: "chat", label: "Ask Tandem" },
  ];

  return (
    <div
      className={`grid min-h-0 flex-1 gap-5 ${
        hasRecording
          ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] lg:grid-rows-1"
          : ""
      }`}
    >
      {hasRecording && (
        <div className="relative flex min-h-[240px] min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-ink/80 bg-ink shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.06)] lg:min-h-0">
          <div className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/90 uppercase backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-rec" />
            Playback
          </div>
          {videoUrl ? (
            <video
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={videoUrl}
              controls
              preload="metadata"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              className="h-full max-h-[min(56vh,720px)] w-full bg-ink object-contain lg:max-h-none"
            />
          ) : (
            audioUrl && (
              <div className="w-full p-5">
                <AudioPlayer
                  src={audioUrl}
                  mediaRefCallback={(el) => {
                    mediaRef.current = el;
                  }}
                  onTimeUpdate={handleTimeUpdate}
                />
              </div>
            )
          )}
        </div>
      )}

      <div className="surface-panel flex min-h-[min(50vh,420px)] min-w-0 flex-col overflow-hidden lg:min-h-0">
        <div className="flex shrink-0 items-center justify-between gap-1 border-b border-line px-3 pt-3">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-paper text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-rec" />
                )}
              </button>
            ))}
          </div>

          {canExport && (
            <div className="relative mb-2 shrink-0">
              <button
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                Export
              </button>
              {exportOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close export menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setExportOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1.5 w-32 overflow-hidden rounded-lg border border-line bg-card shadow-lg">
                    {EXPORT_FORMATS.map(({ format, label }) => (
                      <a
                        key={format}
                        href={`/api/meetings/${meetingId}/export?format=${format}`}
                        onClick={() => setExportOpen(false)}
                        className="block px-3 py-2 text-[13px] text-ink transition-colors hover:bg-paper-soft"
                      >
                        {label}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 bg-paper/50 p-4">
          {tab === "notes" ? (
            <div className="h-full min-h-0 overflow-hidden">
              <MeetingNotes
                meetingId={meetingId}
                summary={summary}
                actionItems={actionItems}
                highlights={highlights}
                onSeek={hasRecording ? handleSeek : undefined}
                canGenerate={canGenerate}
              />
            </div>
          ) : tab === "transcript" ? (
            <div ref={transcriptRef} className="h-full min-h-0">
              <TranscriptViewer
                chunks={chunks}
                onSeek={hasRecording ? handleSeek : undefined}
                activeChunkId={activeChunkId}
                className="h-full max-h-[min(50vh,420px)] border-0 bg-transparent lg:max-h-none"
              />
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-y-auto">
              <ChatPanel meetingId={meetingId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

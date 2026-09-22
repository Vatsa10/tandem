"use client";

import {
  ArrowRight,
  AudioLines,
  Mic,
  MicOff,
  NotebookPen,
  Video,
  VideoOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface JoinedMeeting {
  id: string;
  status: string;
  platform: string | null;
  meetingUrl: string;
}

export function JoinMeetingForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [meetingUrl, setMeetingUrl] = useState("");
  // 'notetaker' records and answers afterwards; 'live' also speaks up in
  // the call. Defaulting to notetaker keeps the quiet behaviour the
  // obvious one — joining a call to talk is the deliberate choice.
  const [mode, setMode] = useState<"notetaker" | "live">("notetaker");
  const [recordVideo, setRecordVideo] = useState(true);
  const [recordAudio, setRecordAudio] = useState(true);
  const [status, setStatus] = useState<"idle" | "joining" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [existingMeetingId, setExistingMeetingId] = useState<string | null>(
    null,
  );
  const [joined, setJoined] = useState<JoinedMeeting | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("joining");
    setError(null);
    setExistingMeetingId(null);
    setJoined(null);

    const res = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingUrl, mode, recordVideo, recordAudio }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error ?? `Request failed (${res.status})`);
      if (res.status === 409 && body.meetingId) {
        setExistingMeetingId(body.meetingId);
      }
      setStatus("error");
      return;
    }

    setJoined(body.meeting);
    setStatus("idle");
    setMeetingUrl("");
    router.refresh();
  }

  const toggles = (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setMode("notetaker")}
        disabled={status === "joining"}
        aria-pressed={mode === "notetaker"}
        title="Tandem records and answers afterwards"
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase transition-colors disabled:opacity-50 ${
          mode === "notetaker"
            ? "border-ink/25 bg-ink/5 text-ink"
            : "border-line text-ink-muted"
        }`}
      >
        <NotebookPen className="h-3 w-3" strokeWidth={1.75} />
        Take notes
      </button>
      <button
        type="button"
        onClick={() => setMode("live")}
        disabled={status === "joining"}
        aria-pressed={mode === "live"}
        title="Tandem also speaks up during the call"
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase transition-colors disabled:opacity-50 ${
          mode === "live"
            ? "border-ink/25 bg-ink/5 text-ink"
            : "border-line text-ink-muted"
        }`}
      >
        <AudioLines className="h-3 w-3" strokeWidth={1.75} />
        Join in
      </button>
      <span className="mx-1 h-4 w-px bg-line" aria-hidden />
      <button
        type="button"
        onClick={() => setRecordVideo((v) => !v)}
        disabled={status === "joining"}
        aria-pressed={recordVideo}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase transition-colors disabled:opacity-50 ${
          recordVideo
            ? "border-ink/25 bg-ink/5 text-ink"
            : "border-line text-ink-muted"
        }`}
      >
        {recordVideo ? (
          <Video className="h-3 w-3" strokeWidth={1.75} />
        ) : (
          <VideoOff className="h-3 w-3" strokeWidth={1.75} />
        )}
        Video
      </button>
      <button
        type="button"
        onClick={() => setRecordAudio((v) => !v)}
        disabled={status === "joining"}
        aria-pressed={recordAudio}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase transition-colors disabled:opacity-50 ${
          recordAudio
            ? "border-ink/25 bg-ink/5 text-ink"
            : "border-line text-ink-muted"
        }`}
      >
        {recordAudio ? (
          <Mic className="h-3 w-3" strokeWidth={1.75} />
        ) : (
          <MicOff className="h-3 w-3" strokeWidth={1.75} />
        )}
        Audio
      </button>
    </div>
  );

  const feedback = (
    <>
      {error && (
        <p className="font-mono text-[12px] text-rec">
          {error}
          {existingMeetingId && (
            <>
              {" "}
              <Link
                href={`/meetings/${existingMeetingId}`}
                className="underline underline-offset-2"
              >
                view meeting
              </Link>
            </>
          )}
        </p>
      )}
      {joined && (
        <p className="font-mono text-[12px] text-moss">
          Tandem is joining {joined.platform ?? "the call"} ·{" "}
          <Link
            href={`/meetings/${joined.id}`}
            className="underline underline-offset-2"
          >
            open meeting
          </Link>
        </p>
      )}
    </>
  );

  if (compact) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="url"
            required
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="Paste a Zoom, Meet, or Teams link..."
            disabled={status === "joining"}
            className="w-full sm:w-72"
          />
          <button
            type="submit"
            disabled={status === "joining"}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
          >
            {status === "joining" ? "Joining…" : "Join"}
            {status !== "joining" && (
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </form>
        {toggles}
        {feedback}
      </div>
    );
  }

  return (
    <div className="surface-panel relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-rec/10 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-label">Dispatch</p>
            <p className="mt-1.5 font-display text-xl font-semibold tracking-tight text-ink">
              Send Tandem into a call
            </p>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              Paste a meeting link — it joins, records, and captures the
              transcript.
            </p>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-rec/20 bg-rec/8 px-3 py-1.5 font-mono text-[11px] tracking-wider text-rec uppercase sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-rec" />
            Ready
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Input
            type="url"
            required
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://meet.google.com/… or Zoom / Teams link"
            disabled={status === "joining"}
            className="w-full flex-1 bg-white/70"
          />
          <button
            type="submit"
            disabled={status === "joining"}
            className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-rec px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rec-dark disabled:opacity-50"
          >
            {status === "joining" ? "Joining…" : "Join now"}
            {status !== "joining" && (
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {toggles}
          <div className="min-h-[1rem]">{feedback}</div>
        </div>
      </div>
    </div>
  );
}

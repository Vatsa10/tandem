"use client";

import { Download, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useRef, useState } from "react";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;
const SKIP_SECONDS = 10;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  mediaRefCallback,
  onTimeUpdate,
}: {
  src: string;
  /** Also hands the element to the caller — e.g. MeetingWorkspace's shared mediaRef, so transcript timestamp clicks can keep seeking it. */
  mediaRefCallback: (el: HTMLAudioElement | null) => void;
  onTimeUpdate?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  // Non-null while the user is dragging the seek thumb — playback time
  // updates are ignored until the scrub commits, so the slider doesn't
  // fight the user's finger.
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const canSeek = Number.isFinite(duration) && duration > 0;
  const shownTime = scrubTime ?? currentTime;
  const progressPct = canSeek
    ? Math.min(100, Math.max(0, (shownTime / duration) * 100))
    : 0;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function skip(deltaSeconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(
      Math.max(audio.currentTime + deltaSeconds, 0),
      duration || audio.currentTime + deltaSeconds,
    );
  }

  function cycleSpeed() {
    const audio = audioRef.current;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audio) audio.playbackRate = next;
  }

  function commitScrub(value: number) {
    const audio = audioRef.current;
    const clamped = Math.min(Math.max(value, 0), duration || value);
    if (audio) audio.currentTime = clamped;
    setCurrentTime(clamped);
    setScrubTime(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-card px-4 py-3">
      <audio
        ref={(el) => {
          audioRef.current = el;
          mediaRefCallback(el);
        }}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
          onTimeUpdate?.();
        }}
      />

      {/* Seek */}
      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 font-mono text-[12px] text-ink-muted tabular-nums">
          {formatTime(shownTime)}
        </span>
        <input
          type="range"
          min={0}
          max={canSeek ? duration : 0}
          step={0.1}
          value={shownTime}
          disabled={!canSeek}
          aria-label="Seek recording"
          onChange={(e) => setScrubTime(Number(e.target.value))}
          onPointerUp={() => {
            if (scrubTime !== null) commitScrub(scrubTime);
          }}
          onKeyUp={() => {
            if (scrubTime !== null) commitScrub(scrubTime);
          }}
          onBlur={() => {
            if (scrubTime !== null) commitScrub(scrubTime);
          }}
          className="seek-slider min-w-0 flex-1"
          style={{
            background: `linear-gradient(to right, var(--color-ink) ${progressPct}%, var(--color-line) ${progressPct}%)`,
          }}
        />
        <span className="w-10 shrink-0 text-right font-mono text-[12px] text-ink-muted tabular-nums">
          {formatTime(duration)}
        </span>
      </div>

      {/* Transport */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}x — tap to change`}
          className="rounded-full border border-line px-2 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
        >
          {speed}×
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => skip(-SKIP_SECONDS)}
            aria-label={`Back ${SKIP_SECONDS} seconds`}
            className="text-ink-muted transition-colors hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-colors hover:bg-ink/85"
          >
            {playing ? (
              <Pause className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play className="ml-0.5 h-4 w-4" fill="currentColor" strokeWidth={0} />
            )}
          </button>
          <button
            type="button"
            onClick={() => skip(SKIP_SECONDS)}
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
            className="text-ink-muted transition-colors hover:text-ink"
          >
            <RotateCw className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <a
          href={src}
          download
          target="_blank"
          rel="noreferrer"
          aria-label="Download recording"
          className="shrink-0 text-ink-muted transition-colors hover:text-ink"
        >
          <Download className="h-4 w-4" strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}

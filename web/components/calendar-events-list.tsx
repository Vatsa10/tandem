"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CategorySelect } from "@/components/category-select";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/toaster";
import { formatMeetingWhen } from "@/lib/format-date";
import { useCategories } from "@/lib/hooks/use-categories";

interface CalendarEvent {
  id: string;
  ical_uid: string;
  start_time: string;
  end_time: string;
  meeting_url?: string | null;
  title: string | null;
  bots?: { bot_id: string }[];
  is_deleted: boolean;
  provider: string;
  accountEmail: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  microsoft_outlook: "Outlook",
};

function CalendarEventsListContent({
  hasConnections,
}: {
  hasConnections: boolean;
}) {
  const searchParams = useSearchParams();
  const connectError = searchParams.get("error");
  const justConnected = searchParams.get("connected");

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!hasConnections);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [recordErrors, setRecordErrors] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<
    Record<string, string | null>
  >({});
  const [videoPrefs, setVideoPrefs] = useState<Record<string, boolean>>({});
  const [audioPrefs, setAudioPrefs] = useState<Record<string, boolean>>({});
  const { categories } = useCategories();
  const { toast } = useToast();

  // Derived, not synced via effect: if a selection points at a category
  // deleted (elsewhere) since it was picked, treat it as unset rather
  // than submitting a category id that no longer exists.
  function selectedCategoryFor(eventId: string): string | null {
    const id = selectedCategory[eventId];
    return id && categories.some((c) => c.id === id) ? id : null;
  }

  useEffect(() => {
    if (!hasConnections) return;
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/calendar/events");
      if (cancelled) return;
      if (res.status === 404) {
        setLoaded(true);
        return;
      }
      if (!res.ok) {
        setLoadError(`Failed to load events (${res.status})`);
        setLoaded(true);
        return;
      }
      const body = await res.json();
      setEvents((body.events as CalendarEvent[]).filter((e) => !e.is_deleted));
      setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hasConnections]);

  async function handleRecord(event: CalendarEvent) {
    setSchedulingId(event.id);
    setRecordErrors((prev) => {
      const next = { ...prev };
      delete next[event.id];
      return next;
    });

    let res: Response;
    try {
      res = await fetch(`/api/calendar/events/${event.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icalUid: event.ical_uid,
          categoryId: selectedCategoryFor(event.id),
          recordVideo: videoPrefs[event.id] ?? true,
          recordAudio: audioPrefs[event.id] ?? true,
        }),
      });
    } catch {
      setSchedulingId(null);
      setRecordErrors((prev) => ({
        ...prev,
        [event.id]: "Network error — could not reach the server.",
      }));
      return;
    }
    setSchedulingId(null);

    if (res.ok) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, bots: [{ bot_id: "pending" }] } : e,
        ),
      );
      toast({
        title: "Tandem will join this meeting",
        description: "Bot scheduled — she'll record and transcribe the call.",
        tone: "success",
      });
      return;
    }

    const body = await res.json().catch(() => ({}));
    setRecordErrors((prev) => ({
      ...prev,
      [event.id]: body.error ?? `Request failed (${res.status})`,
    }));
  }

  return (
    <div className="flex flex-col gap-3">
      {connectError && (
        <p className="font-mono text-[12px] text-rec">{connectError}</p>
      )}
      {justConnected && (
        <p className="font-mono text-[12px] text-moss">
          {justConnected === "google" ? "Google" : "Outlook"} Calendar
          connected.
        </p>
      )}
      {loadError && <p className="font-mono text-[12px] text-rec">{loadError}</p>}

      {!loaded ? (
        <p className="font-mono text-[12px] text-ink-muted">Loading…</p>
      ) : events.length === 0 ? (
        <EmptyState>
          {hasConnections
            ? "No upcoming meetings found."
            : "Connect a calendar above to see upcoming meetings here."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-line/90 bg-card/80 p-4 transition-colors hover:border-ink/20 hover:bg-white"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
                    {event.title ?? "Untitled meeting"}
                  </p>
                  <p
                    className="mt-1 truncate font-mono text-[11px] tracking-wide text-ink-muted uppercase"
                    suppressHydrationWarning
                  >
                    {formatMeetingWhen(event.start_time)} ·{" "}
                    {event.accountEmail ??
                      PROVIDER_LABELS[event.provider] ??
                      event.provider}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {!event.bots?.length && (
                    <>
                      <CategorySelect
                        // Remount when the category list changes (created/
                        // deleted elsewhere) — CategorySelect mirrors
                        // `categories` into local state on mount only.
                        key={categories.length}
                        mode="controlled"
                        categories={categories}
                        value={selectedCategoryFor(event.id)}
                        onChange={(categoryId) =>
                          setSelectedCategory((prev) => ({
                            ...prev,
                            [event.id]: categoryId,
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVideoPrefs((prev) => ({
                            ...prev,
                            [event.id]: !(prev[event.id] ?? true),
                          }))
                        }
                        aria-pressed={videoPrefs[event.id] ?? true}
                        aria-label="Toggle video recording"
                        className={`rounded-full border p-1.5 transition-colors ${
                          (videoPrefs[event.id] ?? true)
                            ? "border-ink/30 text-ink"
                            : "border-line text-ink-muted"
                        }`}
                      >
                        {(videoPrefs[event.id] ?? true) ? (
                          <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                          <VideoOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAudioPrefs((prev) => ({
                            ...prev,
                            [event.id]: !(prev[event.id] ?? true),
                          }))
                        }
                        aria-pressed={audioPrefs[event.id] ?? true}
                        aria-label="Toggle audio recording"
                        className={`rounded-full border p-1.5 transition-colors ${
                          (audioPrefs[event.id] ?? true)
                            ? "border-ink/30 text-ink"
                            : "border-line text-ink-muted"
                        }`}
                      >
                        {(audioPrefs[event.id] ?? true) ? (
                          <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                          <MicOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleRecord(event)}
                    disabled={
                      !event.meeting_url ||
                      !!event.bots?.length ||
                      schedulingId === event.id
                    }
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                      event.bots?.length
                        ? "border border-rec/25 bg-rec/8 text-rec"
                        : "bg-ink text-paper hover:bg-ink/85"
                    }`}
                  >
                    {event.bots?.length
                      ? "Recording"
                      : schedulingId === event.id
                        ? "Scheduling…"
                        : "Record"}
                  </button>
                </div>
              </div>
              {recordErrors[event.id] && (
                <p className="font-mono text-[12px] text-rec">
                  {recordErrors[event.id]}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CalendarEventsList({
  hasConnections,
}: {
  hasConnections: boolean;
}) {
  return (
    <Suspense
      fallback={
        <p className="font-mono text-[12px] text-ink-muted">Loading…</p>
      }
    >
      <CalendarEventsListContent hasConnections={hasConnections} />
    </Suspense>
  );
}

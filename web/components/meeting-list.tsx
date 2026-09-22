"use client";

import { CheckSquare, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategorySelect } from "@/components/category-select";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/components/ui/toaster";
import { formatMeetingWhen } from "@/lib/format-date";

export interface MeetingListItem {
  id: string;
  title: string | null;
  platform: string | null;
  meetingUrl: string;
  status: string;
  scheduledStart: Date | null;
  startedAt: Date | null;
  categoryId: string | null;
  summary: string | null;
  actionItemCount: number;
}

interface Category {
  id: string;
  name: string;
}

export function platformLabel(platform: string | null): string {
  if (!platform) return "Unknown";
  if (platform === "google_meet") return "Meet";
  if (platform === "microsoft_teams" || platform === "teams") return "Teams";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function railTone(status: string): string {
  if (status === "done") return "bg-moss";
  if (status.startsWith("fatal")) return "bg-rec";
  if (status === "in_call_recording") return "bg-rec";
  return "bg-ink-muted/40";
}

export function MeetingList({
  meetings,
  categories,
  emptyLabel,
}: {
  meetings: MeetingListItem[];
  categories: Category[];
  emptyLabel: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Meeting removed", tone: "success" });
        router.refresh();
      } else {
        toast({
          title: "Couldn't remove the meeting",
          description: `Request failed (${res.status}) — try again.`,
          tone: "error",
        });
      }
    } catch {
      toast({
        title: "Couldn't remove the meeting",
        description: "Network error — check your connection and try again.",
        tone: "error",
      });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (meetings.length === 0) {
    if (!emptyLabel) return null;
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {meetings.map((meeting) => (
        <li
          key={meeting.id}
          className="group relative flex overflow-hidden rounded-2xl border border-line/90 bg-card/80 transition-all hover:border-ink/20 hover:bg-white hover:shadow-[0_8px_30px_-18px_rgb(21_23_29_/_0.35)]"
        >
          <span
            aria-hidden
            className={`w-1 shrink-0 ${railTone(meeting.status)}`}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href={`/meetings/${meeting.id}`}
              className="min-w-0 flex-1"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
                  {meeting.title ?? meeting.meetingUrl}
                </span>
                <StatusBadge status={meeting.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tracking-wide text-ink-muted uppercase">
                <span suppressHydrationWarning>
                  {formatMeetingWhen(
                    meeting.startedAt ?? meeting.scheduledStart,
                  )}
                </span>
                <span className="text-line">·</span>
                <span>{platformLabel(meeting.platform)}</span>
                {meeting.actionItemCount > 0 && (
                  <>
                    <span className="text-line">·</span>
                    <span className="inline-flex items-center gap-1 normal-case tracking-normal text-moss">
                      <CheckSquare className="h-3 w-3" strokeWidth={2} />
                      {meeting.actionItemCount} action
                      {meeting.actionItemCount === 1 ? "" : "s"}
                    </span>
                  </>
                )}
              </div>
              {meeting.summary && (
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
                  {meeting.summary}
                </p>
              )}
            </Link>

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
              <CategorySelect
                key={`${meeting.categoryId ?? "none"}:${categories.length}`}
                mode="bound"
                meetingId={meeting.id}
                initialCategoryId={meeting.categoryId}
                categories={categories}
              />

              <Link
                href={`/meetings/${meeting.id}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors group-hover:bg-paper-soft group-hover:text-ink"
                aria-label="Open meeting"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>

              {confirmDeleteId === meeting.id ? (
                <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    disabled={deletingId === meeting.id}
                    onClick={() => handleDelete(meeting.id)}
                    className="text-rec underline underline-offset-2 disabled:opacity-50"
                  >
                    {deletingId === meeting.id ? "Removing…" : "Remove"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === meeting.id}
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-ink-muted disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(meeting.id)}
                  aria-label="Remove meeting"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted/50 transition-colors hover:bg-rec/8 hover:text-rec"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

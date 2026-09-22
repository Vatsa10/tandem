import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategorySelect } from "@/components/category-select";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import {
  categories,
  meetings,
  participants,
  transcriptChunks,
} from "@/lib/db/schema";
import { retrieveBot } from "@/lib/recall/client";

// Transcript/participants/recording-url state changes via webhooks —
// must not be frozen at build time.
export const dynamic = "force-dynamic";

function formatDuration(startedAt: Date | null, endedAt: Date | null): string | null {
  if (!startedAt || !endedAt) return null;
  const totalMinutes = Math.max(
    0,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 60000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function platformLabel(platform: string | null): string {
  if (!platform) return "unknown platform";
  if (platform === "google_meet") return "Google Meet";
  if (platform === "microsoft_teams" || platform === "teams") {
    return "Microsoft Teams";
  }
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export default async function MeetingDetailPage({
  params,
}: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));

  if (!meeting || meeting.userId !== userId) {
    notFound();
  }

  const [meetingParticipants, chunks, userCategories] = await Promise.all([
    db
      .select()
      .from(participants)
      .where(eq(participants.meetingId, meeting.id)),
    db
      .select()
      .from(transcriptChunks)
      .where(eq(transcriptChunks.meetingId, meeting.id))
      .orderBy(asc(transcriptChunks.startMs)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId)),
  ]);

  // Recall's recording URLs are signed/expiring — re-fetch fresh ones for a
  // completed meeting rather than trusting whatever was stored at webhook
  // time, falling back to the stored value if Recall is unreachable.
  let recordingVideoUrl = meeting.recordingVideoUrl;
  let recordingAudioUrl = meeting.recordingAudioUrl;

  if (meeting.status === "done") {
    try {
      const bot = await retrieveBot(meeting.recallBotId);
      const shortcuts = bot.recordings?.[0]?.media_shortcuts;
      recordingVideoUrl =
        shortcuts?.video_mixed?.data?.download_url ?? recordingVideoUrl;
      recordingAudioUrl =
        shortcuts?.audio_mixed?.data?.download_url ?? recordingAudioUrl;
    } catch {
      // fall back to the possibly-stale stored URLs
    }
  }

  const duration = formatDuration(meeting.startedAt, meeting.endedAt);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex shrink-0 flex-col gap-4">
        <Link
          href="/meetings"
          className="inline-flex w-fit items-center gap-1.5 font-mono text-[12px] tracking-wide text-ink-muted uppercase transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          All meetings
        </Link>

        <div className="surface-panel flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={meeting.status} />
                <span className="font-mono text-[11px] tracking-wide text-ink-muted uppercase">
                  {platformLabel(meeting.platform)}
                  {duration ? ` · ${duration}` : ""}
                </span>
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight break-words text-ink sm:text-3xl">
                {meeting.title ?? meeting.meetingUrl}
              </h1>
              <div className="mt-3">
                <CategorySelect
                  mode="bound"
                  meetingId={meeting.id}
                  initialCategoryId={meeting.categoryId}
                  categories={userCategories}
                />
              </div>
            </div>

            {meetingParticipants.length > 0 && (
              <div className="min-w-0">
                <p className="section-label mb-2">Participants</p>
                <ul className="flex max-w-md flex-wrap justify-start gap-1.5 sm:justify-end">
                  {meetingParticipants.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-full border border-line bg-paper/80 px-2.5 py-1 text-[13px] text-ink"
                    >
                      {p.name ?? p.email ?? "Unknown"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <MeetingWorkspace
        meetingId={meeting.id}
        chunks={chunks}
        videoUrl={recordingVideoUrl}
        audioUrl={recordingAudioUrl}
        summary={meeting.summary}
        actionItems={meeting.actionItems}
        highlights={meeting.highlights}
        status={meeting.status}
      />
    </div>
  );
}

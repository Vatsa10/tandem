import { desc, eq } from "drizzle-orm";
import { JoinMeetingForm } from "@/components/join-meeting-form";
import { MeetingsBrowser } from "@/components/meetings-browser";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { categories, meetings } from "@/lib/db/schema";

// Meeting statuses change via webhooks between requests — must not be
// frozen at build time.
export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const userId = await getCurrentUserId();

  const [allMeetings, userCategories] = await Promise.all([
    db
      .select({
        id: meetings.id,
        title: meetings.title,
        platform: meetings.platform,
        meetingUrl: meetings.meetingUrl,
        status: meetings.status,
        scheduledStart: meetings.scheduledStart,
        startedAt: meetings.startedAt,
        createdAt: meetings.createdAt,
        categoryId: meetings.categoryId,
        summary: meetings.summary,
        actionItems: meetings.actionItems,
      })
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(desc(meetings.createdAt)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId)),
  ]);

  const listMeetings = allMeetings.map(({ actionItems, ...m }) => ({
    ...m,
    actionItemCount: actionItems?.length ?? 0,
  }));

  const activeCount = listMeetings.filter(
    (m) => m.status !== "done" && !m.status.startsWith("fatal"),
  ).length;
  const capturedCount = listMeetings.filter((m) => m.status === "done").length;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <PageHeader
        eyebrow="Studio"
        title="Meetings"
        description={
          <span className="font-mono text-[13px] tracking-wide">
            {listMeetings.length} total
            <span className="mx-2 text-line">·</span>
            {activeCount} active
            <span className="mx-2 text-line">·</span>
            {capturedCount} captured
          </span>
        }
      />

      <JoinMeetingForm />

      <MeetingsBrowser meetings={listMeetings} categories={userCategories} />
    </div>
  );
}

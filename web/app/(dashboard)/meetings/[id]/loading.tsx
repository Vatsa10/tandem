import { Skeleton } from "@/components/ui/skeleton";

export default function MeetingDetailLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <span className="sr-only">Loading meeting…</span>

      {/* Back link */}
      <Skeleton className="h-3 w-24 shrink-0" />

      {/* Header panel */}
      <div className="surface-panel flex shrink-0 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>

      {/* Workspace: media + tabbed panel */}
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <Skeleton className="min-h-[240px] rounded-2xl bg-ink/70 lg:min-h-0" />
        <div className="surface-panel flex min-h-0 flex-col gap-2 p-3">
          <div className="flex gap-1 px-1 pt-1">
            <Skeleton className="h-9 w-20 rounded-t-lg" />
            <Skeleton className="h-9 w-24 rounded-t-lg" />
            <Skeleton className="h-9 w-20 rounded-t-lg" />
          </div>
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

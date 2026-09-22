import { Skeleton } from "@/components/ui/skeleton";

export default function MeetingsLoading() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <span className="sr-only">Loading meetings…</span>

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      {/* Dispatch panel */}
      <div className="surface-panel p-5 sm:p-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-6 w-56 max-w-full" />
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      {/* Search */}
      <Skeleton className="h-10 max-w-sm rounded-full" />

      {/* List sections */}
      {["upcoming", "past"].map((section) => (
        <section key={section} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-6" />
          </div>
          <Skeleton className="h-[76px] w-full rounded-2xl" />
          <Skeleton className="h-[76px] w-full rounded-2xl" />
        </section>
      ))}
    </div>
  );
}

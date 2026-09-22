import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarSettingsLoading() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <span className="sr-only">Loading calendar settings…</span>

      {/* Page header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Provider cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>

      {/* Upcoming events */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </section>
    </div>
  );
}

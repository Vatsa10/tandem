import { cn } from "@/lib/utils";

export function EmptyState({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line/90 bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-soft text-ink-muted">
          {icon}
        </div>
      )}
      <div className="max-w-sm text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </div>
  );
}

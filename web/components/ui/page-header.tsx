import { cn } from "@/lib/utils";

function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-6",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="section-label mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-[2.5rem] sm:leading-[1.1]">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            {description}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}

export { PageHeader };

import { cn } from "@/lib/utils";

// Polymorphic tag (div/li) — props are intentionally untyped against the
// specific element since callers only ever pass shared attributes
// (className, onClick, children, ...) that are valid on both.
function Card({
  className,
  as: Tag = "div",
  ...props
}: { as?: "div" | "li" } & Record<string, unknown>) {
  return (
    <Tag
      data-slot="card"
      className={cn("rounded-xl border border-line bg-card", className as string)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex items-center justify-between gap-4", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-title"
      className={cn("text-sm font-medium text-ink", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle };

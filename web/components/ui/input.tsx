import { cn } from "@/lib/utils";

const variantClasses = {
  pill: "rounded-full px-4 py-2.5",
  box: "rounded-lg px-2.5 py-1.5",
};

function Input({
  className,
  variant = "pill",
  ...props
}: React.ComponentProps<"input"> & { variant?: keyof typeof variantClasses }) {
  return (
    <input
      data-slot="input"
      className={cn(
        "border border-line bg-card text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink/30 disabled:opacity-50",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Input };

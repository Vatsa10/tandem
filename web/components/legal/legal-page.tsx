import Link from "next/link";

/** Shared chrome for standalone legal pages (Terms, Privacy) — no dashboard
 * nav, no marketing sections, just brand header + prose content. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-paper text-ink">
      <header className="border-b border-line/80">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="rec-pulse h-2.5 w-2.5 rounded-full bg-rec" />
            <span className="font-brand text-2xl font-medium tracking-wide text-ink">
              Tandem
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="section-label mb-2">Legal</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 font-mono text-[12px] tracking-wide text-ink-muted uppercase">
          Last updated {updated}
        </p>

        <div
          className="legal-prose mt-10 max-w-none text-[15px] leading-relaxed text-ink
          [&_h2]:font-display [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink
          [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink
          [&_p]:mb-4 [&_p]:text-ink-muted
          [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-ink-muted
          [&_li]:pl-1
          [&_strong]:font-semibold [&_strong]:text-ink
          [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-rec
          [&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[14px]
          [&_th]:border-b [&_th]:border-line [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink
          [&_td]:border-b [&_td]:border-line/60 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_td]:text-ink-muted"
        >
          {children}
        </div>
      </main>
    </div>
  );
}

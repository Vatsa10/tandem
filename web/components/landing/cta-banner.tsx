import Link from "next/link";
import { Reveal } from "./reveal";

export function CtaBanner() {
  return (
    <section className="px-6 py-24">
      <Reveal>
        <div className="mx-auto max-w-6xl rounded-3xl bg-[#15171D] px-8 py-16 text-center sm:px-16">
          <p className="mb-4 flex items-center justify-center gap-2 font-mono text-[13px] uppercase tracking-wider text-[#8A8D97]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF3B2F]" />
            free to start
          </p>
          <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[#F1EEE4] sm:text-5xl">
            Stop losing meetings to memory.
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-full bg-[#FF3B2F] px-7 py-3.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5 hover:bg-[#E6291D]"
            >
              Get started free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-[#F1EEE4] transition-colors hover:border-white/40"
            >
              Sign in
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

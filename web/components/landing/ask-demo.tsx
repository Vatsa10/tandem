import { Reveal } from "./reveal";

export function AskDemo() {
  return (
    <section id="ask" className="px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <p className="mb-3 font-mono text-[13px] uppercase tracking-wider text-[#5B5D66]">
            your meetings, searchable
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[#15171D] sm:text-5xl">
            Ask across every call you&apos;ve ever had.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#5B5D66]">
            Not just the transcript from last Tuesday — everything. Tandem
            searches across your entire meeting history to answer, and always
            tells you which call and which moment the answer came from.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="rounded-2xl border border-[#DDD6C7] bg-white p-2 shadow-[0_20px_50px_-24px_rgba(21,23,29,0.35)]">
            <div className="flex items-center gap-2 border-b border-[#DDD6C7] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#1F6F54]" />
              <span className="font-mono text-[11px] uppercase tracking-wide text-[#5B5D66]">
                Ask Tandem
              </span>
            </div>

            <div className="space-y-4 px-4 py-5">
              <div className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl bg-[#15171D] px-4 py-2.5 text-[14px] text-[#F1EEE4]">
                  Did we ever agree on a budget for the Q3 offsite?
                </span>
              </div>

              <div className="max-w-[90%] rounded-2xl bg-[#F1EEE4] px-4 py-3 text-[14px] leading-relaxed text-[#15171D]">
                Yes — in your planning call, Sam proposed{" "}
                <span className="font-medium">$18,000</span> and Priya
                confirmed it.
                <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-[#5B5D66]">
                  <span className="rounded-full border border-[#DDD6C7] px-2 py-0.5">
                    Jul 14 · 32:10
                  </span>
                  <span>Q3 Planning Sync</span>
                </div>
              </div>

              <div className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl bg-[#15171D] px-4 py-2.5 text-[14px] text-[#F1EEE4]">
                  Has that changed since?
                </span>
              </div>

              <div className="max-w-[90%] rounded-2xl bg-[#F1EEE4] px-4 py-3 text-[14px] leading-relaxed text-[#15171D]">
                No — it hasn&apos;t come up again in any call since.
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

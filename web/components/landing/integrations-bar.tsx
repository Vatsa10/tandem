import { Reveal } from "./reveal";

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams"];

export function IntegrationsBar() {
  return (
    <section className="border-y border-[#DDD6C7] bg-[#EBE7DA]/60 px-6 py-6">
      <Reveal>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <span className="font-mono text-[12px] uppercase tracking-wider text-[#5B5D66]">
            Joins as a guest on
          </span>
          {PLATFORMS.map((platform) => (
            <span
              key={platform}
              className="font-[family-name:var(--font-display)] text-base font-medium text-[#15171D]"
            >
              {platform}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

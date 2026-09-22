import { Reveal, RevealGroup, RevealItem } from "./reveal";

const STEPS = [
  {
    time: "T+0:00",
    title: "Invite Tandem",
    body: "Drop the meeting link in, or connect your calendar once — she joins Zoom, Meet, or Teams like any other guest.",
  },
  {
    time: "while it's on",
    title: "She listens",
    body: "Every word is attributed to a speaker and timestamped to the second, live, as the meeting happens.",
  },
  {
    time: "any time after",
    title: "Ask her anything",
    body: "“What did we decide on pricing?” She answers, and points you back to the exact moment it was said.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="mb-3 font-mono text-[13px] uppercase tracking-wider text-[#5B5D66]">
            the lifecycle of a meeting
          </p>
          <h2 className="max-w-xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[#15171D] sm:text-5xl">
            One bot, three moments.
          </h2>
        </Reveal>

        <RevealGroup className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          <div
            aria-hidden
            className="absolute top-[9px] right-0 left-0 hidden h-px bg-[#DDD6C7] md:block"
          />
          {STEPS.map((step) => (
            <RevealItem key={step.time} className="relative">
              <div className="mb-5 flex items-center gap-3">
                <span className="relative z-10 h-[9px] w-[9px] shrink-0 rounded-full bg-[#FF3B2F] ring-4 ring-[#F1EEE4]" />
                <span className="font-mono text-[12px] uppercase tracking-wider text-[#5B5D66]">
                  {step.time}
                </span>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#15171D]">
                {step.title}
              </h3>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#5B5D66]">
                {step.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

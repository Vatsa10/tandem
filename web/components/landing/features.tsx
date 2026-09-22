import { AudioLines, MessagesSquare, CalendarClock, Quote, Video, Lock } from "lucide-react";
import { RevealGroup, RevealItem } from "./reveal";

const FEATURES = [
  {
    icon: AudioLines,
    title: "Speaker-attributed, to the second",
    body: "Every line is tagged to who said it and stamped to the second it was said.",
  },
  {
    icon: MessagesSquare,
    title: "One thread, every meeting",
    body: "Ask about a single call, or let her search your whole history at once.",
  },
  {
    icon: CalendarClock,
    title: "Shows up on its own",
    body: "Connect your calendar once and she joins everything on it — no invite required twice.",
  },
  {
    icon: Quote,
    title: "Every answer, sourced",
    body: "She never just tells you — she points back to the transcript moment it came from.",
  },
  {
    icon: Video,
    title: "Audio and video, kept",
    body: "Recordings are stored alongside the transcript, so you can always go back to the source.",
  },
  {
    icon: Lock,
    title: "Yours alone",
    body: "Your meetings are tied to your account only. Nobody else's Tandem can see them.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-[#DDD6C7] bg-[#EBE7DA]/40 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <RevealGroup>
          <RevealItem>
            <p className="mb-3 font-mono text-[13px] uppercase tracking-wider text-[#5B5D66]">
              what she keeps track of
            </p>
            <h2 className="max-w-xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[#15171D] sm:text-5xl">
              Every detail, minus the effort.
            </h2>
          </RevealItem>
        </RevealGroup>

        <RevealGroup className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-[#DDD6C7] bg-[#DDD6C7] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <RevealItem
              key={title}
              className="flex flex-col gap-4 bg-[#F8F6EF] p-7"
            >
              <Icon className="h-5 w-5 text-[#FF3B2F]" strokeWidth={1.75} />
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#15171D]">
                {title}
              </h3>
              <p className="text-[14px] leading-relaxed text-[#5B5D66]">
                {body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const LINES = [
  { t: "00:02:14", speaker: "Priya", text: "So where did we land on the Q3 pricing tiers?" },
  { t: "00:02:19", speaker: "Sam", text: "Three tiers — the model we sketched last week." },
  { t: "00:04:47", speaker: "Priya", text: "Can we lock the enterprise tier before Friday?" },
] as const;

const QUESTION = "What did we decide about pricing?";
const ANSWER = "Three tiers. Priya wants the enterprise tier locked before Friday.";
const CITATION = "04:47";

const BAR_COUNT = 24;

export function TranscriptDemo() {
  const [phase, setPhase] = useState(0);
  const barsRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const bars = barsRef.current
      ? Array.from(barsRef.current.querySelectorAll<HTMLElement>("[data-bar]"))
      : [];

    let waveformTween: gsap.core.Tween | undefined;
    if (bars.length && !reducedMotion.current) {
      waveformTween = gsap.to(bars, {
        scaleY: () => gsap.utils.random(0.2, 1),
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: { each: 0.09, repeat: -1, yoyo: true },
      });
    }

    const tl = gsap.timeline({ repeat: -1 });
    tl.call(() => setPhase(0))
      .to({}, { duration: 1.1 })
      .call(() => setPhase(1))
      .to({}, { duration: 1.5 })
      .call(() => setPhase(2))
      .to({}, { duration: 1.5 })
      .call(() => setPhase(3))
      .to({}, { duration: 1.7 })
      .call(() => setPhase(4))
      .to({}, { duration: 1.3 })
      .call(() => setPhase(5))
      .to({}, { duration: 3.4 });

    if (reducedMotion.current) {
      tl.pause();
      setPhase(5);
    }

    return () => {
      tl.kill();
      waveformTween?.kill();
    };
  }, []);

  const isLive = phase < 4;
  const elapsed =
    phase === 0 ? "00:00:00" : LINES[Math.min(phase, 3) - 1]?.t ?? LINES[2].t;

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#DDD6C7] bg-white shadow-[0_1px_0_#fff_inset,0_20px_50px_-24px_rgba(21,23,29,0.35)]">
      <div className="flex items-center justify-between border-b border-[#DDD6C7] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isLive ? "bg-[#FF3B2F] animate-pulse" : "bg-[#1F6F54]"
            }`}
          />
          <span className="font-mono text-[11px] tracking-wide text-[#5B5D66] uppercase">
            {isLive ? "Rec" : "Captured"}
          </span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-[#5B5D66]">
          {elapsed}
        </span>
      </div>

      <div
        ref={barsRef}
        className="flex h-10 items-center gap-[3px] border-b border-[#DDD6C7] px-4"
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            data-bar
            className="h-full w-full origin-center rounded-full bg-[#15171D]/15"
            style={{ transform: `scaleY(${0.25 + (i % 5) * 0.12})` }}
          />
        ))}
      </div>

      <div className="flex min-h-[168px] flex-col justify-end gap-2.5 px-4 py-4">
        {LINES.map((line, i) => (
          <div
            key={line.t}
            className={`flex gap-2 text-[13px] leading-snug transition-all duration-500 ${
              phase >= i + 1
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            } ${phase >= 4 ? "opacity-40" : ""}`}
          >
            <span className="shrink-0 font-mono text-[11px] text-[#5B5D66]">
              {line.t}
            </span>
            <span className="shrink-0 font-medium text-[#15171D]">
              {line.speaker}
            </span>
            <span className="text-[#5B5D66]">{line.text}</span>
          </div>
        ))}
      </div>

      <div
        className={`space-y-2 border-t border-[#DDD6C7] px-4 py-4 transition-all duration-500 ${
          phase >= 4 ? "opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="flex justify-end">
          <span className="rounded-full bg-[#15171D] px-3 py-1.5 text-[13px] text-[#F1EEE4]">
            {QUESTION}
          </span>
        </div>
        <div
          className={`flex items-start gap-2 transition-all duration-500 ${
            phase >= 5 ? "opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <span className="rounded-2xl bg-[#F1EEE4] px-3 py-2 text-[13px] text-[#15171D]">
            {ANSWER}{" "}
            <span className="ml-1 rounded-full border border-[#DDD6C7] px-1.5 py-0.5 font-mono text-[10px] text-[#5B5D66]">
              {CITATION}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

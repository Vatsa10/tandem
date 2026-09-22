"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TranscriptDemo } from "./transcript-demo";

const headline = ["Meetings", "disappear.", "Tandem doesn't."];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const word = {
  hidden: { opacity: 0, y: "100%" },
  show: {
    opacity: 1,
    y: "0%",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-24 sm:pt-24">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex items-center gap-2 font-mono text-[13px] uppercase tracking-wider text-[#5B5D66]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF3B2F]" />
            an AI notetaker that answers back
          </motion.p>

          <h1 className="font-[family-name:var(--font-display)] text-[13vw] leading-[0.95] font-semibold tracking-tight text-[#15171D] sm:text-6xl lg:text-7xl">
            {headline.map((line) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className="block"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  <motion.span variants={word} className="inline-block">
                    {line}
                  </motion.span>
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 max-w-md text-lg leading-relaxed text-[#5B5D66]"
          >
            Invite Tandem to your next call. She joins Zoom, Meet, or Teams,
            writes down every word as it&apos;s said, and remembers it — so you
            can ask her anything, weeks later, and get an answer with a
            timestamp attached.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/sign-up"
              className="rounded-full bg-[#FF3B2F] px-6 py-3 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(255,59,47,0.6)] transition-transform hover:-translate-y-0.5 hover:bg-[#E6291D]"
            >
              Get started free
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-[#DDD6C7] px-6 py-3 text-sm font-medium text-[#15171D] transition-colors hover:border-[#15171D]"
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <TranscriptDemo />
        </motion.div>
      </div>
    </section>
  );
}

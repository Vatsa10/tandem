import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#DDD6C7] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF3B2F]" />
          <span className="font-brand text-base font-medium tracking-wide text-[#15171D]">
            Tandem
          </span>
          <span className="ml-2 font-mono text-[12px] text-[#5B5D66]">
            built to remember.
          </span>
        </div>

        <div className="flex items-center gap-6 font-mono text-[12px] text-[#5B5D66]">
          <Link href="/sign-in" className="transition-colors hover:text-[#15171D]">
            sign in
          </Link>
          <Link href="/sign-up" className="transition-colors hover:text-[#15171D]">
            sign up
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[#15171D]">
            terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[#15171D]">
            privacy
          </Link>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

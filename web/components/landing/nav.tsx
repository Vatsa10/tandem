import Link from "next/link";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#DDD6C7]/80 bg-[#F1EEE4]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF3B2F]" />
          <span className="font-brand text-4xl font-normal tracking-wide text-[#15171D]">
            Tandem
          </span>
        </Link>

        <nav className="hidden items-center gap-8 font-mono text-[13px] text-[#5B5D66] sm:flex">
          <Link href="#how-it-works" className="transition-colors hover:text-[#15171D]">
            how it works
          </Link>
          <Link href="#features" className="transition-colors hover:text-[#15171D]">
            features
          </Link>
          <Link href="#ask" className="transition-colors hover:text-[#15171D]">
            ask tandem
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="hidden font-mono text-[13px] text-[#5B5D66] transition-colors hover:text-[#15171D] sm:block"
          >
            sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-[#15171D] px-4 py-2 text-sm font-medium text-[#F1EEE4] transition-colors hover:bg-[#2A2D38]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

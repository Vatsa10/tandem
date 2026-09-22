"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { CalendarDays, KeyRound, MessageSquareText, Video } from "lucide-react";
import { ToastProvider } from "@/components/ui/toaster";

const navItems = [
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/chat", label: "Chat", icon: MessageSquareText },
  { href: "/settings/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings/api-keys", label: "API keys", icon: KeyRound },
];

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isMeetingWorkspace = /^\/meetings\/[^/]+$/.test(pathname);

  return (
    <ToastProvider>
      <div
        className={
          isMeetingWorkspace
            ? "bg-studio flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden"
            : "bg-studio flex flex-1 flex-col"
        }
      >
      <header className="sticky top-0 z-50 shrink-0 border-b border-line/80 bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1920px] items-center gap-6 px-5 sm:px-8">
          <Link
            href="/meetings"
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="rec-pulse h-2.5 w-2.5 rounded-full bg-rec" />
            <span className="font-brand text-4xl font-medium tracking-wide text-ink">
              Tandem
            </span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {navItems.map((item) => {
              const isActive =
                item.href === "/meetings"
                  ? pathname === "/meetings" ||
                    pathname.startsWith("/meetings/")
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-ink text-paper"
                      : "text-ink-muted hover:bg-paper-soft/80 hover:text-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-1 ring-line",
                },
              }}
            />
          </div>
        </div>
      </header>

      <main
        className={`flex min-h-0 flex-1 flex-col px-5 sm:px-8 ${
          isMeetingWorkspace ? "py-5" : "py-8 sm:py-10"
        }`}
      >
        <div
          className={
            isMeetingWorkspace
              ? "mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col"
              : "mx-auto w-full max-w-5xl"
          }
        >
          {children}
        </div>
      </main>
      </div>
    </ToastProvider>
  );
}

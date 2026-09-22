import { eq } from "drizzle-orm";
import { Calendar, Check } from "lucide-react";
import { AutoRecordToggle } from "@/components/auto-record-toggle";
import { CalendarEventsList } from "@/components/calendar-events-list";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { calendarConnections } from "@/lib/db/schema";

// Connection status changes via OAuth callbacks between requests — must
// not be frozen at build time.
export const dynamic = "force-dynamic";

const PROVIDERS = [
  {
    id: "google",
    label: "Google Calendar",
    hint: "Personal or work Google accounts",
    connectHref: "/api/calendar/google/connect",
  },
  // Outlook integration disabled for now — not yet ready to promote.
  // {
  //   id: "microsoft_outlook",
  //   label: "Outlook Calendar",
  //   hint: "Microsoft 365 / Outlook.com",
  //   connectHref: "/api/calendar/outlook/connect",
  // },
] as const;

export default async function CalendarSettingsPage() {
  const userId = await getCurrentUserId();
  const connections = await db
    .select()
    .from(calendarConnections)
    .where(eq(calendarConnections.userId, userId));

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        description="Connect accounts so Tandem can find invites and join on time."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const accounts = connections.filter(
            (c) => c.provider === provider.id,
          );
          return (
            <div key={provider.id} className="surface-panel flex flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-soft text-ink-muted">
                    <Calendar className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-display text-[15px] font-semibold tracking-tight text-ink">
                      {provider.label}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      {provider.hint}
                    </p>
                  </div>
                </div>
                <a
                  href={provider.connectHref}
                  className="shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
                >
                  {accounts.length > 0 ? "Add another" : "Connect"}
                </a>
              </div>

              {accounts.length > 0 && (
                <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
                  <AutoRecordToggle
                    connectionIds={accounts.map((a) => a.id)}
                    initialValue={accounts.every((a) => a.autoRecord)}
                  />
                  <ul className="flex flex-col gap-1.5">
                    {accounts.map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center gap-2 font-mono text-[12px] text-ink-muted"
                      >
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-moss"
                          strokeWidth={2}
                        />
                        {account.email ?? "Connected account"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="section-label">Upcoming from calendar</h2>
        </div>
        <CalendarEventsList hasConnections={connections.length > 0} />
      </section>
    </div>
  );
}

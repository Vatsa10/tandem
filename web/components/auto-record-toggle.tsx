"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export function AutoRecordToggle({
  connectionIds,
  initialValue,
}: {
  connectionIds: string[];
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(next: boolean) {
    setPending(true);
    setMessage(null);

    const results = await Promise.all(
      connectionIds.map((id) =>
        fetch(`/api/calendar/connections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autoRecord: next }),
        }).then(async (res) => ({
          ok: res.ok,
          body: res.ok ? await res.json() : null,
        })),
      ),
    );

    setPending(false);

    if (results.some((r) => !r.ok)) {
      setMessage("Failed to update one or more accounts.");
      return;
    }

    setChecked(next);
    if (next) {
      const scheduled = results.reduce(
        (sum, r) => sum + (r.body?.scheduled ?? 0),
        0,
      );
      setMessage(
        scheduled > 0
          ? `Scheduled ${scheduled} upcoming meeting${scheduled === 1 ? "" : "s"}.`
          : "No upcoming meetings to schedule yet.",
      );
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-ink">Auto-record every meeting</p>
        {message && (
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
            {message}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={handleChange}
        disabled={pending || connectionIds.length === 0}
      />
    </div>
  );
}

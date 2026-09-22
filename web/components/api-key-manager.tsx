"use client";

import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The plaintext key exists only in this response — once the page is
  // reloaded it is gone, so it is shown until dismissed rather than as a
  // toast that can be missed.
  const [created, setCreated] = useState<{ name: string; key: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? `Request failed (${res.status})`);
      return;
    }

    setCreated({ name: body.key.name, key: body.key.key });
    setKeys((current) => [
      ...current,
      {
        id: body.key.id,
        name: body.key.name,
        keyPrefix: body.key.key.slice(0, 10),
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      },
    ]);
    setName("");
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not revoke that key.");
      return;
    }
    setKeys((current) => current.filter((key) => key.id !== id));
  }

  async function copy(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What is this key for? e.g. my laptop"
          disabled={busy}
          className="w-full flex-1"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
        >
          <KeyRound className="h-4 w-4" strokeWidth={1.75} />
          {busy ? "Creating…" : "Create key"}
        </button>
      </form>

      {error && <p className="font-mono text-[12px] text-rec">{error}</p>}

      {created && (
        <div className="surface-panel flex flex-col gap-3 p-4">
          <p className="text-sm text-ink">
            Copy <span className="font-medium">{created.name}</span> now — this
            is the only time it is shown.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-ink/5 px-3 py-2 font-mono text-[12px] break-all text-ink">
              {created.key}
            </code>
            <button
              type="button"
              onClick={() => copy(created.key)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase transition-colors hover:bg-ink/5"
            >
              {copied ? (
                <Check className="h-3 w-3" strokeWidth={1.75} />
              ) : (
                <Copy className="h-3 w-3" strokeWidth={1.75} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <details className="text-sm text-ink-muted">
            <summary className="cursor-pointer">How to use it</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-ink/5 p-3 font-mono text-[12px]">
              {`TANDEM_WEB_URL=https://your-deployment\nTANDEM_API_KEY=${created.key}`}
            </pre>
            <p className="mt-2">
              Set both on the Tandem MCP server. Its voice agent then gets
              search_meetings and list_upcoming_meetings.
            </p>
          </details>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setCopied(false);
            }}
            className="self-start font-mono text-[11px] tracking-wide text-ink-muted uppercase underline underline-offset-2"
          >
            Done
          </button>
        </div>
      )}

      {keys.length === 0 ? (
        <p className="text-sm text-ink-muted">No keys yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{key.name}</p>
                <p className="font-mono text-[11px] text-ink-muted">
                  {key.keyPrefix}… ·{" "}
                  {key.lastUsedAt
                    ? `last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : "never used"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(key.id)}
                aria-label={`Revoke ${key.name}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase transition-colors hover:border-rec/30 hover:text-rec"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

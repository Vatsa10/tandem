"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";

const markdownComponents = {
  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ ...props }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0" {...props} />
  ),
  li: ({ ...props }) => <li {...props} />,
  strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
  a: ({ ...props }) => (
    <a
      className="underline underline-offset-2 hover:no-underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: ({ ...props }) => (
    <code
      className="rounded bg-ink/8 px-1 py-0.5 font-mono text-[12.5px]"
      {...props}
    />
  ),
  pre: ({ ...props }) => (
    <pre
      className="mb-2 overflow-x-auto rounded-lg bg-ink/8 p-2.5 text-[12.5px] last:mb-0"
      {...props}
    />
  ),
  table: ({ ...props }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="border-collapse text-[13px]" {...props} />
    </div>
  ),
  th: ({ ...props }) => (
    <th
      className="border border-line px-2 py-1 text-left font-semibold"
      {...props}
    />
  ),
  td: ({ ...props }) => <td className="border border-line px-2 py-1" {...props} />,
} satisfies React.ComponentProps<typeof ReactMarkdown>["components"];

// The transport is only built once, on mount — if the scope needs to
// change (e.g. the user picks a different category), remount this
// component with a `key` that changes rather than expecting props here to
// update it live.
export function ChatPanel({
  meetingId,
  categoryId,
  suggestions,
}: {
  meetingId?: string;
  categoryId?: string;
  /** Clickable prompts shown on an empty thread — clicking sends one. */
  suggestions?: string[];
}) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { meetingId, categoryId },
      }),
  );
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isBusy = status !== "ready" && status !== "error";

  // Keep the newest message / streaming tokens / typing dots in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput("");
  }

  const placeholder = meetingId
    ? "Ask about this meeting…"
    : "Ask across these meetings…";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div
        className={`min-h-0 flex-1 ${messages.length === 0 ? "" : "overflow-y-auto"}`}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-0 flex-col">
            <EmptyState
              icon={<Sparkles className="h-4 w-4" strokeWidth={1.75} />}
              className="h-full min-h-[160px] border-0 bg-transparent py-8"
            >
              {meetingId
                ? "Ask what was decided, who owns a follow-up, or what someone said."
                : "Ask across this category — decisions, open action items, who said what."}
            </EmptyState>
            {suggestions && suggestions.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={isBusy}
                    onClick={() => sendMessage({ text: suggestion })}
                    className="rounded-full border border-line bg-white/70 px-3.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-ink/30 hover:bg-white hover:text-ink disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3 pb-1">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] px-4 py-2.5 text-[14px] leading-relaxed ${
                      message.role === "user"
                        ? "rounded-2xl rounded-br-md bg-ink text-paper whitespace-pre-wrap"
                        : "rounded-2xl rounded-bl-md border border-line bg-white/70 text-ink"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <p className="mb-1.5 font-mono text-[10px] tracking-wider text-ink-muted uppercase">
                        Tandem
                      </p>
                    )}
                    {message.parts.map((part, i) =>
                      part.type !== "text" ? null : message.role ===
                        "assistant" ? (
                        <ReactMarkdown
                          key={i}
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {part.text}
                        </ReactMarkdown>
                      ) : (
                        <span key={i}>{part.text}</span>
                      ),
                    )}
                  </div>
                </li>
              ))}
              {status === "submitted" && (
                <li className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-line bg-white/70 px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rec [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rec [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rec" />
                  </div>
                </li>
              )}
            </ul>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {status === "error" && (
        <div
          role="alert"
          className="flex shrink-0 items-center gap-2 rounded-xl border border-rec/25 bg-rec/8 px-3.5 py-2.5 text-[13px] text-rec"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Something went wrong — check your connection and try again.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-white/80 p-1.5 shadow-[0_1px_0_rgb(21_23_29_/_0.04)]"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isBusy}
          placeholder={placeholder}
          className="flex-1 border-0 bg-transparent shadow-none focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rec text-white transition-colors hover:bg-rec-dark disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}

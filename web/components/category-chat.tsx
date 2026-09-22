"use client";

import { FolderPlus, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/hooks/use-categories";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Summarize the most recent call",
  "What action items are still open?",
  "What decisions have we made recently?",
];

export function CategoryChat() {
  const { categories, loaded, createCategory, deleteCategory } =
    useCategories();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Default to the first category; if the selected one is deleted (here or
  // elsewhere), the selection silently falls back to whatever leads the list.
  const activeId = categories.some((c) => c.id === selectedId)
    ? selectedId
    : (categories[0]?.id ?? null);
  const activeCategory = categories.find((c) => c.id === activeId) ?? null;
  const activeCount = activeCategory?.meetingCount ?? 0;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const category = await createCategory(name);
    if (category) {
      setSelectedId(category.id);
      setNewName("");
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteCategory(id);
    setConfirmDeleteId(null);
  }

  const createForm = (
    <form onSubmit={handleCreate} className="flex items-center gap-1.5">
      <Input
        autoFocus
        variant="box"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="Category name"
        className="min-w-0 flex-1 py-1.5"
      />
      <button
        type="submit"
        disabled={!newName.trim()}
        className="shrink-0 font-mono text-[12px] text-ink underline underline-offset-2 disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setCreating(false);
          setNewName("");
        }}
        aria-label="Cancel new category"
        className="shrink-0 text-ink-muted transition-colors hover:text-ink"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </form>
  );

  if (!loaded) {
    return (
      <div className="surface-panel flex min-h-[480px] gap-4 p-4">
        <span className="sr-only">Loading categories…</span>
        <div className="hidden w-56 shrink-0 flex-col gap-2 border-r border-line pr-4 lg:flex">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="min-h-[240px] w-full flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  // First run — no categories yet. There is no uncategorized scope, so
  // creating one is the only way into cross-meeting chat.
  if (categories.length === 0) {
    return (
      <div className="surface-panel flex min-h-[440px] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-soft text-ink-muted">
          <FolderPlus className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="max-w-sm">
          <p className="font-display text-lg font-semibold tracking-tight text-ink">
            Group meetings to ask across them
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Categories bundle related calls — a client, a recurring sync — so
            Tandem can answer across the whole series. To ask about one meeting,
            open it and use the Ask Tandem tab.
          </p>
        </div>
        <form
          onSubmit={handleCreate}
          className="flex w-full max-w-xs items-center gap-2"
        >
          <Input
            variant="box"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Client work"
            className="min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="surface-panel grid h-[min(78dvh,740px)] min-h-[520px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[15rem_minmax(0,1fr)] lg:grid-rows-1">
      {/* Category rail */}
      <aside className="flex min-h-0 flex-col border-b border-line lg:border-r lg:border-b-0">
        <div className="hidden shrink-0 border-b border-line px-4 py-3 lg:block">
          <p className="section-label">Categories</p>
          <p className="mt-1 font-mono text-[11px] text-ink-muted tabular-nums">
            {categories.length} {categories.length === 1 ? "group" : "groups"}
          </p>
        </div>

        <ul className="flex shrink-0 gap-1.5 overflow-x-auto p-2.5 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-x-visible lg:overflow-y-auto">
          {categories.map((category) => {
            const isActive = category.id === activeId;
            return (
              <li key={category.id} className="group shrink-0">
                {confirmDeleteId === category.id ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 font-mono text-[11px] whitespace-nowrap">
                    <span className="text-ink-muted">Delete?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(category.id)}
                      className="text-rec underline underline-offset-2"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-ink-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "flex items-center rounded-full border transition-colors lg:rounded-lg",
                      isActive
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-card/60 text-ink hover:border-ink/25 hover:bg-paper-soft",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(category.id)}
                      aria-current={isActive ? "true" : undefined}
                      className="flex min-w-0 items-center gap-2 py-2 pr-1 pl-3 text-left text-sm lg:flex-1"
                    >
                      <span className="max-w-28 truncate lg:max-w-none">
                        {category.name}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px] tabular-nums",
                          isActive ? "text-paper/70" : "text-ink-muted",
                        )}
                      >
                        {category.meetingCount ?? 0}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(category.id)}
                      aria-label={`Delete ${category.name}`}
                      className={cn(
                        "mr-1.5 rounded-full p-1 transition-opacity focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
                        isActive
                          ? "text-paper/70 hover:bg-white/10 hover:text-paper"
                          : "text-ink-muted hover:text-rec",
                      )}
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 border-t border-line p-2.5">
          {creating ? (
            createForm
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-[13px] whitespace-nowrap text-ink-muted transition-colors hover:border-ink/30 hover:text-ink lg:rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              New category
            </button>
          )}
        </div>
      </aside>

      {/* Chat column */}
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
              {activeCategory?.name}
            </p>
            <p className="mt-0.5 font-mono text-[11px] tracking-wide text-ink-muted uppercase">
              {activeCount} meeting{activeCount === 1 ? "" : "s"} in scope
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-paper/70 px-2.5 py-1 font-mono text-[10px] tracking-wider text-ink-muted uppercase sm:inline-flex">
            <Sparkles className="h-3 w-3 text-rec" strokeWidth={1.75} />
            Scoped chat
          </span>
        </div>

        <div className="min-h-0 flex-1 p-4 sm:p-5">
          {activeId && (
            <ChatPanel
              key={activeId}
              categoryId={activeId}
              suggestions={SUGGESTED_PROMPTS}
            />
          )}
        </div>
      </div>
    </div>
  );
}

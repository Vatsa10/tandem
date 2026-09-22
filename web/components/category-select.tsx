"use client";

import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
}

// "bound" — persists the selection immediately via PATCH against an
// existing meeting row (meeting detail page, meetings list).
// "controlled" — no meeting row exists yet; the parent owns the selected
// value and decides when/how to persist it (e.g. included in a later
// "Record" request body).
type CategorySelectProps = { categories: Category[] } & (
  | { mode: "bound"; meetingId: string; initialCategoryId: string | null }
  | {
      mode: "controlled";
      value: string | null;
      onChange: (categoryId: string | null) => void;
    }
);

export function CategorySelect(props: CategorySelectProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(props.categories);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [boundCategoryId, setBoundCategoryId] = useState(
    props.mode === "bound" ? props.initialCategoryId : null,
  );

  const categoryId = props.mode === "bound" ? boundCategoryId : props.value;
  const currentName =
    categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCreating(false);
      setNewName("");
      setConfirmDeleteId(null);
    }
  }

  async function selectCategory(id: string | null) {
    setOpen(false);
    if (props.mode === "controlled") {
      props.onChange(id);
      return;
    }

    setPending(true);
    const res = await fetch(`/api/meetings/${props.meetingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: id }),
    });
    setPending(false);
    if (res.ok) {
      setBoundCategoryId(id);
      router.refresh();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setPending(true);

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });

    setPending(false);
    if (!res.ok) return;

    const { category } = await res.json();
    setCategories((prev) => [...prev, category]);
    setNewName("");
    setCreating(false);
    await selectCategory(category.id);
  }

  async function handleDelete(id: string) {
    setPending(true);
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setPending(false);
    setConfirmDeleteId(null);
    if (!res.ok) return;

    setCategories((prev) => prev.filter((c) => c.id !== id));
    // Deleting a category sets meetings.categoryId to null server-side
    // (onDelete: "set null") — mirror that locally if it was selected here.
    if (categoryId === id) {
      if (props.mode === "bound") setBoundCategoryId(null);
      else props.onChange(null);
    }
    router.refresh();
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        disabled={pending}
        className="flex items-center gap-1 rounded-full border border-line bg-white/70 px-3 py-1.5 text-sm text-ink outline-none transition-colors hover:border-ink/30 hover:bg-white disabled:opacity-50"
      >
        {currentName}
        <ChevronDown className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start">
          <Popover.Popup className="w-60 origin-[var(--transform-origin)] rounded-xl border border-line bg-card p-1.5 text-ink shadow-lg outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <button
              type="button"
              onClick={() => selectCategory(null)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-paper-soft"
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {categoryId === null && (
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                )}
              </span>
              Uncategorized
            </button>

            {categories.length > 0 && (
              <div className="my-1 h-px bg-line" />
            )}

            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => selectCategory(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-paper-soft"
                >
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {categoryId === c.id && (
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                  </span>
                  <span className="truncate">{c.name}</span>
                </button>
                {confirmDeleteId === c.id ? (
                  <div className="flex shrink-0 items-center gap-1.5 pr-2 font-mono text-[11px]">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDelete(c.id)}
                      className="text-rec underline underline-offset-2 disabled:opacity-50"
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
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(c.id)}
                    aria-label={`Delete ${c.name}`}
                    className="shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-paper-soft hover:text-rec"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))}

            <div className="my-1 h-px bg-line" />

            {creating ? (
              <form
                onSubmit={handleCreate}
                className="flex items-center gap-1.5 px-1 py-1"
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New category name"
                  disabled={pending}
                  className="w-full min-w-0 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-ink/30 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={pending || !newName.trim()}
                  className="shrink-0 font-mono text-[11px] text-ink underline underline-offset-2 disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink-muted hover:bg-paper-soft hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                New category
              </button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

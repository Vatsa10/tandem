"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  MeetingList,
  platformLabel,
  type MeetingListItem,
} from "@/components/meeting-list";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

function matches(meeting: MeetingListItem, query: string): boolean {
  const haystack =
    `${meeting.title ?? ""} ${meeting.meetingUrl} ${meeting.platform ?? ""} ${meeting.summary ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-[12px] transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-line bg-card/70 text-ink-muted hover:border-ink/30 hover:bg-white hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Section({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          className={`section-label ${accent ? "text-rec" : ""}`}
        >
          {label}
        </h2>
        <span className="font-mono text-[11px] text-ink-muted tabular-nums">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

export function MeetingsBrowser({
  meetings,
  categories,
}: {
  meetings: MeetingListItem[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Platforms actually present in the data, raw value → display label.
  const platforms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of meetings) {
      if (m.platform && !seen.has(m.platform)) {
        seen.set(m.platform, platformLabel(m.platform));
      }
    }
    return [...seen.entries()];
  }, [meetings]);

  const hasUncategorized = useMemo(
    () => meetings.some((m) => !m.categoryId),
    [meetings],
  );

  // A filter can outlive the thing it points at (meeting deleted, category
  // removed) — fall back to "all" instead of filtering to nothing.
  const activePlatform = platforms.some(([value]) => value === platformFilter)
    ? platformFilter
    : "all";
  const activeCategory =
    categoryFilter === "uncategorized" ||
    categories.some((c) => c.id === categoryFilter)
      ? categoryFilter
      : "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meetings.filter((m) => {
      if (q && !matches(m, q)) return false;
      if (activePlatform !== "all" && m.platform !== activePlatform) {
        return false;
      }
      if (activeCategory === "uncategorized" && m.categoryId) return false;
      if (
        activeCategory !== "all" &&
        activeCategory !== "uncategorized" &&
        m.categoryId !== activeCategory
      ) {
        return false;
      }
      return true;
    });
  }, [meetings, query, activePlatform, activeCategory]);

  const failed = filtered.filter((m) => m.status.startsWith("fatal"));
  const past = filtered.filter((m) => m.status === "done");
  const upcoming = filtered.filter(
    (m) => m.status !== "done" && !m.status.startsWith("fatal"),
  );

  const isFiltering =
    query.trim().length > 0 ||
    activePlatform !== "all" ||
    activeCategory !== "all";

  const showPlatformChips = platforms.length > 1;
  const showCategoryChips = categories.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {meetings.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-muted"
              strokeWidth={1.75}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, platform, notes…"
              className="w-full bg-white/60 pl-10"
            />
          </div>

          {(showPlatformChips || showCategoryChips) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="section-label mr-1">Filter</span>

              {showPlatformChips && (
                <>
                  <FilterChip
                    active={activePlatform === "all"}
                    onClick={() => setPlatformFilter("all")}
                  >
                    All platforms
                  </FilterChip>
                  {platforms.map(([value, label]) => (
                    <FilterChip
                      key={value}
                      active={activePlatform === value}
                      onClick={() => setPlatformFilter(value)}
                    >
                      {label}
                    </FilterChip>
                  ))}
                </>
              )}

              {showPlatformChips && showCategoryChips && (
                <span aria-hidden className="mx-1 h-4 w-px bg-line" />
              )}

              {showCategoryChips && (
                <>
                  <FilterChip
                    active={activeCategory === "all"}
                    onClick={() => setCategoryFilter("all")}
                  >
                    All categories
                  </FilterChip>
                  {hasUncategorized && (
                    <FilterChip
                      active={activeCategory === "uncategorized"}
                      onClick={() => setCategoryFilter("uncategorized")}
                    >
                      Uncategorized
                    </FilterChip>
                  )}
                  {categories.map((category) => (
                    <FilterChip
                      key={category.id}
                      active={activeCategory === category.id}
                      onClick={() => setCategoryFilter(category.id)}
                    >
                      {category.name}
                    </FilterChip>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {isFiltering ? (
        <Section label="Matching meetings" count={filtered.length}>
          <MeetingList
            meetings={filtered}
            categories={categories}
            emptyLabel="No meetings match your search or filters."
          />
        </Section>
      ) : (
        <>
          <Section label="Live & upcoming" count={upcoming.length}>
            <MeetingList
              meetings={upcoming}
              categories={categories}
              emptyLabel="Nothing scheduled — join a meeting above or connect your calendar."
            />
          </Section>

          <Section label="Past captures" count={past.length}>
            <MeetingList
              meetings={past}
              categories={categories}
              emptyLabel="No completed meetings yet."
            />
          </Section>

          {failed.length > 0 && (
            <Section label="Failed to join" count={failed.length} accent>
              <MeetingList
                meetings={failed}
                categories={categories}
                emptyLabel=""
              />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

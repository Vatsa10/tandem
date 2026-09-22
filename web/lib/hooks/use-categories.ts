"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toaster";

export interface Category {
  id: string;
  name: string;
  meetingCount?: number;
}

// Shared by client components that fetch their own category list (as
// opposed to server-rendered pages, which fetch categories server-side
// and pass them down as props — see the meeting detail/list pages).
export function useCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((body) => {
        if (!cancelled) {
          setCategories(body.categories ?? []);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createCategory(name: string): Promise<Category | null> {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast({ title: "Couldn't create the category", tone: "error" });
        return null;
      }

      const { category } = await res.json();
      setCategories((prev) => [...prev, category]);
      toast({ title: `Category “${category.name}” created`, tone: "success" });
      return category;
    } catch {
      toast({ title: "Couldn't create the category", tone: "error" });
      return null;
    }
  }

  async function deleteCategory(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast({ title: "Couldn't delete the category", tone: "error" });
        return false;
      }

      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast({
        title: "Category deleted",
        description: "Its meetings are now uncategorized.",
        tone: "success",
      });
      return true;
    } catch {
      toast({ title: "Couldn't delete the category", tone: "error" });
      return false;
    }
  }

  return { categories, loaded, createCategory, deleteCategory };
}

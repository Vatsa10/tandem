"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error";

interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  leaving: boolean;
}

const ToastContext = createContext<{ toast: (options: ToastOptions) => void } | null>(
  null,
);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const AUTO_DISMISS_MS = 4500;
const EXIT_MS = 180;
/** Keep at most this many toasts visible — oldest get dropped. */
const MAX_VISIBLE = 4;

const TONE_ICON: Record<ToastTone, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />,
  success: <CheckCircle2 className="h-4 w-4 text-moss" strokeWidth={1.75} />,
  error: <AlertCircle className="h-4 w-4 text-rec" strokeWidth={1.75} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const dismissTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const removeTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = dismissTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimers.current.delete(id);
    }
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    removeTimers.current.set(
      id,
      setTimeout(() => {
        removeTimers.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, EXIT_MS),
    );
  }, []);

  const toast = useCallback(
    ({ title, description, tone = "default" }: ToastOptions) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((prev) => [
        ...prev.slice(-(MAX_VISIBLE - 1)),
        { id, title, description, tone, leaving: false },
      ]);
      dismissTimers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const dismissMap = dismissTimers.current;
    const removeMap = removeTimers.current;
    return () => {
      dismissMap.forEach((timer) => clearTimeout(timer));
      removeMap.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-5 bottom-5 z-[100] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-card px-3.5 py-3 shadow-[0_12px_32px_-16px_rgb(21_23_29_/_0.4)]",
              t.leaving
                ? "animate-out fade-out slide-out-to-bottom-2 fill-mode-forwards"
                : "animate-in fade-in slide-in-from-bottom-2",
            )}
          >
            <span className="mt-px shrink-0">{TONE_ICON[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-paper-soft hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

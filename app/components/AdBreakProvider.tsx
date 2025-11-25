"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type AdContent = {
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type AdBreakContextValue = {
  isOpen: boolean;
  triggerAd: (content?: Partial<AdContent>) => void;
};

const AdBreakContext = createContext<AdBreakContextValue | undefined>(
  undefined
);

const defaultContent: AdContent = {
  headline: "Sponsored break",
  body: "Just a quick word from our partners. We'll be right back!",
  ctaLabel: "View offer",
  ctaHref: "https://example.com",
};

export function useAdBreak() {
  const ctx = useContext(AdBreakContext);
  if (!ctx) {
    throw new Error("useAdBreak must be used within AdBreakProvider");
  }
  return ctx;
}

export default function AdBreakProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<AdContent>(defaultContent);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const triggerAd = useCallback((payload?: Partial<AdContent>) => {
    const nextContent: Partial<AdContent> = payload ?? {};
    setContent((prev) => ({ ...prev, ...nextContent }));
    setIsOpen(true);
    console.log("[AdBreak] opened");
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
      console.log("[AdBreak] closed");
      timerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const value = useMemo<AdBreakContextValue>(
    () => ({
      isOpen,
      triggerAd,
    }),
    [isOpen, triggerAd]
  );

  return (
    <AdBreakContext.Provider value={value}>
      <RouteAdTrigger />
      {children}
      <AdBreakModal isOpen={isOpen} content={content} />
    </AdBreakContext.Provider>
  );
}

function RouteAdTrigger() {
  const { triggerAd } = useAdBreak();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeKey = useMemo(() => {
    const query = searchParams?.toString() ?? "";
    return `${pathname ?? ""}?${query}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!routeKey) return;
    triggerAd();
  }, [routeKey, triggerAd]);

  return null;
}

function AdBreakModal({
  isOpen,
  content,
}: {
  isOpen: boolean;
  content: AdContent;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 text-white backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md rounded-3xl bg-green-600 p-8 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green-100">
          AD BREAK
        </p>
        <h2 className="mt-4 text-2xl font-bold text-white">
          {content.headline}
        </h2>
        <p className="mt-3 text-base text-white/90">{content.body}</p>
        {content.ctaLabel && content.ctaHref && (
          <a
            href={content.ctaHref}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-black/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black/50"
          >
            {content.ctaLabel}
          </a>
        )}
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-green-100/80">
          Returning in 2 seconds...
        </p>
      </div>
    </div>
  );
}

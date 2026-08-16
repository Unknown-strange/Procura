"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

/** Floating pulsating AI entry point — left side of every app screen. */
export function AiFab() {
  const pathname = usePathname();
  if (pathname === "/assistant" || pathname.startsWith("/assistant/")) {
    return null;
  }

  return (
    <Link
      href="/assistant"
      className="ai-fab fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#006a3f] text-white shadow-[0_8px_24px_rgba(0,106,63,0.35)]"
      aria-label="Open Tender Assistant"
      title="Tender Assistant"
    >
      <span className="ai-fab-pulse" aria-hidden />
      <span className="ai-fab-pulse ai-fab-pulse-delay" aria-hidden />
      <Sparkles className="relative z-10 h-6 w-6" aria-hidden />
    </Link>
  );
}

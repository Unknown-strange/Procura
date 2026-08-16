"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Bell, CircleHelp, Search, X } from "lucide-react";

export function AppHeader({
  title,
  actions,
  searchPlaceholder,
}: {
  title: string;
  actions?: ReactNode;
  searchPlaceholder: string;
}) {
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#d6dfd5] bg-white px-4 py-3 pt-16 sm:py-4 lg:px-8 lg:pt-4">
      <div className="flex items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-[#006a3f] sm:text-xl md:text-2xl">
          {title}
        </h1>

        <label className="relative mx-auto hidden min-w-0 max-w-xl flex-1 md:block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7a70]" />
          <input
            className="h-11 w-full rounded-full border border-[#d6dfd5] bg-[#f0fdf1] pl-11 pr-4 text-sm text-[#131e17] placeholder:text-[#6e7a70] focus:border-[#006a3f] focus:outline-none"
            placeholder={searchPlaceholder}
          />
        </label>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6dfd5] text-[#3e4941] md:hidden"
            onClick={() => setMobileSearch((v) => !v)}
            aria-label={mobileSearch ? "Close search" : "Open search"}
            aria-expanded={mobileSearch}
          >
            {mobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          {actions}
          <Link
            href="/alerts"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6dfd5] text-[#3e4941] sm:h-11 sm:w-11"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href="/help"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d6dfd5] text-[#3e4941] sm:h-11 sm:w-11"
            aria-label="Help"
          >
            <CircleHelp className="h-5 w-5" />
          </Link>
          <Link
            href="/settings"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#31694c] text-sm font-bold text-white sm:h-11 sm:w-11"
            aria-label="User profile"
          >
            K
          </Link>
        </div>
      </div>

      {mobileSearch ? (
        <label className="relative mt-3 block md:hidden">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7a70]" />
          <input
            autoFocus
            className="h-11 w-full rounded-full border border-[#d6dfd5] bg-[#f0fdf1] pl-11 pr-4 text-sm text-[#131e17] placeholder:text-[#6e7a70] focus:border-[#006a3f] focus:outline-none"
            placeholder={searchPlaceholder}
          />
        </label>
      ) : null}
    </header>
  );
}

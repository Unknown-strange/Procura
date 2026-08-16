"use client";

import { type ReactNode, useEffect, useState } from "react";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { TenderFiltersBar } from "@/components/tenders/tender-filters";

export function TendersPageChrome({
  regions,
  children,
}: {
  regions: string[];
  children: ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-[#131e17] sm:text-3xl">Find Tenders</h2>
          <p className="mt-2 max-w-2xl text-sm text-[#6e7a70] sm:text-base">
            Discover and match with relevant public procurement opportunities across Ghana.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6dfd5] bg-white text-[#006a3f]"
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6dfd5] bg-white text-[#6e7a70]"
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#006a3f] px-4 text-sm font-bold text-white lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <TenderFiltersBar regions={regions} />
        </div>

        {filtersOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[#28332c]/40"
              aria-label="Close filters"
              onClick={() => setFiltersOpen(false)}
            />
            <aside className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[#f0fdf1] p-3 shadow-[0_-8px_24px_rgba(32,43,36,0.12)] sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-80 sm:rounded-none sm:rounded-l-2xl sm:bg-transparent sm:p-4">
              <TenderFiltersBar regions={regions} onClose={() => setFiltersOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}

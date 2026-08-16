"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";

export function TenderFiltersBar({
  regions,
  onClose,
}: {
  regions: string[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    startTransition(() => router.push(`/tenders?${params.toString()}`));
  }

  const type = searchParams.get("type") ?? "all";
  const status = searchParams.get("status") ?? "open";

  return (
    <aside className="h-fit rounded-2xl border border-[#d6dfd5] bg-white p-4 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-[#131e17]">Filters</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm font-semibold text-[#006a3f]"
            onClick={() => startTransition(() => router.push("/tenders"))}
          >
            Clear All
          </button>
          {onClose ? (
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg lg:hidden"
              onClick={onClose}
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <p className="mb-2 text-sm font-bold text-[#3e4941]">Category</p>
      <div className="mb-5 space-y-2">
        {[
          { value: "Goods", label: "Goods" },
          { value: "Works", label: "Works" },
          { value: "Consulting Services", label: "Consulting Services" },
          { value: "Technical Services", label: "Technical Services" },
          { value: "Disposals", label: "Disposals" },
        ].map((opt) => (
          <label key={opt.value} className="flex min-h-10 items-center gap-2 text-sm text-[#131e17]">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#006a3f]"
              checked={type === opt.value}
              onChange={() => setParam("type", type === opt.value ? "all" : opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>

      <p className="mb-2 text-sm font-bold text-[#3e4941]">Location (Region)</p>
      <select
        className="mb-5 h-11 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-sm"
        defaultValue={searchParams.get("region") ?? "all"}
        onChange={(e) => setParam("region", e.target.value)}
      >
        <option value="all">All Regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <p className="mb-2 text-sm font-bold text-[#3e4941]">Deadline Status</p>
      <div className="flex flex-wrap gap-2">
        {[
          { value: "open", label: "Open" },
          { value: "closing_soon", label: "Closing Soon" },
          { value: "closed", label: "Closed" },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setParam("status", opt.value)}
            className={`rounded-full px-3 py-2 text-xs font-bold ${
              status === opt.value
                ? "bg-[#006a3f] text-white"
                : "border border-[#d6dfd5] bg-white text-[#3e4941]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {onClose ? (
        <button
          type="button"
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#006a3f] text-sm font-bold text-white lg:hidden"
          onClick={onClose}
        >
          Show Results
        </button>
      ) : null}
    </aside>
  );
}

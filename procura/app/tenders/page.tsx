import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { TendersPageChrome } from "@/components/tenders/tenders-page-chrome";
import { listTenders } from "@/lib/data/tenders";
import { GHANA_REGION_OPTIONS } from "@/lib/ghaneps";
import { daysUntil, formatDeadline } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TendersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;
  const region = typeof params.region === "string" ? params.region : undefined;
  const status = typeof params.status === "string" ? params.status : "open";
  const page = Number(typeof params.page === "string" ? params.page : "1") || 1;

  const { items, total, pageSize } = await listTenders({
    q,
    type,
    region,
    status,
    page,
    pageSize: 20,
  });

  const regions = [...GHANA_REGION_OPTIONS];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(p: number) {
    return `/tenders?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(type ? { type } : {}),
      ...(region ? { region } : {}),
      ...(status ? { status } : {}),
      page: String(p),
    }).toString()}`;
  }

  return (
    <AppShell
      title="Tender Intelligence"
      searchPlaceholder="Search by tender title, organization, category..."
    >
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-[#e4f1e6]" />}>
        <TendersPageChrome regions={regions}>
          <div className="mb-4">
            <p className="text-sm font-semibold text-[#3e4941]">
              Showing {total} result{total === 1 ? "" : "s"}
            </p>
          </div>

          {items.length ? (
            <div className="grid gap-4">
              {items.map((tender) => {
                const days = daysUntil(tender.submission_deadline);
                const urgent = days !== null && days <= 5;
                return (
                  <article
                    key={tender.id}
                    className="rounded-2xl border border-[#d6dfd5] border-l-4 border-l-[#006a3f] bg-white p-4 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:p-6"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#b4f0cb] px-3 py-1 text-xs font-bold uppercase text-[#006a3f]">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        {tender.status === "closing_soon"
                          ? "Closing soon"
                          : tender.status === "closed"
                            ? "Closed"
                            : "Open"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#131e17] sm:text-lg">{tender.title}</h3>
                    <p className="mt-1 text-sm text-[#6e7a70]">{tender.procuring_entity_name}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#3e4941]">
                      <span>{tender.procurement_type ?? "—"}</span>
                      <span>{tender.region ?? "—"}</span>
                    </div>
                    <p
                      className={`mt-3 text-sm font-semibold ${urgent ? "text-[#ba1a1a]" : "text-[#131e17]"}`}
                    >
                      Submission Deadline {formatDeadline(tender.submission_deadline)}
                      {days !== null ? ` (${days} days left)` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/tenders/${tender.id}`}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-[#006a3f] px-5 text-sm font-bold text-[#006a3f] sm:flex-none"
                      >
                        View Details
                      </Link>
                      <OpenOnGhaneps
                        sourceUrl={tender.source_url}
                        ghanepsId={tender.ghaneps_id}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white sm:flex-none"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#d6dfd5] bg-white px-5 py-8 text-base text-[#6e7a70]">
              No tenders match these filters yet. Listings come from GHANEPS after the scheduled
              scrape runs.
            </p>
          )}

          {totalPages > 1 ? (
            <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="inline-flex h-11 items-center rounded-full border border-[#d6dfd5] bg-white px-4 text-sm font-bold text-[#131e17]"
                >
                  Previous
                </Link>
              ) : null}
              <span className="px-2 text-sm font-semibold text-[#6e7a70]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="inline-flex h-11 items-center rounded-full bg-[#006a3f] px-4 text-sm font-bold text-white"
                >
                  Next
                </Link>
              ) : null}
            </div>
          ) : null}
        </TendersPageChrome>
      </Suspense>
    </AppShell>
  );
}

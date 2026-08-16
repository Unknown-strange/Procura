import Link from "next/link";
import { Clock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, formatDeadline } from "@/lib/utils";

export default async function SavedTendersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("saved_tenders")
        .select(
          `tender_id, tenders ( id, title, submission_deadline, source_url, ghaneps_id, procuring_entities ( name ) )`,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const items = (data ?? []).map((row) => {
    const raw = row.tenders as unknown;
    const t = (Array.isArray(raw) ? raw[0] : raw) as {
      id: string;
      title: string;
      submission_deadline: string | null;
      source_url: string;
      ghaneps_id: string | null;
      procuring_entities: { name: string } | { name: string }[] | null;
    } | null;
    const entity = Array.isArray(t?.procuring_entities)
      ? t?.procuring_entities[0]
      : t?.procuring_entities;
    return {
      id: row.tender_id,
      title: t?.title ?? "Tender",
      entity: entity?.name ?? null,
      deadline: t?.submission_deadline ?? null,
      ghaneps_id: t?.ghaneps_id ?? null,
      source_url: t?.source_url ?? "",
    };
  });

  return (
    <AppShell title="Tender Intelligence" searchPlaceholder="Search saved tenders...">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#131e17] sm:text-3xl">Saved Tenders</h2>
        <p className="mt-2 text-base text-[#6e7a70]">
          Tenders you saved so you can review them and continue on GHANEPS.
        </p>
      </div>

      <p className="mb-6 border-b border-[#d6dfd5] pb-3 text-sm font-bold text-[#006a3f]">
        All ({items.length})
      </p>

      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const days = daysUntil(item.deadline);
            const urgent = days !== null && days <= 5;
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]"
              >
                <h3 className="text-lg font-bold text-[#131e17]">{item.title}</h3>
                <p className="mt-1 text-sm text-[#6e7a70]">{item.entity}</p>
                <div className="mt-4 text-sm">
                  <p className="text-xs font-semibold text-[#6e7a70]">Deadline</p>
                  <p
                    className={`mt-1 inline-flex items-center gap-1 font-semibold ${urgent ? "text-[#ba1a1a]" : "text-[#131e17]"}`}
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatDeadline(item.deadline)}
                    {days !== null ? ` (${days} day${days === 1 ? "" : "s"})` : ""}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[#6e7a70]">GHANEPS reference</p>
                  <p className="mt-1 font-semibold text-[#131e17]">{item.ghaneps_id ?? "—"}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/tenders/${item.id}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-[#b4f0cb] px-4 text-sm font-bold text-[#006a3f]"
                  >
                    View Details
                  </Link>
                  <OpenOnGhaneps
                    sourceUrl={item.source_url}
                    ghanepsId={item.ghaneps_id}
                    showIcon={false}
                    className="inline-flex min-h-11 items-center rounded-full bg-[#006a3f] px-4 text-sm font-bold text-white"
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[#d6dfd5] bg-white px-5 py-8 text-base text-[#6e7a70]">
          You have not saved any tenders yet. Open a listing and choose{" "}
          <span className="font-semibold text-[#131e17]">Save Tender</span>.
        </p>
      )}
    </AppShell>
  );
}

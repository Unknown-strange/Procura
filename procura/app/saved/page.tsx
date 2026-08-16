import Link from "next/link";
import { Bookmark, Clock, Download, Filter, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { createClient } from "@/lib/supabase/server";
import { SEED_TENDERS } from "@/lib/data/seed-tenders";
import { daysUntil, formatDeadline } from "@/lib/utils";

export default async function SavedTendersPage() {
  let items = SEED_TENDERS.slice(0, 3).map((t, i) => ({
    id: t.id,
    title: t.title,
    entity: t.procuring_entity_name,
    deadline: t.submission_deadline,
    ghaneps_id: t.ghaneps_id,
    source_url: t.source_url,
    score: [92, 88, 65][i],
    status: (["Drafting Bid", "Ready to Apply", "Reviewing"] as const)[i],
  }));
  let authed = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      authed = true;
      const { data } = await supabase
        .from("saved_tenders")
        .select(
          `tender_id, tenders ( id, title, submission_deadline, source_url, ghaneps_id, procuring_entities ( name ) )`,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data?.length) {
        items = data.map((row, i) => {
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
            source_url: t?.source_url ?? "#",
            score: 80 + (i % 15),
            status: (["Drafting Bid", "Ready to Apply", "Reviewing"] as const)[i % 3],
          };
        });
      }
    }
  } catch {
    // seed UI
  }

  return (
    <AppShell title="Tender Intelligence" searchPlaceholder="Search saved tenders...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#131e17] sm:text-3xl">Saved Tenders</h2>
          <p className="mt-2 text-base text-[#6e7a70]">
            Manage and track procurement opportunities you are interested in.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-[#006a3f] bg-white px-4 text-sm font-bold text-[#006a3f]"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filter
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#006a3f] px-4 text-sm font-bold text-white"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export List
          </button>
        </div>
      </div>

      <div className="mb-6 -mx-1 flex gap-4 overflow-x-auto border-b border-[#d6dfd5] px-1 text-sm font-bold sm:gap-6">
        <span className="shrink-0 border-b-2 border-[#006a3f] pb-3 text-[#006a3f]">
          All ({items.length})
        </span>
        <span className="shrink-0 pb-3 text-[#6e7a70]">Closing Soon (3)</span>
        <span className="shrink-0 pb-3 text-[#6e7a70]">Ready to Apply (5)</span>
      </div>

      {!authed ? (
        <p className="mb-4 rounded-xl border border-[#d6dfd5] bg-[#eaf7ec] px-4 py-3 text-sm text-[#3e4941]">
          Showing sample cards. <Link href="/login" className="font-bold text-[#006a3f]">Log in</Link> to sync your saved tenders.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const days = daysUntil(item.deadline);
          const urgent = days !== null && days <= 5;
          const statusTone =
            item.status === "Ready to Apply"
              ? "text-[#006a3f]"
              : item.status === "Drafting Bid"
                ? "text-[#705d00]"
                : "text-[#6e7a70]";
          const StatusIcon =
            item.status === "Ready to Apply"
              ? CheckCircle2
              : item.status === "Drafting Bid"
                ? AlertCircle
                : FileText;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    item.score >= 85 ? "bg-[#b4f0cb] text-[#006a3f]" : "bg-[#e4f1e6] text-[#3e4941]"
                  }`}
                >
                  {item.score}% Match Score
                </span>
                <Bookmark className="h-5 w-5 text-[#006a3f]" aria-hidden />
              </div>
              <h3 className="text-lg font-bold text-[#131e17]">{item.title}</h3>
              <p className="mt-1 text-sm text-[#6e7a70]">{item.entity}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-[#6e7a70]">Deadline</p>
                  <p className={`mt-1 inline-flex items-center gap-1 font-semibold ${urgent ? "text-[#ba1a1a]" : "text-[#131e17]"}`}>
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    {formatDeadline(item.deadline)}
                    {days !== null ? ` (${days} Days)` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6e7a70]">Budget Est.</p>
                  <p className="mt-1 font-semibold text-[#131e17]">Not Disclosed</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6e7a70]">Tender No.</p>
                  <p className="mt-1 font-semibold text-[#131e17]">{item.ghaneps_id ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#6e7a70]">Status</p>
                  <p className={`mt-1 inline-flex items-center gap-1 font-semibold ${statusTone}`}>
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                    {item.status}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1">
                  {["TD", "BOQ"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#e4f1e6] px-2 py-1 text-[10px] font-bold text-[#3e4941]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/tenders/${item.id}`}
                    className="rounded-full bg-[#b4f0cb] px-4 py-2 text-sm font-bold text-[#006a3f]"
                  >
                    View Details
                  </Link>
                  <OpenOnGhaneps
                    sourceUrl={item.source_url}
                    ghanepsId={item.ghaneps_id}
                    showIcon={false}
                    className="rounded-full bg-[#006a3f] px-4 py-2 text-sm font-bold text-white"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

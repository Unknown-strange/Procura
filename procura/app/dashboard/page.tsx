import Link from "next/link";
import {
  Bookmark,
  Bot,
  Clock,
  Handshake,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { SaveTenderButton } from "@/components/tenders/tender-list";
import { countTenders, listTenders } from "@/lib/data/tenders";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, formatDeadline } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fullName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const [openCount, closingCount, open, closing] = await Promise.all([
    countTenders({ status: "open" }),
    countTenders({ status: "closing_soon" }),
    listTenders({ pageSize: 4, status: "open" }),
    listTenders({ pageSize: 3, status: "closing_soon" }),
  ]);

  let savedCount = 0;
  let matchCount = 0;
  let recommended = open.items;
  const matchScores = new Map<string, number>();

  if (user) {
    const [{ count: saved }, { count: matchesTotal }, { data: matches }] = await Promise.all([
      supabase
        .from("saved_tenders")
        .select("tender_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("tender_matches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("tender_matches")
        .select("tender_id, match_score")
        .eq("user_id", user.id)
        .order("match_score", { ascending: false })
        .limit(4),
    ]);
    savedCount = saved ?? 0;
    matchCount = matchesTotal ?? 0;
    for (const row of matches ?? []) {
      if (typeof row.match_score === "number") {
        matchScores.set(row.tender_id, Math.round(row.match_score * 100));
      }
    }
    const matchIds = (matches ?? []).map((m) => m.tender_id).filter(Boolean);
    if (matchIds.length) {
      const matchedItems = open.items.filter((t) => matchIds.includes(t.id));
      if (matchedItems.length) recommended = matchedItems;
    }
  }

  const closingList = closing.items;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const metrics = [
    {
      label: "Open tenders",
      value: String(openCount),
      hint: "From GHANEPS",
      icon: Zap,
      tone: "text-[#006a3f]",
    },
    {
      label: "Matching your business",
      value: String(matchCount),
      hint: matchCount ? "Based on your interests" : "Set interests to get matches",
      icon: Handshake,
      tone: "text-[#705d00]",
    },
    {
      label: "Closing soon",
      value: String(closingCount),
      hint: closingCount ? "Within 3 days" : "None right now",
      icon: Clock,
      tone: "text-[#ba1a1a]",
      urgent: closingCount > 0,
    },
    {
      label: "Saved tenders",
      value: String(savedCount),
      hint: "Your list",
      icon: Bookmark,
      tone: "text-[#006a3f]",
    },
  ];

  return (
    <AppShell title="Tender Intelligence">
      <p className="mb-6 text-lg text-[#3e4941]">
        <span className="font-bold text-[#131e17]">
          {greeting}, {fullName}.
        </span>{" "}
        Here are the procurement opportunities and actions that need your attention.
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#6e7a70]">{m.label}</p>
                <p className={`mt-2 text-3xl font-bold ${m.urgent ? "text-[#ba1a1a]" : "text-[#131e17]"}`}>
                  {m.value}
                </p>
                <p className={`mt-1 text-[13px] font-semibold ${m.urgent ? "text-[#ba1a1a]" : "text-[#6e7a70]"}`}>
                  {m.hint}
                </p>
              </div>
              <m.icon className={`h-6 w-6 ${m.tone}`} aria-hidden />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#131e17]">Recommended Tenders</h2>
            <Link href="/tenders" className="text-sm font-semibold text-[#006a3f]">
              View all →
            </Link>
          </div>
          {recommended.length ? (
            <div className="grid gap-4">
              {recommended.map((t) => {
                const score = matchScores.get(t.id);
                return (
                  <article
                    key={t.id}
                    className="rounded-2xl border border-[#d6dfd5] bg-white p-6 shadow-[0_2px_4px_rgba(32,43,36,0.04)]"
                  >
                    <div className="mb-3 flex flex-wrap gap-2">
                      {t.procurement_type ? (
                        <span className="rounded-full bg-[#e4f1e6] px-3 py-1 text-xs font-semibold text-[#3e4941]">
                          {t.procurement_type}
                        </span>
                      ) : null}
                      {t.region ? (
                        <span className="rounded-full bg-[#e4f1e6] px-3 py-1 text-xs font-semibold text-[#3e4941]">
                          {t.region}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-bold text-[#006a3f]">{t.title}</h3>
                    <p className="mt-1 text-sm text-[#6e7a70]">{t.procuring_entity_name}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#d6dfd5] pt-4">
                      <p className="text-sm font-semibold text-[#131e17]">
                        Deadline {formatDeadline(t.submission_deadline)}
                      </p>
                      {score != null ? (
                        <p className="text-sm font-bold text-[#006a3f]">Match {score}%</p>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/tenders/${t.id}`}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white"
                      >
                        View Tender
                      </Link>
                      <SaveTenderButton tenderId={t.id} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#d6dfd5] bg-white px-5 py-8 text-base text-[#6e7a70]">
              No tenders to show yet. Listings appear after Procura reads current tenders from
              GHANEPS.
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-[#131e17]">Closing Soon</h3>
              {closingList.length ? (
                <span className="rounded-full bg-[#ffdad6] px-3 py-1 text-[11px] font-bold uppercase text-[#ba1a1a]">
                  Action needed
                </span>
              ) : null}
            </div>
            {closingList.length ? (
              <ul className="space-y-4">
                {closingList.map((t) => {
                  const days = daysUntil(t.submission_deadline);
                  return (
                    <li key={t.id} className="border-b border-[#d6dfd5] pb-3 last:border-0 last:pb-0">
                      <Link href={`/tenders/${t.id}`} className="font-semibold text-[#131e17]">
                        {t.title}
                      </Link>
                      <p className="mt-1 text-sm font-bold text-[#ba1a1a]">
                        {days === null
                          ? "Deadline not specified"
                          : days <= 0
                            ? "Closes today"
                            : `${days} day${days === 1 ? "" : "s"} left`}
                      </p>
                      <p className="text-xs text-[#6e7a70]">
                        {[t.procuring_entity_name, t.region].filter(Boolean).join(" • ")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-[#6e7a70]">No tenders are closing in the next 3 days.</p>
            )}
          </div>

          <div className="rounded-2xl border border-[#d6dfd5] bg-[#eaf7ec] p-5">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#006a3f] text-white">
              <Bot className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-[#131e17]">Need help understanding a tender?</h3>
            <p className="mt-2 text-sm leading-6 text-[#3e4941]">
              Use the assistant for a plain-language checklist, then continue on GHANEPS to bid.
            </p>
            <Link
              href="/assistant"
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Start Assistant
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { AlertTriangle, FileWarning, Filter, Timer, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { createClient } from "@/lib/supabase/server";
import { SEED_TENDERS } from "@/lib/data/seed-tenders";
import { ghanepsTenderUrl } from "@/lib/ghaneps";

export default async function AlertsPage() {
  let notifications: Array<{
    id: string;
    title: string;
    body: string | null;
    ghaneps_url: string | null;
    link_url: string | null;
    created_at: string;
  }> = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, ghaneps_url, link_url, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      notifications = data ?? [];
    }
  } catch {
    // demo
  }

  const demo =
    notifications.length > 0
      ? notifications
      : [
          {
            id: "1",
            title: SEED_TENDERS[4]?.title ?? "Ministry of Health - Server Procurement",
            body: "New tender matches your business profile based on your tender type interests.",
            ghaneps_url: ghanepsTenderUrl({
              source_url: SEED_TENDERS[4]?.source_url,
              ghaneps_id: SEED_TENDERS[4]?.ghaneps_id,
            }),
            link_url: `/tenders/${SEED_TENDERS[4]?.id ?? ""}`,
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            title: SEED_TENDERS[2]?.title ?? "Consultancy Services",
            body: "Highly relevant match detected for your saved tender type preferences.",
            ghaneps_url: ghanepsTenderUrl({
              source_url: SEED_TENDERS[2]?.source_url,
              ghaneps_id: SEED_TENDERS[2]?.ghaneps_id,
            }),
            link_url: `/tenders/${SEED_TENDERS[2]?.id ?? ""}`,
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
        ];

  return (
    <AppShell title="Tender Intelligence" searchPlaceholder="Search...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#131e17] sm:text-3xl">Notification Center</h2>
          <p className="mt-2 text-base text-[#6e7a70]">Review and manage your alerts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border-2 border-[#006a3f] bg-white px-4 text-sm font-bold text-[#006a3f]"
          >
            Mark all read
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#006a3f] px-4 text-sm font-bold text-white"
          >
            <Filter className="h-4 w-4" aria-hidden />
            Filter
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#006a3f]" aria-hidden />
            <h3 className="text-lg font-bold text-[#131e17]">New Matches</h3>
            <span className="rounded-full bg-[#b4f0cb] px-2 py-0.5 text-xs font-bold text-[#006a3f]">
              {demo.length} New
            </span>
          </div>
          <div className="space-y-4">
            {demo.map((n, i) => (
              <article
                key={n.id}
                className="rounded-2xl border border-[#d6dfd5] border-l-4 border-l-[#006a3f] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#b4f0cb] px-3 py-1 text-xs font-bold text-[#006a3f]">
                    {i === 0 ? "IT Infrastructure" : "Consultancy"}
                  </span>
                  <span className="text-xs font-medium text-[#6e7a70]">
                    {i === 0 ? "10 mins ago" : "2 hours ago"}
                  </span>
                </div>
                <h4 className="text-base font-bold text-[#131e17]">{n.title}</h4>
                <p className="mt-1 text-sm text-[#6e7a70]">{n.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {n.link_url ? (
                    <Link
                      href={n.link_url}
                      className="rounded-xl border border-[#006a3f] px-4 py-2 text-sm font-bold text-[#006a3f]"
                    >
                      View on Procura
                    </Link>
                  ) : null}
                  {n.ghaneps_url ? (
                    <OpenOnGhaneps
                      sourceUrl={n.ghaneps_url}
                      showIcon={false}
                      className="rounded-xl bg-[#006a3f] px-4 py-2 text-sm font-bold text-white"
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#d6dfd5] bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <Timer className="h-5 w-5 text-[#ba1a1a]" aria-hidden />
              <h3 className="font-bold text-[#131e17]">Deadline Reminders</h3>
            </div>
            <div className="rounded-xl border border-[#ffdad6] bg-[#fff8f7] p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-[#ba1a1a]" aria-hidden />
                <div>
                  <p className="font-bold text-[#131e17]">GRA Data Center Upgrade</p>
                  <p className="text-sm font-bold text-[#ba1a1a]">Closes in 48 hours</p>
                  <p className="mt-1 text-sm text-[#6e7a70]">
                    Check your documents before continuing on GHANEPS.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d6dfd5] bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-[#705d00]" aria-hidden />
              <h3 className="font-bold text-[#131e17]">Document Expiry</h3>
            </div>
            <div className="rounded-xl border border-[#ffe16e] bg-[#fffbeb] p-4">
              <p className="font-bold text-[#131e17]">Tax Clearance Certificate</p>
              <p className="mt-1 text-sm text-[#6e7a70]">
                Expires soon. Renewal is required to maintain tender eligibility.
              </p>
              <Link href="/documents" className="mt-3 inline-block text-sm font-bold text-[#006a3f]">
                Update Document →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

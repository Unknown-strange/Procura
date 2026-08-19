import Link from "next/link";
import { Zap } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from("notifications")
        .select("id, title, body, ghaneps_url, link_url, created_at, notification_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const notifications = data ?? [];

  return (
    <AppShell title="Tender Intelligence" searchPlaceholder="Search...">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#131e17] sm:text-3xl">Notification Center</h2>
        <p className="mt-2 text-base text-[#6e7a70]">Review alerts for tenders that match your interests.</p>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#006a3f]" aria-hidden />
          <h3 className="text-lg font-bold text-[#131e17]">New matches</h3>
          <span className="rounded-full bg-[#b4f0cb] px-2 py-0.5 text-xs font-bold text-[#006a3f]">
            {notifications.length}
          </span>
        </div>
        {notifications.length ? (
          <div className="space-y-4">
            {notifications.map((n) => (
              <article
                key={n.id}
                className="rounded-2xl border border-[#d6dfd5] border-l-4 border-l-[#006a3f] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-[#b4f0cb] px-3 py-1 text-xs font-bold text-[#006a3f]">
                    {n.notification_type === "deadline" ? "Deadline" : "Match"}
                  </span>
                  <span className="text-xs font-medium text-[#6e7a70]">
                    {formatRelativeTime(n.created_at)}
                  </span>
                </div>
                <h4 className="text-base font-bold text-[#131e17]">{n.title}</h4>
                {n.body ? <p className="mt-1 text-sm text-[#6e7a70]">{n.body}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {n.link_url ? (
                    <Link
                      href={n.link_url}
                      className="inline-flex min-h-11 items-center rounded-xl border border-[#006a3f] px-4 text-sm font-bold text-[#006a3f]"
                    >
                      View on Procura
                    </Link>
                  ) : null}
                  {n.ghaneps_url ? (
                    <OpenOnGhaneps
                      sourceUrl={n.ghaneps_url}
                      showIcon={false}
                      className="inline-flex min-h-11 items-center rounded-xl bg-[#006a3f] px-4 text-sm font-bold text-white"
                    />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#d6dfd5] bg-white px-5 py-8 text-base text-[#6e7a70]">
            No alerts yet. When a new GHANEPS tender matches the types you chose, it
            will show up here and in your email.
          </p>
        )}
      </section>
    </AppShell>
  );
}

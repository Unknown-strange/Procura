import Link from "next/link";
import {
  Bookmark,
  Bot,
  CheckCircle2,
  Clock,
  Handshake,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { listTenders } from "@/lib/data/tenders";
import { createClient } from "@/lib/supabase/server";
import { formatDeadline } from "@/lib/utils";

export default async function DashboardPage() {
  const open = await listTenders({ pageSize: 4, status: "open" });
  const closing = await listTenders({ pageSize: 3, status: "closing_soon" });

  let fullName = "Kwame";
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    fullName =
      (data.user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
      "Kwame";
  } catch {
    // demo name from mockup
  }

  const recommended = open.items.slice(0, 2);
  const closingList = closing.items.length ? closing.items : open.items.slice(0, 3);

  return (
    <AppShell title="Tender Intelligence">
      <p className="mb-6 text-lg text-[#3e4941]">
        <span className="font-bold text-[#131e17]">Good morning, {fullName}.</span>{" "}
        Here are the procurement opportunities and actions that need your attention.
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "New Tenders",
            value: "24",
            hint: "+3 today",
            icon: Zap,
            tone: "text-[#006a3f]",
            badge: "NEW",
          },
          {
            label: "Matching Your Business",
            value: "8",
            hint: "High relevancy",
            icon: Handshake,
            tone: "text-[#705d00]",
          },
          {
            label: "Closing Soon",
            value: "3",
            hint: "Urgent",
            icon: Clock,
            tone: "text-[#ba1a1a]",
            urgent: true,
          },
          {
            label: "Saved Tenders",
            value: "12",
            hint: "Pending review",
            icon: Bookmark,
            tone: "text-[#006a3f]",
          },
        ].map((m) => (
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
          <div className="grid gap-4">
            {recommended.map((t, i) => (
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
                  <p className="inline-flex items-center gap-1 text-sm font-bold text-[#006a3f]">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Match Score {i === 0 ? "94%" : "88%"}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/tenders/${t.id}`}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white"
                  >
                    View Tender
                  </Link>
                  <button
                    type="button"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#006a3f] bg-white px-5 text-sm font-bold text-[#006a3f]"
                  >
                    <Bookmark className="h-4 w-4" aria-hidden />
                    Save
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-[#131e17]">Closing Soon</h3>
              <span className="rounded-full bg-[#ffdad6] px-3 py-1 text-[11px] font-bold uppercase text-[#ba1a1a]">
                Action Needed
              </span>
            </div>
            <ul className="space-y-4">
              {closingList.map((t, idx) => (
                <li key={t.id} className="border-b border-[#d6dfd5] pb-3 last:border-0 last:pb-0">
                  <Link href={`/tenders/${t.id}`} className="font-semibold text-[#131e17]">
                    {t.title}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-[#ba1a1a]">
                    {idx === 0 ? "2 Days" : idx === 1 ? "5 Days" : "7 Days"}
                  </p>
                  <p className="text-xs text-[#6e7a70]">
                    {t.procuring_entity_name} • {t.region}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#d6dfd5] bg-[#eaf7ec] p-5">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#006a3f] text-white">
              <Bot className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-[#131e17]">Need help drafting?</h3>
            <p className="mt-2 text-sm leading-6 text-[#3e4941]">
              Use our AI assistant to generate compliance checklists and draft responses.
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

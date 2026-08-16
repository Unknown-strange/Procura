import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import { RecordTenderClick } from "@/components/tenders/record-tender-click";
import { SaveTenderButton } from "@/components/tenders/tender-list";
import { getTenderById } from "@/lib/data/tenders";
import { daysUntil, formatDeadline } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export default async function TenderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const tender = await getTenderById(id);
  if (!tender) notFound();

  const days = daysUntil(tender.submission_deadline);
  const urgent = days !== null && days <= 3;

  return (
    <AppShell title="Tender Details">
      <RecordTenderClick tenderId={tender.id} />
      <Link
        href="/tenders"
        className="mb-6 inline-flex min-h-12 items-center gap-2 text-base font-semibold text-[#006a3f]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Find Tenders
      </Link>

      <article className="mb-6 rounded-2xl border border-[#d6dfd5] border-l-4 border-l-[#006a3f] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:p-8">
        <div className="flex flex-wrap gap-2">
          {tender.procurement_type ? (
            <span className="rounded-full bg-[#e4f1e6] px-3 py-1 text-xs font-semibold text-[#3e4941]">
              {tender.procurement_type}
            </span>
          ) : null}
          {tender.region ? (
            <span className="rounded-full bg-[#e4f1e6] px-3 py-1 text-xs font-semibold text-[#3e4941]">
              {tender.region}
            </span>
          ) : null}
          {urgent ? (
            <span className="rounded-full bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#ba1a1a]">
              Closing soon
            </span>
          ) : (
            <span className="rounded-full bg-[#b4f0cb] px-3 py-1 text-xs font-bold text-[#006a3f]">
              OPEN
            </span>
          )}
        </div>

        <h2 className="mt-4 text-2xl font-bold text-[#131e17] md:text-[32px] md:leading-10">
          {tender.title}
        </h2>
        <p className="mt-2 text-lg text-[#6e7a70]">{tender.procuring_entity_name}</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-[#6e7a70]">Deadline</dt>
            <dd className="text-base font-semibold text-[#131e17]">
              {formatDeadline(tender.submission_deadline)}
              {days !== null ? ` (${days} day${days === 1 ? "" : "s"} left)` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[#6e7a70]">GHANEPS reference</dt>
            <dd className="text-base font-semibold text-[#131e17]">{tender.ghaneps_id ?? "—"}</dd>
          </div>
        </dl>

        <p className="mt-6 text-lg leading-7 text-[#131e17]">{tender.description}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <OpenOnGhaneps
            sourceUrl={tender.source_url}
            ghanepsId={tender.ghaneps_id}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white"
          />
          <SaveTenderButton tenderId={tender.id} />
          <Link
            href={`/assistant?tender=${tender.id}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-[#006a3f]"
          >
            <Sparkles className="h-5 w-5" aria-hidden />
            Ask AI about this tender
          </Link>
        </div>
      </article>

      <section className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:p-8">
        <h3 className="text-xl font-semibold text-[#131e17]">Documents listed</h3>
        <p className="mt-1 text-base text-[#6e7a70]">
          Official packages are on GHANEPS. Use Open on GHANEPS to download and submit.
        </p>
        <ul className="mt-4 space-y-3">
          {tender.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-2 rounded-xl border border-[#d6dfd5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="text-base font-medium text-[#131e17]">{doc.title}</span>
              <span className="rounded-full bg-[#e4f1e6] px-3 py-1 text-xs font-semibold text-[#3e4941]">
                {doc.document_type ?? "document"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}

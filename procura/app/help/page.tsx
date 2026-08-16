import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function HelpPage() {
  return (
    <AppShell title="Tender Intelligence">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:p-8">
        <h2 className="text-2xl font-bold text-[#131e17]">Help & Support</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-lg leading-7 text-[#131e17]">
          <li>Find tenders sourced from GHANEPS.</li>
          <li>On Company Profile, add the types of tenders you bid for so we can email matching listings.</li>
          <li>Use Tender Assistant to understand requirements and check documents.</li>
          <li>Open the tender on GHANEPS to download packages and submit your bid.</li>
        </ol>
        <p className="mt-6 text-base text-[#6e7a70]">
          All tender information on this website is sourced from the GHANEPS website.
        </p>
        <Link href="/tenders" className="mt-6 inline-block text-base font-bold text-[#006a3f]">
          Go to Find Tenders →
        </Link>
      </div>
    </AppShell>
  );
}

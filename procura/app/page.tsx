import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Check,
  Search,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { LandingHeader } from "@/components/home/landing-header";
import { TenderCountTicker } from "@/components/home/tender-count-ticker";
import { countTenders } from "@/lib/data/tenders";

export default async function LandingPage() {
  const initialCount = await countTenders({ status: "active" });

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-[#131e17]">
      <LandingHeader />

      <section className="relative overflow-hidden bg-gradient-to-b from-[#F0F9F4] to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:py-14 md:grid-cols-2 md:gap-12 md:px-8 md:py-20">
          <div>
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#FFD700]/90 px-3 py-1 text-[11px] font-bold text-[#3d3200] sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">AI-Powered Procurement Intelligence</span>
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-[#0f1a14] sm:text-4xl md:text-5xl">
              Find the Right Tenders. Understand the Requirements.{" "}
              <span className="text-[#28A745] underline decoration-[#28A745]/40 underline-offset-4">
                Bid With Confidence.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#5a6660] md:text-lg">
              Discover relevant procurement opportunities across Ghana&apos;s public sector.
              Understand complex tender requirements instantly, and use AI to prepare your business
              for the opportunities that matter most.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/tenders"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#005C35] px-5 text-sm font-bold text-white"
              >
                Explore Tenders
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center rounded-lg border border-[#005C35] bg-white px-5 text-sm font-bold text-[#005C35]"
              >
                How It Works
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-[#d6e5db] bg-white p-4 shadow-[0_20px_50px_rgba(15,40,25,0.12)]">
              <div className="mb-4 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>

              <div className="rounded-xl bg-[#F0F9F4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6e7a70]">
                      Total Tenders on GHANEPS
                    </p>
                    <p className="mt-1 text-3xl font-bold tabular-nums text-[#0f1a14]">
                      <TenderCountTicker initialCount={initialCount} />
                    </p>
                  </div>
                  <span className="rounded-full bg-[#28A745]/15 px-2.5 py-1 text-xs font-bold text-[#005C35]">
                    Live
                  </span>
                </div>

                <div className="mt-6 flex h-28 items-end gap-2">
                  {[40, 55, 35, 70, 48, 90, 60, 45].map((h, i) => (
                    <div key={i} className="relative flex-1">
                      {i === 5 ? (
                        <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#005C35] px-1.5 py-0.5 text-[9px] font-bold text-white sm:inline">
                          Peak Season
                        </span>
                      ) : null}
                      <div
                        className={`w-full rounded-t ${i === 5 ? "bg-[#005C35]" : "bg-[#b7dcc6]"}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#e8eee9] bg-white p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[#005C35]">
                    <Bookmark className="h-3.5 w-3.5" aria-hidden />
                    <span className="text-[11px] font-semibold text-[#6e7a70]">Save tenders</span>
                  </div>
                  <p className="text-sm font-bold leading-5 text-[#0f1a14]">Keep a shortlist</p>
                </div>
                <div className="rounded-xl border border-[#e8eee9] bg-white p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[#c9a910]">
                    <Bell className="h-3.5 w-3.5" aria-hidden />
                    <span className="text-[11px] font-semibold text-[#6e7a70]">Email alerts</span>
                  </div>
                  <p className="text-sm font-bold leading-5 text-[#0f1a14]">When a match appears</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-16 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#0f1a14] md:text-4xl">
            A Smarter Way to Procure
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5a6660] md:text-lg">
            Designed specifically for the Ghanaian public sector, our platform streamlines
            discovery, simplifies requirements, and accelerates your bidding process.
          </p>
        </div>
      </section>

      <section id="features" className="px-4 pb-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-[#e8eee9] bg-white p-6 shadow-[0_8px_24px_rgba(15,40,25,0.06)] md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F6EE] text-[#005C35]">
              <Search className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-bold text-[#0f1a14]">Intelligent Tender Discovery</h3>
            <p className="mt-3 text-base leading-7 text-[#5a6660]">
              Search across all active Ghanaian government tenders with advanced semantic filtering.
              Find exactly what matches your company&apos;s capabilities without sifting through
              noise.
            </p>
            <div className="mt-6 rounded-xl border border-[#d6e5db] bg-[#F0F9F4] p-4 md:rotate-[-1.5deg]">
              <div className="mb-2 flex gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#005C35]">
                  Construction
                </span>
                <span className="rounded-full bg-[#28A745]/15 px-2.5 py-1 text-[11px] font-bold text-[#005C35]">
                  Active
                </span>
              </div>
              <p className="text-sm font-bold text-[#0f1a14]">Works tenders that match your types</p>
              <p className="mt-1 text-xs text-[#6e7a70]">Matched to the procurement types you choose</p>
            </div>
          </article>

          <article className="rounded-2xl border border-[#e8eee9] bg-white p-6 shadow-[0_8px_24px_rgba(15,40,25,0.06)] md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF6C7] text-[#9a7b00]">
              <Bell className="h-6 w-6" aria-hidden />
            </div>
            <h3 className="mt-5 text-xl font-bold text-[#0f1a14]">Personalized Alerts</h3>
            <p className="mt-3 text-base leading-7 text-[#5a6660]">
              Never miss a critical deadline. Set alerts for the tender types you bid for.
            </p>
            <div className="mt-6 rounded-xl border border-[#e8eee9] bg-[#F8FBF9] p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#28A745]">
                New Match Found
              </p>
              <p className="mt-1 text-sm font-bold text-[#0f1a14]">
                A new listing that matches your tender types
              </p>
              <p className="mt-1 text-xs text-[#6e7a70]">
                We email you when a GHANEPS tender fits what you chose
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="px-4 pb-20 md:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#F0F9F4] px-6 py-10 md:px-12 md:py-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#005C35] px-3 py-1 text-xs font-bold text-white">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Tender Assistant
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0f1a14] md:text-4xl">
                Decode Complex Requirements Instantly
              </h2>
              <p className="mt-4 text-base leading-7 text-[#5a6660]">
            Upload hefty tender documents and let our AI extract key requirements, dates, and
            evaluation criteria. We assume your company registration, tax, SSNIT, and financials
            are already in order.
              </p>
              <ul className="mt-6 space-y-3">
                {["Automated Compliance Checklists", "Key Date Extraction"].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm font-semibold text-[#0f1a14]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#28A745] text-white">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/assistant"
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#005C35] px-5 text-sm font-bold text-white"
              >
                Try Tender Assistant
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="rounded-2xl border border-[#d6e5db] bg-white p-5 shadow-[0_12px_30px_rgba(15,40,25,0.08)]">
              <div className="mb-4 flex justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-br-md bg-[#eef1ef] px-4 py-3 text-sm leading-6 text-[#0f1a14]">
                  What does this tender pack actually ask us to submit?
                </div>
              </div>
              <div className="flex gap-2">
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#005C35] text-white">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="rounded-2xl rounded-bl-md bg-[#E8F6EE] px-4 py-3 text-sm leading-6 text-[#0f1a14]">
                  <p>From the uploaded tender document, the pack asks you to complete:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>The bidding forms in the GHANEPS pack</li>
                    <li>Technical schedules, if listed in the IFB</li>
                    <li>Evidence of similar work, if the notice asks for it</li>
                    <li>Bid security, only if this tender requires it</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#121a16] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center md:px-8">
          <div className="flex justify-center">
            <BrandMark size="md" showPortal={false} href={null} light />
          </div>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#a8b5ae]">
            Empowering businesses to navigate public procurement with confidence, clarity, and
            intelligence.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-5 text-[#7a8780]">
            All tender information on this website is sourced from the GHANEPS website.
          </p>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-[#8f9b95] md:flex-row md:px-8">
            <p>© {new Date().getFullYear()} Procura. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

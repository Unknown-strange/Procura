"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Check,
  Hammer,
  MapPin,
  Package,
  Recycle,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { createClient } from "@/lib/supabase/client";
import {
  GHANA_REGION_OPTIONS,
  PROCUREMENT_TYPE_OPTIONS,
  type GhanaRegionOption,
  type ProcurementTypeOption,
} from "@/lib/ghaneps";

const TYPE_ICONS: Record<ProcurementTypeOption, LucideIcon> = {
  Goods: Package,
  Works: Hammer,
  "Consulting Services": Briefcase,
  "Technical Services": Wrench,
  Disposals: Recycle,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [types, setTypes] = useState<ProcurementTypeOption[]>([]);
  const [regions, setRegions] = useState<GhanaRegionOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canContinue = types.length > 0 && regions.length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("procurement_types, regions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!prefs || cancelled) return;

        const savedTypes = (prefs.procurement_types ?? []).filter(
          (t: string): t is ProcurementTypeOption =>
            PROCUREMENT_TYPE_OPTIONS.some((o) => o.value === t),
        );
        const savedRegions = (prefs.regions ?? []).filter((r: string): r is GhanaRegionOption =>
          (GHANA_REGION_OPTIONS as readonly string[]).includes(r),
        );
        if (savedTypes.length) setTypes(Array.from(new Set(savedTypes)));
        if (savedRegions.length) setRegions(Array.from(new Set(savedRegions)));
      } catch {
        // offline / no supabase
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const typeHint = useMemo(
    () =>
      types.length
        ? `${types.length} type${types.length === 1 ? "" : "s"} selected`
        : "Select at least one type",
    [types.length],
  );
  const regionHint = useMemo(
    () =>
      regions.length
        ? `${regions.length} region${regions.length === 1 ? "" : "s"} selected`
        : "Select at least one region",
    [regions.length],
  );

  function toggleType(value: ProcurementTypeOption) {
    setTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
    );
  }

  function toggleRegion(value: GhanaRegionOption) {
    setRegions((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canContinue) {
      setError("Choose at least one tender type and one region to continue.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { error: saveError } = await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          procurement_types: types,
          regions,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (saveError) {
        setError(saveError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not save your preferences. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f0fdf1] px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex justify-center sm:mb-8">
          <BrandMark showPortal={false} href={null} />
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_12px_24px_rgba(32,43,36,0.08)] sm:p-8 md:p-10"
        >
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#006a3f]">
            Set up your alerts
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#131e17] sm:text-3xl">
            What tenders should we watch for you?
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#3e4941] sm:text-base">
            Pick the GHANEPS types you bid for and the regions you work in. We use this to
            match tenders and send you email alerts.
          </p>

          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-bold text-[#131e17]">Tender types</h2>
              <p className="text-sm font-medium text-[#6e7a70]">{typeHint}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PROCUREMENT_TYPE_OPTIONS.map((opt) => {
                const selected = types.includes(opt.value);
                const Icon = TYPE_ICONS[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleType(opt.value)}
                    aria-pressed={selected}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-[#006a3f] bg-[#eaf7ec] ring-2 ring-[#006a3f]/20"
                        : "border-[#d6dfd5] bg-white hover:border-[#006a3f]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          selected ? "bg-[#006a3f] text-white" : "bg-[#f0fdf1] text-[#006a3f]"
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      {selected ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#006a3f] text-white">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-base font-bold text-[#131e17]">{opt.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#3e4941]">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-bold text-[#131e17]">Regions</h2>
              <p className="text-sm font-medium text-[#6e7a70]">{regionHint}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {GHANA_REGION_OPTIONS.map((region) => {
                const selected = regions.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleRegion(region)}
                    aria-pressed={selected}
                    className={`rounded-2xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-[#006a3f] bg-[#eaf7ec] ring-2 ring-[#006a3f]/20"
                        : "border-[#d6dfd5] bg-white hover:border-[#006a3f]/40"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <MapPin
                        className={`h-4 w-4 shrink-0 ${selected ? "text-[#006a3f]" : "text-[#6e7a70]"}`}
                        aria-hidden
                      />
                      {selected ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#006a3f] text-white">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                      ) : null}
                    </span>
                    <p className="mt-2 text-sm font-bold leading-5 text-[#131e17]">{region}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {error ? (
            <p className="mt-6 rounded-xl bg-[#ffdad6] px-3 py-2 text-sm font-medium text-[#ba1a1a]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !canContinue}
            className="mt-8 h-12 w-full rounded-xl bg-[#006a3f] text-base font-bold text-white disabled:opacity-60"
          >
            {loading ? "Saving…" : "Continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/client";
import {
  PROCUREMENT_TYPE_OPTIONS,
  normalizeProcurementType,
  type ProcurementTypeOption,
} from "@/lib/ghaneps";

export default function CompanyProfilePage() {
  const [legalName, setLegalName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [interestTypes, setInterestTypes] = useState<ProcurementTypeOption[]>([]);
  const [typeToAdd, setTypeToAdd] = useState<"" | ProcurementTypeOption>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const availableTypes = useMemo(
    () => PROCUREMENT_TYPE_OPTIONS.filter((o) => !interestTypes.includes(o.value)),
    [interestTypes],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          if (!cancelled) {
            const metaName =
              typeof user?.user_metadata?.company_name === "string"
                ? user.user_metadata.company_name
                : "";
            if (metaName) setLegalName(metaName);
            setHydrating(false);
          }
          return;
        }

        const metaName =
          typeof user.user_metadata?.company_name === "string"
            ? user.user_metadata.company_name
            : "";

        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, companies ( id, legal_name )")
          .eq("id", user.id)
          .maybeSingle();

        const companyRaw = profile?.companies as unknown;
        const company = (
          Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
        ) as { id: string; legal_name: string } | null;

        if (company) {
          setCompanyId(company.id);
          setLegalName(company.legal_name || metaName);
        } else {
          setLegalName(metaName);
        }

        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("procurement_types")
          .eq("user_id", user.id)
          .maybeSingle();

        const types = (prefs?.procurement_types ?? [])
          .map((t: string) => normalizeProcurementType(t))
          .filter((t: ProcurementTypeOption | null): t is ProcurementTypeOption => Boolean(t));
        setInterestTypes(Array.from(new Set(types)));
      } catch {
        // offline / no supabase
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function addInterestType() {
    if (!typeToAdd) return;
    setInterestTypes((prev) => (prev.includes(typeToAdd) ? prev : [...prev, typeToAdd]));
    setTypeToAdd("");
  }

  function removeInterestType(value: ProcurementTypeOption) {
    setInterestTypes((prev) => prev.filter((t) => t !== value));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = legalName.trim();
    if (!name) {
      setMessage("Please enter your company name before saving.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Log in to save your company profile and tender interests.");
        return;
      }

      if (companyId) {
        const { error } = await supabase
          .from("companies")
          .update({
            legal_name: name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", companyId);
        if (error) {
          setMessage(error.message);
          return;
        }
      } else {
        const { data: company, error } = await supabase
          .from("companies")
          .insert({
            legal_name: name,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) {
          setMessage(error.message);
          return;
        }
        setCompanyId(company.id);
        await supabase.from("profiles").update({ company_id: company.id }).eq("id", user.id);
      }

      await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          procurement_types: interestTypes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      setMessage("Company profile and tender interests saved.");
    } catch {
      setMessage("Could not save. Connect Supabase and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Company Profile">
      <div className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf7ec] text-[#006a3f]">
            <Building2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-xl font-bold text-[#131e17]">Company profile</h2>
            <p className="mt-1 text-base text-[#6e7a70]">
              Add your company name and the GHANEPS tender types you bid for.
            </p>
          </div>
        </div>

        {hydrating ? (
          <p className="mt-8 text-sm text-[#6e7a70]">Loading profile…</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 max-w-3xl space-y-8">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#3e4941]" htmlFor="company-name">
                Company name
              </label>
              {!legalName.trim() ? (
                <p className="mb-2 text-sm font-medium text-[#705d00]">
                  What is your company called? Enter it below.
                </p>
              ) : null}
              <input
                id="company-name"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Horizon Builders Ltd"
                className="h-12 w-full rounded-xl border border-[#d6dfd5] px-4 text-base focus:border-2 focus:border-[#006a3f] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-[#3e4941]" htmlFor="tender-type">
                Types of tenders you go after
              </label>
              <p className="mb-3 text-sm text-[#6e7a70]">
                Choose a type from the dropdown — it appears as a card below. Add as many as you
                need, then save.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  id="tender-type"
                  value={typeToAdd}
                  onChange={(e) => setTypeToAdd(e.target.value as "" | ProcurementTypeOption)}
                  className="h-12 w-full rounded-xl border border-[#d6dfd5] bg-white px-4 text-base focus:border-2 focus:border-[#006a3f] focus:outline-none sm:flex-1"
                >
                  <option value="">Select tender type…</option>
                  {availableTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addInterestType}
                  disabled={!typeToAdd}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add
                </button>
              </div>

              {interestTypes.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {interestTypes.map((value) => {
                    const meta = PROCUREMENT_TYPE_OPTIONS.find((o) => o.value === value);
                    return (
                      <article
                        key={value}
                        className="relative rounded-2xl border border-[#d6dfd5] border-l-4 border-l-[#006a3f] bg-[#f0fdf1] p-4"
                      >
                        <button
                          type="button"
                          onClick={() => removeInterestType(value)}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-[#6e7a70] hover:bg-white"
                          aria-label={`Remove ${value}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <p className="pr-8 text-base font-bold text-[#006a3f]">{meta?.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[#3e4941]">
                          {meta?.description}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-[#d6dfd5] px-4 py-6 text-center text-sm text-[#6e7a70]">
                  No tender types added yet. Pick one from the dropdown above.
                </p>
              )}
            </div>

            {message ? <p className="text-sm font-medium text-[#3e4941]">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 items-center rounded-xl bg-[#006a3f] px-6 text-base font-bold text-white disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}

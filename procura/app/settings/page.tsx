"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/client";
import { GHANA_REGION_OPTIONS } from "@/lib/ghaneps";

type Tab = "Profile" | "Notifications" | "Security";
type DigestFrequency = "immediate" | "daily" | "weekly" | "off";

const TABS: Tab[] = ["Profile", "Notifications", "Security"];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");
  const [fullName, setFullName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState<DigestFrequency>("immediate");
  const [regions, setRegions] = useState<string[]>([]);
  const [regionToAdd, setRegionToAdd] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const availableRegions = useMemo(
    () => GHANA_REGION_OPTIONS.filter((r) => !regions.includes(r)),
    [regions],
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
          if (!cancelled) setHydrating(false);
          return;
        }

        setAccountEmail(user.email ?? "");

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.full_name) setFullName(profile.full_name);

        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("regions, email_alerts")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prefs) {
          setEmailAlerts(prefs.email_alerts ?? true);
          const saved = (prefs.regions ?? []).filter((r: string): r is string => Boolean(r));
          setRegions(Array.from(new Set(saved)));
        }

        const { data: notif } = await supabase
          .from("notification_preferences")
          .select("email_enabled, in_app_enabled, digest_frequency")
          .eq("user_id", user.id)
          .maybeSingle();

        if (notif) {
          setEmailAlerts(notif.email_enabled ?? true);
          setInAppAlerts(notif.in_app_enabled ?? true);
          if (
            notif.digest_frequency === "immediate" ||
            notif.digest_frequency === "daily" ||
            notif.digest_frequency === "weekly" ||
            notif.digest_frequency === "off"
          ) {
            setDigestFrequency(notif.digest_frequency);
          }
        }
      } catch {
        // offline
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function addRegion() {
    if (!regionToAdd) return;
    setRegions((prev) => (prev.includes(regionToAdd) ? prev : [...prev, regionToAdd]));
    setRegionToAdd("");
  }

  function removeRegion(value: string) {
    setRegions((prev) => prev.filter((r) => r !== value));
  }

  function switchTab(next: Tab) {
    setTab(next);
    setMessage("");
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Log in to save settings.");
        return;
      }

      await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
      await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          regions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setMessage("Profile saved.");
    } catch {
      setMessage("Could not save profile. Connect Supabase first.");
    } finally {
      setLoading(false);
    }
  }

  async function saveNotifications(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Log in to save settings.");
        return;
      }

      await supabase.from("user_preferences").upsert(
        {
          user_id: user.id,
          email_alerts: emailAlerts,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      await supabase.from("notification_preferences").upsert(
        {
          user_id: user.id,
          email_enabled: emailAlerts,
          in_app_enabled: inAppAlerts,
          digest_frequency: digestFrequency,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setMessage("Notification preferences saved.");
    } catch {
      setMessage("Could not save notifications. Connect Supabase first.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSecurity(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated.");
    } catch {
      setMessage("Could not update password. Connect Supabase first.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Settings">
      <div className="rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:p-8">
        <div className="mb-6 flex flex-wrap gap-2 border-b border-[#d6dfd5] pb-4" role="tablist">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => switchTab(name)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                tab === name ? "bg-[#006a3f] text-white" : "bg-[#eaf7ec] text-[#3e4941]"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {hydrating ? (
          <p className="text-sm text-[#6e7a70]">Loading settings…</p>
        ) : null}

        {!hydrating && tab === "Profile" ? (
          <>
            <h2 className="text-xl font-bold text-[#131e17]">Profile</h2>
            <p className="mt-1 text-base text-[#6e7a70]">
              Your name and preferred regions for tender alerts. Tender types are on Company Profile.
            </p>
            <form onSubmit={saveProfile} className="mt-8 max-w-3xl space-y-8">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#3e4941]">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="h-12 w-full max-w-xl rounded-xl border border-[#d6dfd5] px-4 text-base focus:border-2 focus:border-[#006a3f] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#3e4941]" htmlFor="region">
                  Preferred regions
                </label>
                <p className="mb-3 text-sm text-[#6e7a70]">
                  Choose a region from the dropdown — it appears as a card below. Add as many as you
                  need, then save.
                </p>
                <div className="flex flex-col gap-3 sm:max-w-xl sm:flex-row">
                  <select
                    id="region"
                    value={regionToAdd}
                    onChange={(e) => setRegionToAdd(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d6dfd5] bg-white px-4 text-base focus:border-2 focus:border-[#006a3f] focus:outline-none sm:flex-1"
                  >
                    <option value="">Select region…</option>
                    {availableRegions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addRegion}
                    disabled={!regionToAdd}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#006a3f] px-5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add
                  </button>
                </div>

                {regions.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {regions.map((value) => (
                      <article
                        key={value}
                        className="relative rounded-2xl border border-[#d6dfd5] border-l-4 border-l-[#006a3f] bg-[#f0fdf1] p-4"
                      >
                        <button
                          type="button"
                          onClick={() => removeRegion(value)}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-[#6e7a70] hover:bg-white"
                          aria-label={`Remove ${value}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <p className="pr-8 text-base font-bold text-[#006a3f]">{value}</p>
                        <p className="mt-1 text-sm leading-6 text-[#3e4941]">
                          You will be alerted for tenders in this region.
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-[#d6dfd5] px-4 py-6 text-center text-sm text-[#6e7a70]">
                    No regions added yet. Pick one from the dropdown above (or leave empty for all
                    regions).
                  </p>
                )}
              </div>

              {message ? <p className="text-sm font-medium text-[#6e7a70]">{message}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center rounded-xl bg-[#006a3f] px-6 text-base font-bold text-white disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save Profile"}
              </button>
            </form>
          </>
        ) : null}

        {!hydrating && tab === "Notifications" ? (
          <>
            <h2 className="text-xl font-bold text-[#131e17]">Notifications</h2>
            <p className="mt-1 text-base text-[#6e7a70]">
              Control email and in-app alerts when matching tenders appear.
            </p>
            <form onSubmit={saveNotifications} className="mt-8 max-w-xl space-y-6">
              <label className="flex min-h-12 items-center gap-3 text-base font-medium text-[#131e17]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#006a3f]"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                />
                Email me when a matching tender appears
              </label>
              <label className="flex min-h-12 items-center gap-3 text-base font-medium text-[#131e17]">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#006a3f]"
                  checked={inAppAlerts}
                  onChange={(e) => setInAppAlerts(e.target.checked)}
                />
                Show alerts in the Alerts page
              </label>
              <div>
                <label className="mb-2 block text-sm font-bold text-[#3e4941]" htmlFor="digest">
                  Email frequency
                </label>
                <select
                  id="digest"
                  value={digestFrequency}
                  onChange={(e) => setDigestFrequency(e.target.value as DigestFrequency)}
                  className="h-12 w-full rounded-xl border border-[#d6dfd5] bg-white px-4 text-base focus:border-2 focus:border-[#006a3f] focus:outline-none"
                >
                  <option value="immediate">Immediate</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                  <option value="off">Off</option>
                </select>
              </div>
              <p className="text-sm text-[#6e7a70]">
                Review recent alerts anytime on the{" "}
                <Link href="/alerts" className="font-bold text-[#006a3f]">
                  Alerts
                </Link>{" "}
                page.
              </p>
              {message ? <p className="text-sm font-medium text-[#6e7a70]">{message}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center rounded-xl bg-[#006a3f] px-6 text-base font-bold text-white disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save Notifications"}
              </button>
            </form>
          </>
        ) : null}

        {!hydrating && tab === "Security" ? (
          <>
            <h2 className="text-xl font-bold text-[#131e17]">Security</h2>
            <p className="mt-1 text-base text-[#6e7a70]">
              Manage your sign-in email and password.
            </p>
            <form onSubmit={saveSecurity} className="mt-8 max-w-xl space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#3e4941]">Account email</label>
                <input
                  value={accountEmail}
                  readOnly
                  className="h-12 w-full rounded-xl border border-[#d6dfd5] bg-[#f0fdf1] px-4 text-base text-[#3e4941]"
                />
                <p className="mt-2 text-xs text-[#6e7a70]">
                  Email changes are handled through your auth provider.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-[#3e4941]" htmlFor="new-pass">
                  New password
                </label>
                <input
                  id="new-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-12 w-full rounded-xl border border-[#d6dfd5] px-4 text-base focus:border-2 focus:border-[#006a3f] focus:outline-none"
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-sm font-bold text-[#3e4941]"
                  htmlFor="confirm-pass"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-pass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[#d6dfd5] px-4 text-base focus:border-2 focus:border-[#006a3f] focus:outline-none"
                />
              </div>
              <p className="text-sm text-[#6e7a70]">
                Forgot your current password?{" "}
                <Link href="/forgot-password" className="font-bold text-[#006a3f]">
                  Reset via email
                </Link>
              </p>
              {message ? <p className="text-sm font-medium text-[#6e7a70]">{message}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center rounded-xl bg-[#006a3f] px-6 text-base font-bold text-white disabled:opacity-60"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

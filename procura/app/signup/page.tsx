"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, company_name: companyName } },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Could not create account. Check Supabase settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0fdf1] px-3 py-6 sm:px-4 sm:py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#d6dfd5] bg-white shadow-[0_12px_24px_rgba(32,43,36,0.08)] lg:grid-cols-2">
        <div className="order-2 bg-[#eaf7ec] p-6 sm:p-8 md:p-10 lg:order-1">
          <BrandMark showPortal={false} />
          <h1 className="mt-8 text-2xl font-bold leading-9 text-[#131e17] sm:mt-10 sm:text-3xl sm:leading-10">
            Join Ghana’s leading tender intelligence platform.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#3e4941] sm:text-base">
            Streamline your procurement process, discover opportunities, and manage submissions
            with enterprise-grade reliability.
          </p>
          <div className="mt-8 rounded-2xl border border-[#d6dfd5] bg-white p-4 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:mt-10">
            <p className="text-sm font-bold text-[#006a3f]">Welcome to Procura</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#f0fdf1] p-3">
                <p className="text-xs text-[#6e7a70]">Dispositions</p>
                <p className="text-2xl font-bold text-[#006a3f]">125</p>
              </div>
              <div className="rounded-xl bg-[#f0fdf1] p-3">
                <p className="text-xs text-[#6e7a70]">Match Ready</p>
                <p className="text-2xl font-bold text-[#006a3f]">88%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 p-6 sm:p-8 md:p-10 lg:order-2">
          <h2 className="text-2xl font-bold text-[#131e17]">Create Your Account</h2>
          <p className="mt-2 text-sm text-[#6e7a70] sm:text-base">
            Start finding and winning relevant public tenders today.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {[
              {
                label: "Full Name",
                value: fullName,
                set: setFullName,
                placeholder: "e.g. Kwame Mensah",
                type: "text",
              },
              {
                label: "Company Name",
                value: companyName,
                set: setCompanyName,
                placeholder: "e.g. Horizon Builders Ltd",
                type: "text",
              },
              {
                label: "Work Email Address",
                value: email,
                set: setEmail,
                placeholder: "kwame@horizonbuilders.com",
                type: "email",
              },
              {
                label: "Password",
                value: password,
                set: setPassword,
                placeholder: "••••••••",
                type: "password",
              },
            ].map((f) => (
              <div key={f.label}>
                <label className="mb-2 block text-sm font-bold text-[#3e4941]">{f.label}</label>
                <input
                  type={f.type}
                  required
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="h-12 w-full rounded-xl border border-[#d6dfd5] px-4 text-base placeholder:text-[#6e7a70] focus:border-2 focus:border-[#006a3f] focus:outline-none"
                />
              </div>
            ))}

            <label className="flex items-start gap-3 text-sm text-[#3e4941]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[#006a3f]"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <span className="font-bold text-[#006a3f]">Terms of Service</span> and{" "}
                <span className="font-bold text-[#006a3f]">Privacy Policy</span>.
              </span>
            </label>

            {error ? (
              <p className="rounded-xl bg-[#ffdad6] px-3 py-2 text-sm font-medium text-[#ba1a1a]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#006a3f] text-base font-bold text-white disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-base text-[#6e7a70]">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#006a3f]">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

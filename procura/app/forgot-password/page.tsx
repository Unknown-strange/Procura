"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage("If an account exists for that email, a reset link has been sent.");
    } catch {
      setError("Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0fdf1] px-4 py-12">
      <div className="mb-8">
        <BrandMark stacked size="lg" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_12px_24px_rgba(32,43,36,0.08)] sm:p-8">
        <h1 className="text-center text-2xl font-bold text-[#131e17] sm:text-3xl">Forgot Password?</h1>
        <p className="mt-3 text-center text-base text-[#6e7a70]">
          No worries! Enter your email address and we&apos;ll send you a code to reset your password.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-[#131e17]" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e7a70]" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. official@procurement.gov.gh"
                className="h-12 w-full rounded-xl border border-[#bdcabe] bg-[#eaf7ec] pl-11 pr-4 text-base placeholder:text-[#6e7a70] focus:border-2 focus:border-[#006a3f] focus:outline-none"
              />
            </div>
          </div>
          {error ? (
            <p className="rounded-xl bg-[#ffdad6] px-3 py-2 text-sm font-medium text-[#ba1a1a]">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl bg-[#b4f0cb] px-3 py-2 text-sm font-medium text-[#165036]">
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#006a3f] text-base font-bold text-white"
          >
            {loading ? "Sending…" : "Send Reset Code"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </form>
        <div className="mt-6 border-t border-[#d6dfd5] pt-5 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 font-semibold text-[#006a3f]">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Login
          </Link>
        </div>
      </div>
      <p className="mt-8 text-sm text-[#6e7a70]">
        Need help? <span className="font-bold text-[#006a3f]">Contact IT Support</span>
      </p>
    </div>
  );
}

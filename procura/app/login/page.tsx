"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { BrandMark } from "@/components/brand/brand-mark";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not log in. Check your connection and try again.",
      );
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
            Welcome back to Ghana’s tender intelligence platform.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#3e4941] sm:text-base">
            Pick up where you left off — review matching tenders, check your documents, and
            continue on GHANEPS when you are ready to bid.
          </p>
          <div className="mt-8 rounded-2xl border border-[#d6dfd5] bg-white p-4 shadow-[0_2px_4px_rgba(32,43,36,0.04)] sm:mt-10">
            <p className="text-sm font-bold text-[#006a3f]">Sourced from GHANEPS</p>
            <p className="mt-2 text-sm leading-6 text-[#3e4941]">
              Review matching tenders on Procura, then continue on the official GHANEPS site when
              you are ready to bid.
            </p>
          </div>
        </div>

        <div className="order-1 p-6 sm:p-8 md:p-10 lg:order-2">
          <h2 className="text-2xl font-bold text-[#131e17]">Sign In</h2>
          <p className="mt-2 text-sm text-[#6e7a70] sm:text-base">
            Log in to access your tenders, alerts, and documents.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#3e4941]" htmlFor="email">
                Work Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kwame@horizonbuilders.com"
                className="h-12 w-full rounded-xl border border-[#d6dfd5] px-4 text-base placeholder:text-[#6e7a70] focus:border-2 focus:border-[#006a3f] focus:outline-none"
              />
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 font-medium text-[#3e4941]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#006a3f]"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="font-bold text-[#006a3f]">
                Forgot password?
              </Link>
            </div>

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
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-base text-[#6e7a70]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold text-[#006a3f]">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

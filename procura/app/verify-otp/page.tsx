"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { createClient } from "@/lib/supabase/client";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "your email";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.join(""),
        type: "signup",
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#d6dfd5] bg-white p-5 shadow-[0_12px_24px_rgba(32,43,36,0.08)] sm:p-8">
      <div className="mb-6 flex justify-center">
        <BrandMark stacked showPortal={false} />
      </div>
      <h1 className="text-center text-xl font-bold text-[#131e17] sm:text-2xl">Verify Your Email</h1>
      <p className="mt-3 text-center text-sm text-[#6e7a70] sm:text-base">
        We&apos;ve sent a 6-digit verification code to <strong className="text-[#131e17]">{email}</strong>.
        Please enter it below.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div className="flex justify-between gap-1.5 sm:gap-2">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => updateDigit(i, e.target.value)}
              className={`h-12 min-w-0 flex-1 rounded-xl bg-[#eaf7ec] text-center text-lg font-bold focus:outline-none sm:h-14 sm:text-xl ${
                i === 0 || digit ? "border-2 border-[#006a3f]" : "border border-transparent"
              }`}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>
        {error ? (
          <p className="rounded-xl bg-[#ffdad6] px-3 py-2 text-sm font-medium text-[#ba1a1a]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || code.join("").length < 6}
          className="h-12 w-full rounded-xl bg-[#006a3f] text-base font-bold text-white disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify Code"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-[#6e7a70]">
        Didn&apos;t receive the code?{" "}
        <button type="button" className="font-bold text-[#058652]">
          Resend Code
        </button>
      </p>
      <p className="mt-4 text-center">
        <Link href="/login" className="text-sm font-semibold text-[#3e4941]">
          ← Back to Login
        </Link>
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0fdf1] px-4 py-12">
      <Suspense fallback={<div className="text-[#6e7a70]">Loading…</div>}>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}

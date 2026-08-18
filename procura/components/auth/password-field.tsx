"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useId, useState } from "react";
import { PASSWORD_CHECKS, scorePassword } from "@/lib/password-strength";

type PasswordFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  showStrength?: boolean;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  required,
  autoComplete,
  showStrength = false,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const strength = scorePassword(value);
  const segments = 4;
  const filled =
    strength.level === "empty"
      ? 0
      : strength.level === "weak"
        ? 1
        : strength.level === "fair"
          ? 2
          : strength.level === "good"
            ? 3
            : 4;

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#3e4941]" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          minLength={showStrength ? 8 : undefined}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-[#d6dfd5] px-4 pr-[5.5rem] text-base placeholder:text-[#6e7a70] focus:border-2 focus:border-[#006a3f] focus:outline-none"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center gap-1 rounded-lg px-2 text-[#3e4941]"
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          <span className="text-sm font-bold">{visible ? "Hide" : "Show"}</span>
        </button>
      </div>

      {showStrength ? (
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#3e4941]">Password strength</p>
              <p className={`text-sm font-bold ${strength.text}`}>
                {value ? strength.label : "Start typing"}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1" aria-hidden>
              {Array.from({ length: segments }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full ${i < filled ? strength.bar : "bg-[#d6dfd5]"}`}
                />
              ))}
            </div>
          </div>
          <ul className="space-y-1.5">
            {PASSWORD_CHECKS.map((check) => {
              const ok = check.test(value);
              return (
                <li key={check.id} className="flex items-center gap-2 text-sm">
                  {ok ? (
                    <Check className="h-4 w-4 shrink-0 text-[#006a3f]" aria-hidden />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-[#6e7a70]" aria-hidden />
                  )}
                  <span className={ok ? "font-medium text-[#006a3f]" : "text-[#3e4941]"}>
                    {check.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

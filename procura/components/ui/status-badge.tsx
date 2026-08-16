import { type ReactNode } from "react";

type StatusTone = "success" | "warning" | "error" | "neutral";

const tones: Record<StatusTone, string> = {
  success: "bg-secondary-container text-secondary",
  warning: "bg-[color-mix(in_srgb,var(--accent-yellow)_35%,white)] text-tertiary",
  error: "bg-error-container text-error",
  neutral: "bg-surface-container text-muted",
};

export function StatusBadge({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

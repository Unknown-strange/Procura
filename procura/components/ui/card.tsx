import { type ReactNode } from "react";

export function Card({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card shadow-[var(--shadow-low)] ${padding ? "p-8" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

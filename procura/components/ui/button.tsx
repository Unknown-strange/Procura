import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container border border-transparent",
  secondary:
    "bg-card text-primary border-2 border-primary hover:bg-surface-low",
  ghost: "bg-transparent text-foreground border border-transparent hover:bg-surface-low",
};

export function Button({
  variant = "primary",
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 text-base font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

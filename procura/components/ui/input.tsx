import { type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ label, hint, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold tracking-wide text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        className={`min-h-12 w-full rounded-md border border-border bg-card px-4 text-base text-foreground placeholder:text-muted focus:border-2 focus:border-primary focus:outline-none ${className}`}
        {...props}
      />
      {hint ? <p className="text-[13px] font-medium text-muted">{hint}</p> : null}
    </div>
  );
}

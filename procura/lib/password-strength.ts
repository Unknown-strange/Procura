export type PasswordCheckId = "length" | "lowercase" | "uppercase" | "number" | "symbol";

export const PASSWORD_CHECKS: {
  id: PasswordCheckId;
  label: string;
  test: (password: string) => boolean;
}[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "lowercase", label: "A lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "An uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "A number (0–9)", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "A symbol (for example ! @ # $)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export type StrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

const LEVELS: Record<
  Exclude<StrengthLevel, "empty">,
  { label: string; bar: string; text: string }
> = {
  weak: { label: "Weak", bar: "bg-[#ba1a1a]", text: "text-[#ba1a1a]" },
  fair: { label: "Fair", bar: "bg-[#9a6b00]", text: "text-[#9a6b00]" },
  good: { label: "Good", bar: "bg-[#3b7c2a]", text: "text-[#3b7c2a]" },
  strong: { label: "Strong", bar: "bg-[#006a3f]", text: "text-[#006a3f]" },
};

export function scorePassword(password: string) {
  if (!password) {
    return { passed: 0, level: "empty" as const, label: "", bar: "bg-[#d6dfd5]", text: "text-[#6e7a70]" };
  }
  const passed = PASSWORD_CHECKS.filter((check) => check.test(password)).length;
  const level: Exclude<StrengthLevel, "empty"> =
    passed <= 2 ? "weak" : passed === 3 ? "fair" : passed === 4 ? "good" : "strong";
  return { passed, level, ...LEVELS[level] };
}

import Link from "next/link";
import Image from "next/image";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
  showPortal?: boolean;
  href?: string | null;
  light?: boolean;
};

const sizes = {
  sm: { box: 40, title: "text-base", gap: "gap-2.5" },
  md: { box: 48, title: "text-lg", gap: "gap-3" },
  lg: { box: 64, title: "text-2xl", gap: "gap-3" },
};

export function BrandMark({
  size = "md",
  stacked = false,
  showPortal = true,
  href = "/",
  light = false,
}: BrandMarkProps) {
  const s = sizes[size];
  const content = (
    <div
      className={`flex items-center ${s.gap} ${stacked ? "flex-col text-center" : ""}`}
    >
      <Image
        src="/logo.png"
        alt="Procura"
        width={s.box}
        height={s.box}
        className="shrink-0 object-contain"
        priority
      />
      <div>
        <p
          className={`${s.title} font-bold leading-tight ${
            light ? "text-white" : "text-[#005C35]"
          }`}
        >
          Procura
        </p>
        {showPortal ? (
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
              light ? "text-white/70" : "text-[#6e7a70]"
            }`}
          >
            Enterprise Portal
          </p>
        ) : null}
      </div>
    </div>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}

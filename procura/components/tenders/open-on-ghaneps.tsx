import { ExternalLink } from "lucide-react";
import { ghanepsTenderUrl } from "@/lib/ghaneps";

type Props = {
  sourceUrl?: string | null;
  ghanepsId?: string | null;
  resourceId?: string | number | null;
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
};

/** Always opens the exact tender detail page on GHANEPS in a new tab. */
export function OpenOnGhaneps({
  sourceUrl,
  ghanepsId,
  resourceId,
  className,
  showIcon = true,
  children = "Open on GHANEPS",
}: Props) {
  const href = ghanepsTenderUrl({
    source_url: sourceUrl,
    ghaneps_id: ghanepsId,
    resourceId,
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title="Open this tender’s details on GHANEPS"
    >
      {showIcon ? <ExternalLink className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
    </a>
  );
}

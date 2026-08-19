"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Bookmark, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { OpenOnGhaneps } from "@/components/tenders/open-on-ghaneps";
import type { TenderListItem } from "@/lib/types";
import { daysUntil, formatDeadline } from "@/lib/utils";

export function TenderFiltersBar({
  regions,
}: {
  regions: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page");
      startTransition(() => {
        router.push(`/tenders?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "status") {
      if (!value || value === "active") params.delete(key);
      else params.set(key, value);
    } else if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    startTransition(() => router.push(`/tenders?${params.toString()}`));
  }

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-low)]">
      <label className="relative block">
        <span className="sr-only">Search tenders</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tenders..."
          className="min-h-12 w-full rounded-md border border-border bg-card pl-12 pr-4 text-base placeholder:text-muted focus:border-2 focus:border-primary focus:outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <select
          className="min-h-12 rounded-md border border-border bg-card px-4 text-base"
          defaultValue={searchParams.get("type") ?? "all"}
          onChange={(e) => setParam("type", e.target.value)}
          aria-label="Procurement type"
        >
          <option value="all">All types</option>
          <option value="Goods">Goods</option>
          <option value="Works">Works</option>
          <option value="Consulting Services">Consulting Services</option>
          <option value="Technical Services">Technical Services</option>
          <option value="Disposals">Disposals</option>
        </select>
        <select
          className="min-h-12 rounded-md border border-border bg-card px-4 text-base"
          defaultValue={searchParams.get("region") ?? "all"}
          onChange={(e) => setParam("region", e.target.value)}
          aria-label="Region"
        >
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="min-h-12 rounded-md border border-border bg-card px-4 text-base"
          defaultValue={searchParams.get("status") ?? "active"}
          onChange={(e) => setParam("status", e.target.value)}
          aria-label="Status"
        >
          <option value="active">Current listings</option>
          <option value="open">Open</option>
          <option value="closing_soon">Closing soon</option>
          <option value="closed">Closed</option>
          <option value="all">All statuses</option>
        </select>
        {isPending ? (
          <span className="self-center text-sm font-medium text-muted">Updating…</span>
        ) : null}
      </div>
    </div>
  );
}

export function TenderCard({ tender }: { tender: TenderListItem }) {
  const days = daysUntil(tender.submission_deadline);
  const urgent = days !== null && days <= 3;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {tender.procurement_type ? (
          <StatusBadge tone="neutral">{tender.procurement_type}</StatusBadge>
        ) : null}
        {tender.region ? <StatusBadge tone="neutral">{tender.region}</StatusBadge> : null}
        {urgent ? (
          <StatusBadge tone="error">⚠ Closing soon</StatusBadge>
        ) : (
          <StatusBadge tone="success">Open</StatusBadge>
        )}
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">{tender.title}</h2>
        <p className="mt-1 text-base text-muted">{tender.procuring_entity_name}</p>
      </div>
      <p className="text-base leading-6 text-muted line-clamp-2">{tender.description}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">
          Deadline: {formatDeadline(tender.submission_deadline)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/tenders/${tender.id}`}>
            <Button variant="secondary">View Details</Button>
          </Link>
          <OpenOnGhaneps
            sourceUrl={tender.source_url}
            ghanepsId={tender.ghaneps_id}
            className="inline-flex"
            showIcon={false}
          >
            <Button>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open on GHANEPS
            </Button>
          </OpenOnGhaneps>
        </div>
      </div>
    </Card>
  );
}

export function SaveTenderButton({ tenderId }: { tenderId: string }) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  async function onSave() {
    try {
      const res = await fetch("/api/saved-tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tender_id: tenderId }),
      });
      if (res.status === 401) {
        setMessage("Log in to save tenders");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
      setMessage("Tender saved");
    } catch {
      setMessage("Could not save tender");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" onClick={onSave} disabled={saved}>
        <Bookmark className="h-4 w-4" aria-hidden />
        {saved ? "Saved" : "Save Tender"}
      </Button>
      {message ? <span className="text-[13px] font-medium text-muted">{message}</span> : null}
    </div>
  );
}

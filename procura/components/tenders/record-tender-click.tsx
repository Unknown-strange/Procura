"use client";

import { useEffect } from "react";

export function RecordTenderClick({ tenderId }: { tenderId: string }) {
  useEffect(() => {
    if (!tenderId) return;
    void fetch("/api/tender-clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tender_id: tenderId }),
    }).catch(() => {
      // Click scoring is best-effort; browsing should not fail if it misses.
    });
  }, [tenderId]);

  return null;
}

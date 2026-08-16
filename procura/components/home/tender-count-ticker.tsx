"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Never stops: counts 0 → total tenders on GHANEPS, pauses briefly on the
 * final number, then restarts from 0. Peak updates when scrapes add tenders.
 */
export function TenderCountTicker({
  initialCount = 0,
  className = "",
}: {
  initialCount?: number;
  className?: string;
}) {
  const [target, setTarget] = useState(Math.max(0, initialCount));
  const [display, setDisplay] = useState(0);
  const targetRef = useRef(Math.max(0, initialCount));
  const valueRef = useRef(0);
  const pauseUntilRef = useRef(0);

  useEffect(() => {
    targetRef.current = Math.max(0, target);
  }, [target]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/tender-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { total?: number };
        if (!cancelled && typeof json.total === "number" && json.total > 0) {
          setTarget(json.total);
        }
      } catch {
        // keep last target
      }
    }

    refresh();
    const poll = window.setInterval(refresh, 6000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const elapsed = Math.min(64, now - last);
      last = now;
      const goal = Math.max(0, targetRef.current);

      if (goal === 0) {
        setDisplay(0);
        raf = requestAnimationFrame(step);
        return;
      }

      if (now < pauseUntilRef.current) {
        // hold on the last number
        setDisplay(goal);
        raf = requestAnimationFrame(step);
        return;
      }

      // ~2–6s to climb to the total, then restart
      const durationMs = Math.min(6000, Math.max(2000, goal * 35));
      const speed = goal / durationMs;
      valueRef.current += speed * elapsed;

      if (valueRef.current >= goal) {
        valueRef.current = goal;
        setDisplay(goal);
        pauseUntilRef.current = now + 400; // brief stop on final number
        valueRef.current = 0; // next climb starts from 0 after pause
      } else {
        setDisplay(Math.floor(valueRef.current));
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className={`tabular-nums ${className}`} aria-live="off">
      {display.toLocaleString("en-GH")}
    </span>
  );
}

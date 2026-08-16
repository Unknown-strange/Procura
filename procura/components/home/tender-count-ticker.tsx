"use client";

import { useEffect, useRef, useState } from "react";

/** Count up once to the live GHANEPS total, then hold. */
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
  const doneRef = useRef(false);

  useEffect(() => {
    targetRef.current = Math.max(0, target);
    if (target > valueRef.current) doneRef.current = false;
  }, [target]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/tender-stats", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { total?: number };
        if (!cancelled && typeof json.total === "number" && json.total >= 0) {
          setTarget(json.total);
        }
      } catch {
        // keep last target
      }
    }

    refresh();
    const poll = window.setInterval(refresh, 60_000);
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
        return;
      }

      if (doneRef.current && valueRef.current >= goal) {
        setDisplay(goal);
        return;
      }

      const durationMs = Math.min(6000, Math.max(2000, goal * 35));
      const speed = goal / durationMs;
      valueRef.current += speed * elapsed;

      if (valueRef.current >= goal) {
        valueRef.current = goal;
        doneRef.current = true;
        setDisplay(goal);
        return;
      }

      setDisplay(Math.floor(valueRef.current));
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <span className={`tabular-nums ${className}`} aria-live="polite">
      {display.toLocaleString("en-GH")}
    </span>
  );
}

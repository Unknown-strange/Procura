"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";

const links = [
  { href: "#how-it-works", label: "How it Works" },
  { href: "#features", label: "Features" },
  { href: "/login", label: "Sign In" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8eee9] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
        <BrandMark size="sm" showPortal={false} />

        <nav className="hidden items-center gap-8 text-sm font-medium text-[#3e4941] md:flex">
          {links.map((link) =>
            link.href.startsWith("#") ? (
              <a key={link.href} href={link.href} className="hover:text-[#005C35]">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="hover:text-[#005C35]">
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center rounded-lg bg-[#005C35] px-3 text-sm font-bold text-white sm:px-4"
          >
            Get Started
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d6dfd5] text-[#131e17] md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#28332c]/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col bg-white shadow-[0_12px_24px_rgba(32,43,36,0.12)]">
            <div className="flex items-center justify-between border-b border-[#e8eee9] px-4 py-3">
              <BrandMark size="sm" showPortal={false} href={null} />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4 text-base font-semibold text-[#131e17]">
              {links.map((link) =>
                link.href.startsWith("#") ? (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-3 hover:bg-[#f0fdf1]"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl px-4 py-3 hover:bg-[#f0fdf1]"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <Link
                href="/signup"
                className="mt-2 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#005C35] px-4 font-bold text-white"
                onClick={() => setOpen(false)}
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}

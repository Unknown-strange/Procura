"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  Building2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tenders", label: "Find Tenders", icon: Search },
  { href: "/saved", label: "Saved Tenders", icon: Bookmark },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/documents", label: "My Documents", icon: FileText },
  { href: "/assistant", label: "Tender Assistant", icon: Sparkles },
  { href: "/company", label: "Company Profile", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `relative flex min-h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-semibold transition-colors ${
      active
        ? "bg-[#b4f0cb]/55 text-[#006a3f] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-[#006a3f]"
        : "text-[#131e17] hover:bg-[#e4f1e6]"
    }`;
  };

  const nav = (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-4">
      <Link href="/dashboard" className="mb-5 shrink-0 px-1 py-2" onClick={() => setOpen(false)}>
        <BrandMark size="sm" />
      </Link>

      <div className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkClass(href)} onClick={() => setOpen(false)}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {label}
          </Link>
        ))}
      </div>

      <div className="mt-auto space-y-1 border-t border-[#d6dfd5] pt-4">
        <Link href="/help" className={linkClass("/help")} onClick={() => setOpen(false)}>
          <HelpCircle className="h-5 w-5 shrink-0" aria-hidden />
          Help & Support
        </Link>
        <Link href="/settings" className={linkClass("/settings")} onClick={() => setOpen(false)}>
          <User className="h-5 w-5 shrink-0" aria-hidden />
          User Profile
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-[#d6dfd5] bg-white shadow-sm sm:left-4 sm:top-4 sm:h-12 sm:w-12 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#28332c]/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(100%,18rem)] flex-col overflow-hidden bg-[#eaf7ec] shadow-[0_12px_24px_rgba(32,43,36,0.08)]">
            <button
              type="button"
              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf7ec]"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex min-h-0 flex-1 flex-col pt-2">{nav}</div>
          </aside>
        </div>
      ) : null}

      <aside className="hidden h-dvh w-[280px] shrink-0 flex-col overflow-hidden border-r border-[#d6dfd5] bg-[#eaf7ec] lg:flex">
        {nav}
      </aside>
    </>
  );
}

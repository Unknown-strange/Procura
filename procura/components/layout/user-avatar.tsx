"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function initialFrom(name: string | null | undefined, email: string | null | undefined) {
  const fromName = name?.trim()?.[0];
  if (fromName) return fromName.toUpperCase();
  const fromEmail = email?.trim()?.[0];
  if (fromEmail) return fromEmail.toUpperCase();
  return "?";
}

export function UserAvatar() {
  const [initial, setInitial] = useState("?");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "");

        if (!cancelled) setInitial(initialFrom(name, user.email));
      } catch {
        // stay on placeholder
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/settings"
      className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#31694c] text-sm font-bold text-white sm:h-11 sm:w-11"
      aria-label="User profile"
    >
      {initial}
    </Link>
  );
}

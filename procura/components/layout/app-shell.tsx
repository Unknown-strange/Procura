import { type ReactNode } from "react";
import { Footer } from "@/components/layout/footer";
import { AppHeader } from "@/components/layout/app-header";
import { AiFab } from "@/components/layout/ai-fab";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({
  children,
  title = "Tender Intelligence",
  actions,
  searchPlaceholder = "Search tenders...",
  fill = false,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  searchPlaceholder?: string;
  fill?: boolean;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-[#f0fdf1]">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <AppHeader title={title} actions={actions} searchPlaceholder={searchPlaceholder} />
        </div>
        <div
          className={
            fill
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain"
          }
        >
          <main
            className={
              fill
                ? "flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8"
                : "px-4 py-5 sm:py-6 lg:px-8 lg:py-8"
            }
          >
            {children}
          </main>
          {fill ? null : <Footer />}
        </div>
      </div>
      <AiFab />
    </div>
  );
}

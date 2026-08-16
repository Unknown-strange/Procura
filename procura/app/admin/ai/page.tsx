import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAiPage() {
  let commands: Array<{ slug: string; name: string; is_active: boolean }> = [];
  let usage: Array<{ command_slug: string | null; input_tokens: number | null; created_at: string }> =
    [];
  let prompts: Array<{ version_label: string; command_slug: string; status: string }> = [];

  try {
    const supabase = await createClient();
    const { data: cmds } = await supabase
      .from("ai_commands")
      .select("slug, name, is_active")
      .order("name");
    commands = cmds ?? [];

    const { data: interactions } = await supabase
      .from("ai_interactions")
      .select("command_slug, input_tokens, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    usage = interactions ?? [];

    const { data: versions } = await supabase
      .from("prompt_versions")
      .select("version_label, command_slug, status")
      .order("created_at", { ascending: false })
      .limit(20);
    prompts = versions ?? [];
  } catch {
    commands = [
      { slug: "explain-tender", name: "Explain This Tender", is_active: true },
      { slug: "extract-requirements", name: "Extract Requirements", is_active: true },
      { slug: "check-documents", name: "Check My Documents", is_active: true },
      { slug: "ai-chat", name: "Tender Chat", is_active: true },
    ];
  }

  return (
    <AppShell title="AI Commands & Usage">
      <p className="mb-6 text-base text-muted">
        Internal monitoring only — AI stays free for bidders. Token counts are never billed to users.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">AI commands</h2>
          <ul className="mt-4 space-y-3">
            {commands.map((c) => (
              <li
                key={c.slug}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-muted">{c.slug}</p>
                </div>
                <StatusBadge tone={c.is_active ? "success" : "neutral"}>
                  {c.is_active ? "Active" : "Off"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Prompt versions</h2>
          <ul className="mt-4 space-y-3">
            {prompts.length === 0 ? (
              <li className="text-muted">No prompt versions loaded (connect Supabase).</li>
            ) : (
              prompts.map((p, i) => (
                <li
                  key={`${p.version_label}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{p.version_label}</p>
                    <p className="text-sm text-muted">{p.command_slug}</p>
                  </div>
                  <StatusBadge tone="neutral">{p.status}</StatusBadge>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-xl font-semibold">Recent AI usage</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-base">
            <thead className="bg-dark-green text-on-primary">
              <tr>
                <th className="px-4 py-3 font-semibold">Command</th>
                <th className="px-4 py-3 font-semibold">Input tokens</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {usage.length === 0 ? (
                <tr className="bg-card">
                  <td className="px-4 py-3 text-muted" colSpan={3}>
                    No interactions yet.
                  </td>
                </tr>
              ) : (
                usage.map((u, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-card" : "bg-surface-low"}
                  >
                    <td className="px-4 py-3">{u.command_slug ?? "—"}</td>
                    <td className="px-4 py-3">{u.input_tokens ?? 0}</td>
                    <td className="px-4 py-3">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(u.created_at))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Link href="/assistant" className="mt-4 inline-block text-base font-semibold text-primary">
          Open Tender Assistant →
        </Link>
      </Card>
    </AppShell>
  );
}

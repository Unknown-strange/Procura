-- Phase 6: Prompt learning layer

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  command_slug text not null references public.ai_commands(slug) on delete cascade,
  version_label text not null,
  prompt_text text not null,
  scope text not null default 'global'
    check (scope in ('global', 'industry', 'user')),
  industry text,
  status text not null default 'draft'
    check (status in ('draft', 'experimental', 'active', 'retired')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_prompt_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  command_slug text not null references public.ai_commands(slug) on delete cascade,
  preferred_prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  primary key (user_id, command_slug)
);

create table if not exists public.prompt_experiments (
  id uuid primary key default gen_random_uuid(),
  command_slug text not null references public.ai_commands(slug) on delete cascade,
  control_version_id uuid not null references public.prompt_versions(id) on delete cascade,
  variant_version_id uuid not null references public.prompt_versions(id) on delete cascade,
  traffic_percent int not null default 10 check (traffic_percent between 1 and 50),
  status text not null default 'running' check (status in ('running', 'completed', 'stopped')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.ai_user_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  industry text,
  preferred_style text,
  notes jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_optimization_jobs (
  id uuid primary key default gen_random_uuid(),
  command_slug text references public.ai_commands(slug) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  input_summary jsonb,
  output_summary jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.prompt_evaluations (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references public.prompt_experiments(id) on delete cascade,
  prompt_version_id uuid not null references public.prompt_versions(id) on delete cascade,
  metric_name text not null,
  metric_value numeric not null,
  sample_size int not null default 0,
  created_at timestamptz not null default now()
);

-- Seed base prompts
insert into public.prompt_versions (command_slug, version_label, prompt_text, status)
select c.slug, 'v1-base', 
  case c.slug
    when 'explain-tender' then 'Explain this Ghana public tender in plain language for a contractor. Do not invent requirements. Use only the provided context.'
    when 'extract-requirements' then 'Extract structured mandatory and optional requirements from the tender documents. Output JSON list. Never invent requirements not present in the text.'
    when 'check-documents' then 'Compare user documents to tender requirements. For each requirement return FOUND, MISSING, or UNCLEAR with a short plain-language explanation and confidence 0-1.'
    else 'Answer questions about this tender using only provided context. Be plain and clear. If unknown, say so.'
  end,
  'active'
from public.ai_commands c
on conflict do nothing;

alter table public.prompt_versions enable row level security;
alter table public.user_prompt_preferences enable row level security;
alter table public.prompt_experiments enable row level security;
alter table public.ai_user_profiles enable row level security;
alter table public.prompt_optimization_jobs enable row level security;
alter table public.prompt_evaluations enable row level security;

create policy "Public read active prompts" on public.prompt_versions
  for select using (status in ('active', 'experimental'));

create policy "Users manage own prompt prefs" on public.user_prompt_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own ai profile" on public.ai_user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Experiments/jobs/evals: service role only (no public policies beyond deny-by-default with RLS)

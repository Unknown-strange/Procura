-- Phase 4–5: Documents, requirements, AI interactions, readiness checks

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  document_type text not null,
  storage_path text not null,
  file_size int,
  mime_type text,
  expires_at date,
  status text not null default 'valid'
    check (status in ('valid', 'expiring_soon', 'expired', 'missing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_documents_user_id_idx on public.user_documents (user_id);

create table if not exists public.tender_requirements (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  requirement_text text not null,
  requirement_type text,
  is_mandatory boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tender_requirements_tender_id_idx on public.tender_requirements (tender_id);

create table if not exists public.document_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  requirement_id uuid references public.tender_requirements(id) on delete cascade,
  user_document_id uuid references public.user_documents(id) on delete set null,
  status text not null check (status in ('FOUND', 'MISSING', 'UNCLEAR')),
  confidence_score numeric,
  ai_explanation text,
  created_at timestamptz not null default now()
);

create index if not exists document_checks_user_tender_idx
  on public.document_checks (user_id, tender_id);

create table if not exists public.ai_commands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  tender_id uuid references public.tenders(id) on delete set null,
  command_slug text,
  prompt_version_id uuid,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  created_at timestamptz not null default now()
);

create index if not exists ai_interactions_user_created_idx
  on public.ai_interactions (user_id, created_at desc);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tender_id uuid references public.tenders(id) on delete set null,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid references public.ai_interactions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

insert into public.ai_commands (slug, name, description) values
  ('explain-tender', 'Explain This Tender', 'Plain-language summary of a tender'),
  ('extract-requirements', 'Extract Requirements', 'Structured requirements from tender documents'),
  ('check-documents', 'Check My Documents', 'Compare uploaded docs to requirements'),
  ('ai-chat', 'Tender Chat', 'Q&A about a specific tender')
on conflict (slug) do nothing;

alter table public.user_documents enable row level security;
alter table public.tender_requirements enable row level security;
alter table public.document_checks enable row level security;
alter table public.ai_commands enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_feedback enable row level security;

create policy "Users manage own documents" on public.user_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Public read tender requirements" on public.tender_requirements
  for select using (true);

create policy "Users manage own document checks" on public.document_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Public read ai commands" on public.ai_commands for select using (true);

create policy "Users read own ai interactions" on public.ai_interactions
  for select using (auth.uid() = user_id);

create policy "Users manage own conversations" on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage messages in own conversations" on public.ai_messages
  for all using (
    conversation_id in (select id from public.ai_conversations where user_id = auth.uid())
  ) with check (
    conversation_id in (select id from public.ai_conversations where user_id = auth.uid())
  );

create policy "Users manage own feedback" on public.ai_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

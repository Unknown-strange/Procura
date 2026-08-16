-- UNSPSC / UNGM classification codes for tender matching
create table if not exists public.unspsc_codes (
  key bigint primary key,
  parent_key bigint references public.unspsc_codes(key) on delete set null,
  code text not null,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists unspsc_codes_parent_key_idx on public.unspsc_codes (parent_key);
create index if not exists unspsc_codes_code_idx on public.unspsc_codes (code);
create index if not exists unspsc_codes_title_idx on public.unspsc_codes (title);

-- Tender ↔ UNSPSC
create table if not exists public.tender_unspsc (
  tender_id uuid not null references public.tenders(id) on delete cascade,
  unspsc_key bigint not null references public.unspsc_codes(key) on delete cascade,
  primary key (tender_id, unspsc_key)
);

create index if not exists tender_unspsc_unspsc_key_idx on public.tender_unspsc (unspsc_key);

-- User interest ↔ UNSPSC (what they said they are interested in)
create table if not exists public.user_unspsc_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  unspsc_key bigint not null references public.unspsc_codes(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, unspsc_key)
);

create index if not exists user_unspsc_interests_unspsc_key_idx
  on public.user_unspsc_interests (unspsc_key);

alter table public.unspsc_codes enable row level security;
alter table public.tender_unspsc enable row level security;
alter table public.user_unspsc_interests enable row level security;

create policy "Public read unspsc_codes" on public.unspsc_codes for select using (true);
create policy "Public read tender_unspsc" on public.tender_unspsc for select using (true);
create policy "Users manage own unspsc interests" on public.user_unspsc_interests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

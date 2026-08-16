-- Phase 1: Core tender + scraper tables
-- Prefer BUILD_PLAN naming; RLS enabled from day one.

create extension if not exists "pgcrypto";

-- Categories
create table if not exists public.tender_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  parent_id uuid references public.tender_categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Procuring entities
create table if not exists public.procuring_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  region text,
  created_at timestamptz not null default now()
);

create index if not exists procuring_entities_name_idx on public.procuring_entities (name);

-- Tenders (GHANEPS source of truth via source_url)
create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  ghaneps_id text unique,
  title text not null,
  description text,
  procuring_entity_id uuid references public.procuring_entities(id) on delete set null,
  procurement_type text check (
    procurement_type is null
    or procurement_type in (
      'Goods',
      'Works',
      'Consulting Services',
      'Technical Services',
      'Disposals'
    )
  ),
  region text,
  status text not null default 'open' check (status in ('open', 'closing_soon', 'closed', 'awarded', 'cancelled')),
  published_at timestamptz,
  submission_deadline timestamptz,
  source_url text not null,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenders_submission_deadline_idx on public.tenders (submission_deadline);
create index if not exists tenders_status_idx on public.tenders (status);
create index if not exists tenders_procuring_entity_id_idx on public.tenders (procuring_entity_id);
create index if not exists tenders_procurement_type_idx on public.tenders (procurement_type);

create table if not exists public.tender_category_mapping (
  tender_id uuid not null references public.tenders(id) on delete cascade,
  category_id uuid not null references public.tender_categories(id) on delete cascade,
  primary key (tender_id, category_id)
);

create index if not exists tender_category_mapping_tender_category_idx
  on public.tender_category_mapping (tender_id, category_id);

create table if not exists public.tender_documents (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  title text not null,
  file_url text,
  document_type text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create index if not exists tender_documents_tender_id_idx on public.tender_documents (tender_id);

-- Scraper / system
create table if not exists public.scraper_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  tenders_found int not null default 0,
  tenders_inserted int not null default 0,
  notes text
);

create table if not exists public.scraper_errors (
  id uuid primary key default gen_random_uuid(),
  scraper_run_id uuid references public.scraper_runs(id) on delete cascade,
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Public read for procurement data (Phase 1)
alter table public.tender_categories enable row level security;
alter table public.procuring_entities enable row level security;
alter table public.tenders enable row level security;
alter table public.tender_category_mapping enable row level security;
alter table public.tender_documents enable row level security;
alter table public.scraper_runs enable row level security;
alter table public.scraper_errors enable row level security;
alter table public.system_settings enable row level security;

create policy "Public read tender_categories" on public.tender_categories for select using (true);
create policy "Public read procuring_entities" on public.procuring_entities for select using (true);
create policy "Public read tenders" on public.tenders for select using (true);
create policy "Public read tender_category_mapping" on public.tender_category_mapping for select using (true);
create policy "Public read tender_documents" on public.tender_documents for select using (true);

-- Scraper tables: no public write; service role bypasses RLS
create policy "No public read scraper_runs" on public.scraper_runs for select using (false);
create policy "No public read scraper_errors" on public.scraper_errors for select using (false);
create policy "Public read non-secret settings" on public.system_settings
  for select using (key not like 'secret.%');

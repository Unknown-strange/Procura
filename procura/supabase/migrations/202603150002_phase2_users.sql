-- Phase 2: Users, companies, preferences, saved tenders

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  registration_number text,
  tin text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_categories (
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid not null references public.tender_categories(id) on delete cascade,
  primary key (company_id, category_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_id uuid references public.companies(id) on delete set null,
  role text not null default 'bidder' check (role in ('bidder', 'company_admin', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  industry_interests text[] default '{}',
  regions text[] default '{}',
  procurement_types text[] default '{}',
  min_value numeric,
  max_value numeric,
  email_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_tenders (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  primary key (user_id, tender_id)
);

create unique index if not exists saved_tenders_user_tender_uidx
  on public.saved_tenders (user_id, tender_id);

create table if not exists public.tender_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  match_score numeric,
  reason text,
  created_at timestamptz not null default now(),
  unique (user_id, tender_id)
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.companies enable row level security;
alter table public.company_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.saved_tenders enable row level security;
alter table public.tender_matches enable row level security;

create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users manage own preferences" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own saved tenders" on public.saved_tenders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own matches" on public.tender_matches
  for select using (auth.uid() = user_id);

create policy "Users read own company" on public.companies
  for select using (
    id in (select company_id from public.profiles where id = auth.uid())
    or created_by = auth.uid()
  );

create policy "Users update own company" on public.companies
  for update using (
    id in (select company_id from public.profiles where id = auth.uid())
    or created_by = auth.uid()
  );

create policy "Users insert company" on public.companies
  for insert with check (created_by = auth.uid());

create policy "Users manage company categories" on public.company_categories
  for all using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  ) with check (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

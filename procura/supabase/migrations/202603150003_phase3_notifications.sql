-- Phase 3: Notifications

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  digest_frequency text not null default 'immediate'
    check (digest_frequency in ('immediate', 'daily', 'weekly', 'off')),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tender_id uuid references public.tenders(id) on delete set null,
  title text not null,
  body text,
  notification_type text not null default 'match'
    check (notification_type in ('match', 'deadline', 'document', 'system')),
  link_url text,
  ghaneps_url text,
  is_read boolean not null default false,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

create policy "Users manage own notification prefs" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

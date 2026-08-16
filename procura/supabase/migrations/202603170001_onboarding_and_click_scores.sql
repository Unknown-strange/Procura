-- Onboarding completion, unique tender clicks, and per-type interest scores.
-- +10 per unique tender of a procurement type; at 90 the type is added to email matching.

alter table public.user_preferences
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.user_tender_clicks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  procurement_type text,
  region text,
  created_at timestamptz not null default now(),
  primary key (user_id, tender_id)
);

create index if not exists user_tender_clicks_user_type_idx
  on public.user_tender_clicks (user_id, procurement_type);

create table if not exists public.user_type_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  procurement_type text not null,
  score integer not null default 0 check (score >= 0 and score <= 100),
  click_count integer not null default 0 check (click_count >= 0),
  email_unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, procurement_type),
  constraint user_type_scores_procurement_type_check
    check (
      procurement_type in (
        'Goods',
        'Works',
        'Consulting Services',
        'Technical Services',
        'Disposals'
      )
    )
);

alter table public.user_tender_clicks enable row level security;
alter table public.user_type_scores enable row level security;

create policy "Users read own tender clicks"
  on public.user_tender_clicks for select
  using (auth.uid() = user_id);

create policy "Users read own type scores"
  on public.user_type_scores for select
  using (auth.uid() = user_id);

create or replace function public.record_tender_click(p_tender_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t_type text;
  t_region text;
  inserted_id uuid;
  new_score integer := 0;
  newly_unlocked boolean := false;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select t.procurement_type, t.region
    into t_type, t_region
  from public.tenders t
  where t.id = p_tender_id;

  if not found then
    raise exception 'Tender not found';
  end if;

  insert into public.user_tender_clicks (user_id, tender_id, procurement_type, region)
  values (uid, p_tender_id, t_type, t_region)
  on conflict (user_id, tender_id) do nothing
  returning tender_id into inserted_id;

  if inserted_id is null then
    if t_type is not null then
      select s.score into new_score
      from public.user_type_scores s
      where s.user_id = uid and s.procurement_type = t_type;
    end if;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'score', coalesce(new_score, 0),
      'unlocked', false
    );
  end if;

  if t_type is null then
    return jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'score', 0,
      'unlocked', false
    );
  end if;

  insert into public.user_type_scores (
    user_id,
    procurement_type,
    score,
    click_count,
    email_unlocked_at
  )
  values (
    uid,
    t_type,
    10,
    1,
    case when 10 >= 90 then now() else null end
  )
  on conflict (user_id, procurement_type) do update
    set
      score = least(100, public.user_type_scores.score + 10),
      click_count = public.user_type_scores.click_count + 1,
      email_unlocked_at = case
        when public.user_type_scores.email_unlocked_at is null
          and least(100, public.user_type_scores.score + 10) >= 90
        then now()
        else public.user_type_scores.email_unlocked_at
      end,
      updated_at = now()
  returning
    score,
    (email_unlocked_at is not null and email_unlocked_at >= now() - interval '1 second')
    into new_score, newly_unlocked;

  if new_score >= 90 then
    insert into public.user_preferences (user_id, procurement_types)
    values (uid, array[t_type])
    on conflict (user_id) do update
      set
        procurement_types = case
          when t_type = any (coalesce(public.user_preferences.procurement_types, '{}'::text[]))
          then public.user_preferences.procurement_types
          else array_append(coalesce(public.user_preferences.procurement_types, '{}'::text[]), t_type)
        end,
        updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'score', new_score,
    'unlocked', newly_unlocked,
    'procurement_type', t_type
  );
end;
$$;

revoke all on function public.record_tender_click(uuid) from public;
grant execute on function public.record_tender_click(uuid) to authenticated;

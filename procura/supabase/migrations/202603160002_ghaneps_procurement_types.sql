-- Align procurement_type with official GHANEPS categories:
-- Goods, Works, Consulting Services, Technical Services, Disposals

alter table public.tenders drop constraint if exists tenders_procurement_type_check;

update public.tenders
set procurement_type = 'Consulting Services'
where procurement_type = 'Services';

update public.tenders
set procurement_type = 'Technical Services'
where procurement_type = 'Technical Service';

update public.tenders
set procurement_type = 'Disposals'
where procurement_type = 'Disposal';

alter table public.tenders
  add constraint tenders_procurement_type_check
  check (
    procurement_type is null
    or procurement_type in (
      'Goods',
      'Works',
      'Consulting Services',
      'Technical Services',
      'Disposals'
    )
  );

-- Prefer preferences that still store the legacy "Services" label
update public.user_preferences
set procurement_types = array(
  select distinct case
    when t = 'Services' then 'Consulting Services'
    when t = 'Technical Service' then 'Technical Services'
    when t = 'Disposal' then 'Disposals'
    else t
  end
  from unnest(coalesce(procurement_types, '{}'::text[])) as t
)
where procurement_types is not null
  and (
    'Services' = any (procurement_types)
    or 'Technical Service' = any (procurement_types)
    or 'Disposal' = any (procurement_types)
  );

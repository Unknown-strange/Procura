-- Notices whose deadline is still today (Ghana/UTC calendar date) or later
-- should not stay closed. Date-only GHANEPS deadlines were previously stored
-- as midnight UTC, which made same-day listings look expired.
update public.tenders
set
  status = case
    when submission_deadline is not null
      and submission_deadline <= now() + interval '3 days'
      then 'closing_soon'
    else 'open'
  end,
  updated_at = now()
where status = 'closed'
  and submission_deadline is not null
  and (submission_deadline at time zone 'utc')::date >= (timezone('utc', now()))::date;

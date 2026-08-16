-- Seed categories + sample tenders for local/demo Supabase projects
insert into public.tender_categories (name, slug) values
  ('Construction', 'construction'),
  ('ICT', 'ict'),
  ('Healthcare', 'healthcare'),
  ('Water', 'water'),
  ('Consultancy', 'consultancy')
on conflict (slug) do nothing;

insert into public.procuring_entities (name, region) values
  ('Community Water and Sanitation Agency', 'Central Region'),
  ('Ministry of Local Government', 'Greater Accra'),
  ('Ghana Health Service', 'Ashanti Region')
on conflict do nothing;

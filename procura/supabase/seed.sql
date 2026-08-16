-- Categories only. Tender rows come from the GHANEPS scraper, not fixtures.
insert into public.tender_categories (name, slug) values
  ('Construction', 'construction'),
  ('ICT', 'ict'),
  ('Healthcare', 'healthcare'),
  ('Water', 'water'),
  ('Consultancy', 'consultancy')
on conflict (slug) do nothing;

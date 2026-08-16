-- Private storage for company / tender documents uploaded by users

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-documents',
  'user-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Users can manage only files under their own folder: {user_id}/...
drop policy if exists "Users read own document files" on storage.objects;
drop policy if exists "Users upload own document files" on storage.objects;
drop policy if exists "Users update own document files" on storage.objects;
drop policy if exists "Users delete own document files" on storage.objects;

create policy "Users read own document files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users upload own document files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own document files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own document files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

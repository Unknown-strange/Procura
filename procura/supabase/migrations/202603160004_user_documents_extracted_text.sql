-- Optional extracted text for AI analysis when a user chooses to upload a file
alter table public.user_documents
  add column if not exists extracted_text text;

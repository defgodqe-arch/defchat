create table if not exists public.clip_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  source_type text not null check (source_type in ('upload','url')),
  source_url text,
  source_path text,
  clip_length integer not null default 30 check (clip_length between 10 and 180),
  clip_count integer not null default 5 check (clip_count between 1 and 20),
  aspect_ratio text not null default '9:16' check (aspect_ratio in ('9:16','1:1','16:9')),
  caption_style text not null default 'bold' check (caption_style in ('bold','minimal','karaoke')),
  clips jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clip_jobs_user_created_idx on public.clip_jobs(user_id, created_at desc);
alter table public.clip_jobs enable row level security;
drop policy if exists "Users can view their own clip jobs" on public.clip_jobs;
create policy "Users can view their own clip jobs" on public.clip_jobs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create their own clip jobs" on public.clip_jobs;
drop policy if exists "Users can update their own clip jobs" on public.clip_jobs;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clip-studio', 'clip-studio', false, 2147483648, array['video/mp4','video/quicktime','video/webm','video/x-matroska','video/mpeg'])
on conflict (id) do update set public = false, file_size_limit = 2147483648, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Users can upload their own clip source" on storage.objects;
create policy "Users can upload their own clip source" on storage.objects for insert to authenticated
with check (bucket_id = 'clip-studio' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can read their own clip files" on storage.objects;
create policy "Users can read their own clip files" on storage.objects for select to authenticated
using (bucket_id = 'clip-studio' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own clip files" on storage.objects;
create policy "Users can delete their own clip files" on storage.objects for delete to authenticated
using (bucket_id = 'clip-studio' and (storage.foldername(name))[1] = auth.uid()::text);

-- Cinder Doom Scroll video feed
create table if not exists public.doomscroll_videos (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 caption text not null default '' check (char_length(caption) <= 300),
 video_url text not null,
 source text not null default 'user' check (source in ('user','curated','licensed')),
 is_public boolean not null default true,
 created_at timestamptz not null default now()
);
create index if not exists doomscroll_videos_public_created_idx on public.doomscroll_videos (is_public, created_at desc);
alter table public.doomscroll_videos enable row level security;
drop policy if exists "Public videos are viewable" on public.doomscroll_videos;
create policy "Public videos are viewable" on public.doomscroll_videos for select using (is_public = true);
drop policy if exists "Authenticated users can upload videos" on public.doomscroll_videos;
create policy "Authenticated users can upload videos" on public.doomscroll_videos for insert to authenticated with check (auth.uid() = user_id and source = 'user');
drop policy if exists "Owners can delete their videos" on public.doomscroll_videos;
create policy "Owners can delete their videos" on public.doomscroll_videos for delete to authenticated using (auth.uid() = user_id);
create table if not exists public.doomscroll_video_likes (
 video_id uuid not null references public.doomscroll_videos(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(video_id,user_id)
);
alter table public.doomscroll_video_likes enable row level security;
drop policy if exists "Likes are viewable" on public.doomscroll_video_likes;
create policy "Likes are viewable" on public.doomscroll_video_likes for select using (true);
drop policy if exists "Users manage own likes" on public.doomscroll_video_likes;
create policy "Users manage own likes" on public.doomscroll_video_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users remove own likes" on public.doomscroll_video_likes;
create policy "Users remove own likes" on public.doomscroll_video_likes for delete to authenticated using (auth.uid() = user_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('doomscroll-videos','doomscroll-videos',true,157286400,array['video/mp4','video/webm','video/quicktime','video/x-m4v'])
on conflict (id) do update set public=true,file_size_limit=157286400,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public can view Doom Scroll videos" on storage.objects;
create policy "Public can view Doom Scroll videos" on storage.objects for select using (bucket_id='doomscroll-videos');
drop policy if exists "Users upload own Doom Scroll videos" on storage.objects;
create policy "Users upload own Doom Scroll videos" on storage.objects for insert to authenticated with check (bucket_id='doomscroll-videos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete own Doom Scroll videos" on storage.objects;
create policy "Users delete own Doom Scroll videos" on storage.objects for delete to authenticated using (bucket_id='doomscroll-videos' and (storage.foldername(name))[1]=auth.uid()::text);

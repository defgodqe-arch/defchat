-- VYBE-inspired social features for Cinder's existing DoomScroll feed.
create table if not exists public.doomscroll_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  constraint doomscroll_follows_not_self check (follower_id <> creator_id)
);
create index if not exists doomscroll_follows_creator_idx on public.doomscroll_follows (creator_id, created_at desc);
alter table public.doomscroll_follows enable row level security;
drop policy if exists "Follow relationships are viewable" on public.doomscroll_follows;
create policy "Follow relationships are viewable" on public.doomscroll_follows for select to authenticated using (true);
drop policy if exists "Users follow as themselves" on public.doomscroll_follows;
create policy "Users follow as themselves" on public.doomscroll_follows for insert to authenticated with check ((select auth.uid()) = follower_id and follower_id <> creator_id);
drop policy if exists "Users unfollow as themselves" on public.doomscroll_follows;
create policy "Users unfollow as themselves" on public.doomscroll_follows for delete to authenticated using ((select auth.uid()) = follower_id);
grant select, insert, delete on public.doomscroll_follows to authenticated;

create table if not exists public.doomscroll_video_saves (
  video_id uuid not null references public.doomscroll_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);
create index if not exists doomscroll_video_saves_user_idx on public.doomscroll_video_saves (user_id, created_at desc);
alter table public.doomscroll_video_saves enable row level security;
drop policy if exists "Users view own saved videos" on public.doomscroll_video_saves;
create policy "Users view own saved videos" on public.doomscroll_video_saves for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users save videos as themselves" on public.doomscroll_video_saves;
create policy "Users save videos as themselves" on public.doomscroll_video_saves for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.doomscroll_videos v where v.id = video_id and v.is_public = true));
drop policy if exists "Users remove own saved videos" on public.doomscroll_video_saves;
create policy "Users remove own saved videos" on public.doomscroll_video_saves for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, delete on public.doomscroll_video_saves to authenticated;

create table if not exists public.doomscroll_video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.doomscroll_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists doomscroll_video_comments_video_idx on public.doomscroll_video_comments (video_id, created_at asc);
alter table public.doomscroll_video_comments enable row level security;
drop policy if exists "Comments on public videos are viewable" on public.doomscroll_video_comments;
create policy "Comments on public videos are viewable" on public.doomscroll_video_comments for select using (exists (select 1 from public.doomscroll_videos v where v.id = video_id and v.is_public = true));
drop policy if exists "Signed in users comment as themselves" on public.doomscroll_video_comments;
create policy "Signed in users comment as themselves" on public.doomscroll_video_comments for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.doomscroll_videos v where v.id = video_id and v.is_public = true));
drop policy if exists "Users delete own comments" on public.doomscroll_video_comments;
create policy "Users delete own comments" on public.doomscroll_video_comments for delete to authenticated using ((select auth.uid()) = user_id);
grant select on public.doomscroll_video_comments to anon, authenticated;
grant insert, delete on public.doomscroll_video_comments to authenticated;

create table if not exists public.doomscroll_video_reports (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.doomscroll_videos(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists doomscroll_video_reports_created_idx on public.doomscroll_video_reports (created_at desc);
alter table public.doomscroll_video_reports enable row level security;
drop policy if exists "Users report videos as themselves" on public.doomscroll_video_reports;
create policy "Users report videos as themselves" on public.doomscroll_video_reports for insert to authenticated with check ((select auth.uid()) = reporter_id and exists (select 1 from public.doomscroll_videos v where v.id = video_id and v.is_public = true));
drop policy if exists "Users can see their own reports" on public.doomscroll_video_reports;
create policy "Users can see their own reports" on public.doomscroll_video_reports for select to authenticated using ((select auth.uid()) = reporter_id);
grant insert, select on public.doomscroll_video_reports to authenticated;

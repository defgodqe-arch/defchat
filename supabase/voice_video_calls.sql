-- defchat voice and video call signaling.
-- Apply once to the linked Supabase project.
create table if not exists public.voice_call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','ice-candidate','hangup','reject')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint voice_call_signals_not_self check (sender_id <> recipient_id),
  constraint voice_call_signals_payload_size check (pg_column_size(payload) <= 65536)
);
create index if not exists voice_call_signals_recipient_created_idx on public.voice_call_signals (recipient_id, created_at desc);
create index if not exists voice_call_signals_call_id_idx on public.voice_call_signals (call_id, created_at);
alter table public.voice_call_signals enable row level security;
drop policy if exists "Call participants read their signals" on public.voice_call_signals;
create policy "Call participants read their signals" on public.voice_call_signals for select to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);
drop policy if exists "Users send call signals as themselves" on public.voice_call_signals;
create policy "Users send call signals as themselves" on public.voice_call_signals for insert to authenticated
with check ((select auth.uid()) = sender_id and recipient_id <> (select auth.uid()));
grant select, insert on public.voice_call_signals to authenticated;
grant usage, select on sequence public.voice_call_signals_id_seq to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.voice_call_signals;
exception when duplicate_object then null;
end $$;

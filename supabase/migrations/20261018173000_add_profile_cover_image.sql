-- Allow each user to upload a custom temporary full-card profile cover.
-- The regular banner remains underneath and is revealed when the cover artwork fades.
alter table public.profiles
  add column if not exists profile_cover_url text;

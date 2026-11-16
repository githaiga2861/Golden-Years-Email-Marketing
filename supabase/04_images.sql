-- Golden Years Outreach – images you share with facilities
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once.

-- ---------- Storage bucket (public, so the link in your email opens for the facility) ----------
insert into storage.buckets (id, name, public)
values ('outreach-images', 'outreach-images', true)
on conflict (id) do update set public = true;

-- Only signed-in users can upload, replace or delete. Anyone with the link can view (public bucket).
drop policy if exists "outreach images: auth insert" on storage.objects;
drop policy if exists "outreach images: auth update" on storage.objects;
drop policy if exists "outreach images: auth delete" on storage.objects;
drop policy if exists "outreach images: auth select" on storage.objects;

create policy "outreach images: auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'outreach-images');
create policy "outreach images: auth update" on storage.objects
  for update to authenticated using (bucket_id = 'outreach-images') with check (bucket_id = 'outreach-images');
create policy "outreach images: auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'outreach-images');
create policy "outreach images: auth select" on storage.objects
  for select to authenticated using (bucket_id = 'outreach-images');

-- ---------- Image library ----------
create table if not exists public.images (
  id          bigint generated always as identity primary key,
  name        text not null,          -- e.g. "Home care services flyer"
  caption     text,                   -- line shown above the link in the email
  path        text not null,          -- file path inside the outreach-images bucket
  url         text not null,          -- public link put in the email
  created_at  timestamptz not null default now()
);

alter table public.images enable row level security;
drop policy if exists "auth all images" on public.images;
create policy "auth all images" on public.images for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.images to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Remember which image went out with each email
alter table public.email_log add column if not exists image_url text;

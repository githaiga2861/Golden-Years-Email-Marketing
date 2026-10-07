-- Golden Years Outreach – database schema
-- Run this FIRST in Supabase: Dashboard → SQL Editor → New query → paste → Run.

-- ---------- Contacts (referral sources) ----------
create table if not exists public.contacts (
  id               bigint generated always as identity primary key,
  facility         text not null,
  category         text not null check (category in ('hospital','snf','rehab','memory_care','afh')),
  county           text,
  city             text,
  contact_name     text,          -- full name of the owner / administrator / person to greet
  role             text,          -- e.g. "Admissions (Administrator: Austin Hoeft)"
  email            text,
  email_note       text,          -- e.g. "general inbox", "confirm spelling"
  phone            text,
  source           text,          -- where the data was verified
  status           text not null default 'not_contacted'
                   check (status in ('not_contacted','in_sequence','replied','meeting','partner','do_not_contact')),
  last_contacted_at timestamptz,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- Email templates ----------
create table if not exists public.templates (
  id          bigint generated always as identity primary key,
  code        text unique,          -- e.g. "1A"
  name        text not null,
  stage       int  not null default 1, -- 1 intro, 2 value, 3 meeting, 4 final, 5 after reply
  categories  text[] not null default '{}', -- empty = works for every category
  subject     text not null,
  body        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Log of every email opened in Gmail ----------
create table if not exists public.email_log (
  id          bigint generated always as identity primary key,
  contact_id  bigint references public.contacts(id) on delete cascade,
  template_id bigint references public.templates(id) on delete set null,
  to_email    text not null,
  subject     text not null,
  body        text not null,
  opened_at   timestamptz not null default now()
);

-- ---------- Sender settings (one row per key) ----------
create table if not exists public.settings (
  key   text primary key,
  value text
);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists contacts_touch on public.contacts;
create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();
drop trigger if exists templates_touch on public.templates;
create trigger templates_touch before update on public.templates
  for each row execute function public.touch_updated_at();

-- ---------- Security: only signed-in users can read or write ----------
-- Your anon key will be public on GitHub, so Row Level Security MUST stay on.
alter table public.contacts  enable row level security;
alter table public.templates enable row level security;
alter table public.email_log enable row level security;
alter table public.settings  enable row level security;

drop policy if exists "auth all contacts"  on public.contacts;
drop policy if exists "auth all templates" on public.templates;
drop policy if exists "auth all log"       on public.email_log;
drop policy if exists "auth all settings"  on public.settings;

create policy "auth all contacts"  on public.contacts  for all to authenticated using (true) with check (true);
create policy "auth all templates" on public.templates for all to authenticated using (true) with check (true);
create policy "auth all log"       on public.email_log for all to authenticated using (true) with check (true);
create policy "auth all settings"  on public.settings  for all to authenticated using (true) with check (true);


-- Make sure the signed-in role can use the tables through Supabase's API
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.contacts, public.templates, public.email_log, public.settings to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Default sender settings (edit them in the app's Settings tab)
insert into public.settings (key, value) values
  ('sender_name',  'Your Name'),
  ('sender_title', 'Community Liaison'),
  ('direct_line',  '(253) 487-7217'),
  ('gmail_account', '')
on conflict (key) do nothing;

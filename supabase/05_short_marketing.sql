-- Golden Years Outreach – "Short marketing" list + template
-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to run more than once.

-- 1. A list tag on contacts (empty = regular outreach)
alter table public.contacts add column if not exists campaign text;

-- 2. Tag the four facilities (adds any that aren't in the contact list yet)
insert into public.contacts (facility, category, county, city, contact_name, role, email, email_note, phone, source)
select v.* from (values
  ('Shelton Health and Rehabilitation Center', 'snf', 'Mason', 'Shelton', null::text,
   'Admissions / Staffing', null::text, 'not published – call to ask for the right email',
   '360-427-2575 (fax 360-427-2563)', 'WHCA Facility Finder; 153 Johns Ct, Shelton, WA 98584'),
  ('Woodard Creek Health & Rehabilitation', 'snf', 'Thurston', 'Olympia', 'Austin Hoeft',
   'Administrator', null, 'not published – contact form: woodardcreek.com/contact-us/',
   '360-493-4900', 'WHCA Facility Finder; 3333 Ensign Rd NE, Olympia, WA 98506'),
  ('Lacey Post Acute and Rehabilitation', 'snf', 'Thurston', 'Lacey', 'Elizabeth Fachting',
   'Administrator', null, 'not published',
   '360-491-9890 (fax 360-491-9278)', 'WHCA Facility Finder; 4524 Intelco Loop SE, Lacey, WA 98503'),
  ('Birch Creek Post Acute and Rehabilitation', 'snf', 'Pierce', 'Tacoma', 'Sharon Holmes',
   'Administrator', null, 'not published – contact form: birchcreekpostacute.com/contact-us/',
   '253-474-8421 (fax 253-474-1403)', 'WHCA Facility Finder; 5601 S Orchard St, Tacoma, WA 98409')
) as v(facility, category, county, city, contact_name, role, email, email_note, phone, source)
where not exists (
  select 1 from public.contacts c where lower(c.facility) like lower(split_part(v.facility, ' ', 1) || ' ' || split_part(v.facility, ' ', 2)) || '%'
);

update public.contacts set campaign = 'Short marketing'
where facility ilike 'Shelton Health%'
   or facility ilike 'Woodard Creek%'
   or facility ilike 'Lacey Post Acute%'
   or facility ilike 'Birch Creek%';

update public.contacts set notes = coalesce(notes || ' ', '') || 'Mason County – outside the usual 7-county service area.'
where facility ilike 'Shelton Health%' and coalesce(notes, '') not ilike '%Mason County%';

-- 3. The short marketing message
insert into public.templates (code, name, stage, categories, subject, body, sort_order) values
('SM1', 'RN & CNA placements + home health', 6, '{}',
 $s$RN & CNA staffing for {facility}$s$,
 $b$Hi {first_name},

I'm reaching out to see whether {facility} would be open to contracting with Golden Years for RN and CNA placements. When it would help, we can also provide private home health skilled nursing for residents after they go home.

Who would be the best person to talk with about this? I'm happy to send our rates or set up a quick call.

Best regards,

{signature}
$b$, 5)
on conflict (code) do nothing;

-- Check: should list the four facilities
select facility, city, contact_name, email, phone, campaign from public.contacts where campaign = 'Short marketing' order by facility;

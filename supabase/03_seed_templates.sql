-- Seed: email templates (from the Golden Years Referral Outreach Email Sequence doc)
-- Placeholders filled automatically: {first_name} {facility} {city} {county} {sender_name} {sender_title} {direct_line} {client_noun} {category_line} {signature} {previous_subject}
-- Placeholders you fill per email in the preview: {day_option_1} {day_option_2} {meeting_day} {meeting_time} {something_they_said} {one_genuine_update}
insert into public.templates (code, name, stage, categories, subject, body, sort_order) values
('1A', $n$Intro – Hospital case management$n$, 1, '{hospital}', $s$Non-medical home care for your discharges in {city}$s$, $b$Hi {first_name},

I'm {sender_name}, {sender_title} at Golden Years Home Care WA, a non-medical home care agency based in Sumner. We'd like to be a reliable option for your team when a patient is safe to go home but needs help once they get there.

What we provide:
- Personal care: bathing, dressing, toileting and safe transfers
- Medication reminders, meals, light housekeeping and transportation to follow-up appointments
- Hourly, 24-hour and live-in care, usually arranged within days

We're part of a registered-nurse-led organization. Our sister agency, Golden Years Home Health, provides skilled nursing and nurse delegation if a patient's needs grow:
https://goldenyearshomehealthllc.com/skilled-nursing

We serve Pierce, King, Thurston, Lewis, Pacific, Clallam and Jefferson Counties.

Would it help if I sent a one-page referral sheet for your team's desk? For an urgent case, you can call me directly at (206) 717-1234 or use our referral and consultation form. We respond the same business day:
https://goldenyearshomecarewa.com/contact

Thank you for the work you do for patients,

{signature}
$b$, 10),
('1B', $n$Intro – SNF / rehab social services$n$, 1, '{snf,rehab}', $s$Home care support for your short-stay discharges$s$, $b$Hi {first_name},

I'm {sender_name} with Golden Years Home Care WA in Sumner. Many of your short-term rehab residents go home needing hands-on help for the first few weeks. That's the gap we fill.

We can step in on discharge day with:
- Help with bathing, dressing, transfers and mobility at home
- Medication reminders, meals and transportation to therapy or follow-up visits
- Flexible hours, from a few visits a week up to 24-hour and live-in care: https://goldenyearshomecarewa.com/services

Every caregiver is background-checked, reference-checked and supervised under a registered-nurse-led organization. Hours can go up or down as residents recover, with no long-term contract.

Could I stop by {facility} for 10 minutes to drop off referral information and meet your social services team? If a resident needs help now, the fastest route is our consultation form (https://goldenyearshomecarewa.com/contact) or (206) 717-1234.

Best regards,

{signature}
$b$, 20),
('1C', $n$Intro – Memory care / assisted living$n$, 1, '{memory_care}', $s$A home care partner for {facility} families$s$, $b$Hi {first_name},

I'm {sender_name} from Golden Years Home Care WA, a nurse-led home care agency in Sumner. I'm reaching out because we often meet families who aren't ready for a move yet, or who need extra support during a transition.

We can help {facility} in three ways:
- Before move-in: in-home support and respite while a family is on your waitlist or deciding
- During a transition: personal care and companionship at home while a family plans the move
- After a tour that isn't the right fit: a respectful option you can offer families who want to stay home for now

Our caregivers are matched for personality as well as skills, and families get updates after visits. You can see what families say here:
https://goldenyearshomecarewa.com/reviews

Would you be open to a short call to see if a referral partnership makes sense?

Warm regards,

{signature}
$b$, 30),
('1D', $n$Intro – Adult family homes$n$, 1, '{afh}', $s$Respite and extra-hands support for {facility}$s$, $b$Hi {first_name},

I'm {sender_name} with Golden Years Home Care WA in Sumner. We work with adult family home providers who need dependable backup without the hassle of hiring.

How we can help:
- Respite coverage so you can take time off or attend trainings
- Extra hands for personal care, companionship or overnight support when a resident needs more attention
- Clinical support through our sister agency, including nurse delegation (https://goldenyearshomehealthllc.com/nurse-delegation) and skilled nursing (https://goldenyearshomehealthllc.com/skilled-nursing)

We're a local, RN-led Washington family business, not a national call center.

If it's useful, I'm happy to send our rates and availability for {city}. Just reply here or call (206) 717-1234.

Kind regards,

{signature}
$b$, 40),
('2', $n$Follow-up – How referring works (Day 4)$n$, 2, '{}', $s$Re: {previous_subject}$s$, $b$Hi {first_name},

Following up on my note from earlier this week. In short, here's what referring a {client_noun} to Golden Years looks like:

1. You call or send the referral. Phone (206) 717-1234, fax (253) 229-8194, or our online form: https://goldenyearshomecarewa.com/contact
2. We contact the family the same business day and set up a free, no-obligation care consultation.
3. Care usually starts within days. We match a screened caregiver and can adjust hours anytime, with no long-term lock-in.
4. You hear back from us. We confirm that care has started, so the loop is closed on your end.

{category_line}

Our full list of services: https://goldenyearshomecarewa.com/services
Our coverage area: https://goldenyearshomecarewa.com/locations

Who on your team is the best person to keep in the loop?

Thank you,

{signature}
$b$, 50),
('3', $n$Meeting / in-service offer (Day 10)$n$, 3, '{}', $s$15 minutes with your team at {facility}?$s$, $b$Hi {first_name},

I know your inbox is full, so I'll keep this brief. I'd like to offer your team something useful rather than another brochure:

- A 20-minute in-service or lunch-and-learn at {facility}, on a topic your team picks, for example "Safe discharge home: what families underestimate" or "When home care is enough, and when it isn't." Lunch is on us.
- Or a 15-minute call at a time that suits you, to understand how you prefer to receive referrals and what makes a home care partner easy to work with.

Either way, I'll bring referral sheets with our direct line and fax so the next referral takes less than a minute.

Would {day_option_1} or {day_option_2} work? If neither does, just reply with a time and I'll make it work.

You can learn more about our team and our nurse-led approach here:
https://goldenyearshomecarewa.com/why-us

With appreciation,

{signature}
$b$, 60),
('4', $n$Final follow-up (Day 21)$n$, 4, '{}', $s$Should I close the loop?$s$, $b$Hi {first_name},

I've reached out a few times about Golden Years Home Care WA as a home care resource for {facility}, and I don't want to crowd your inbox.

If now isn't the right time, no problem at all. I'll check in again in a few months. If someone else on your team handles home care referrals, I'd be grateful if you could point me their way.

In case it's useful later, everything you need is in one place:
- Referral or consultation: https://goldenyearshomecarewa.com/contact
- Phone (206) 717-1234 · Fax (253) 229-8194
- Services: https://goldenyearshomecarewa.com/services

Thank you for everything you do for the people in your care.

Best,

{signature}
$b$, 70),
('5A', $n$Meeting confirmation$n$, 5, '{}', $s$Confirmed: {meeting_day}, {meeting_time} at {facility}$s$, $b$Hi {first_name},

Thank you for making time. I'm confirming our meeting on {meeting_day} at {meeting_time} at {facility}. I'll plan for about 20 minutes and bring referral sheets for your team.

If anything changes, just reply here or call me at {direct_line}.

Looking forward to meeting you,

{signature}
$b$, 80),
('5B', $n$Thank you after the meeting$n$, 5, '{}', $s$Thank you, and our referral details$s$, $b$Hi {first_name},

Thank you for meeting with me today. It was helpful to hear {something_they_said}.

As promised, here's everything in one place:
- Referrals: call (206) 717-1234, fax (253) 229-8194, or use our online form: https://goldenyearshomecarewa.com/contact
- Hours: office Mon–Fri 8am–6pm; care available 24/7
- Services: https://goldenyearshomecarewa.com/services
- Skilled nursing and nurse delegation (Golden Years Home Health): https://goldenyearshomehealthllc.com/services

I'll check in next month. In the meantime, please call me directly whenever a {client_noun} could use support at home.

Warm regards,

{signature}
$b$, 90),
('5C', $n$Thank you after the first referral$n$, 5, '{}', $s$Thank you for the referral$s$, $b$Hi {first_name},

Thank you for trusting us with your referral this week. Our team reached out the same day and the family's care consultation is underway.

We'll keep you posted as appropriate. If there's anything we could have made easier on your end, I'd like to hear it.

With gratitude,

{signature}
$b$, 100),
('5D', $n$Quarterly check-in (every 90 days)$n$, 5, '{}', $s$Quick hello from Golden Years Home Care$s$, $b$Hi {first_name},

I hope the season is treating you and the team at {facility} well. A quick update from our side:
- {one_genuine_update}
- We still respond to every referral the same business day.

If it would help, I'm happy to drop off fresh referral sheets or join a team huddle for 10 minutes. Just let me know.

All the best,

{signature}
$b$, 110)
on conflict (code) do nothing;

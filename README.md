# Golden Years Outreach

A small HTML + JavaScript app for referral outreach. It stores your contacts and email templates in Supabase. Pick a template, tick one or more receivers, and it writes a personalized email for each one. Every email opens in Gmail's compose window, and you press **Send** there.

No build step and no server: just static files you can host free on GitHub Pages.

- **Live app:** https://githaiga2861.github.io/Golden-Years-Email-Marketing/
- **Opened from:** the "Email Marketing" card on https://golden-years-websites-admin.vercel.app
- **Supabase project:** https://tpxgkfxnesonedplzcrd.supabase.co (already set in `config.js`)

```
index.html          the app
app.js              all logic (Supabase + personalization + Gmail links)
styles.css          styling
config.js           Supabase URL + publishable key + Admin URL (already filled in)
icons/              Golden Years logo (same as the Admin app)
supabase/
  01_schema.sql           tables, security rules, default settings
  02_seed_contacts.sql    the 137 referral contacts (54 with emails)
  03_seed_templates.sql   the 11 email templates from the outreach sequence
```

## 1. Set up Supabase (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**. Paste and **Run** each file in order: `01_schema.sql`, then `02_seed_contacts.sql`, then `03_seed_templates.sql`.
3. Go to **Authentication → Users → Add user → Create new user**. Enter your email and a strong password, and tick **Auto Confirm User**.
4. **Important:** go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up". The anon key is public in your GitHub repo. With sign-ups off, only the users you create yourself can log in and see the contacts.
5. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.

## 2. Connect the app

Open `config.js` and paste the two values:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://abcd1234.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
};
```

Never paste the `service_role` key anywhere in this project.

To try it on your computer, open the folder in VS Code and use the "Live Server" extension, or run `python3 -m http.server` in the folder and visit http://localhost:8000.

## 3. Put it on GitHub Pages

1. Create a GitHub repository and push these files to it.
2. In the repository, go to **Settings → Pages**. Set Source to "Deploy from a branch" and choose `main` and `/ (root)`.
3. Your app will be live at `https://<your-username>.github.io/<repo-name>/`.
4. In Supabase, go to **Authentication → URL Configuration** and add that address under **Site URL**.

## 4. Using it

1. **Settings tab.** Enter your name, title, direct line and the Gmail address you send from. Save. This builds your signature.
2. **Compose tab.**
   - Click a template. The receiver list filters to the categories that template was written for. Untick "Only categories this template is written for" to see everyone.
   - Tick receivers, or click **Select all shown**. Contacts without an email are greyed out.
   - Click **Generate personalized emails**. Each receiver gets their own draft with their name (or "Admissions Team" style greeting when no name is known), facility, city, category-specific wording and your signature.
   - Some templates have fields only you can know, such as `{day_option_1}`. A yellow box appears. Fill those in once and click **Apply to all drafts**. You can also edit any draft directly.
   - Click **Open in Gmail** on one draft, **Open next in Gmail** to go one at a time, or **Open all in Gmail** to open one tab per receiver. Review each tab and press Send.
3. Every email you open is saved in the **Sent log**. The contact's status moves from "Not contacted" to "In sequence".
4. **Contacts tab.** Edit names, emails and status (for example "Replied", "Partner" or "Do not contact"), or add new contacts. "Do not contact" stops a contact from being selected.
5. **Templates tab.** Edit the wording, or create new templates. Use `{placeholders}`. Ones the app knows are filled automatically:
   `{first_name} {contact_name} {facility} {city} {county} {sender_name} {sender_title} {direct_line} {client_noun} {category_line} {signature} {previous_subject}`.
   Any other `{name}` becomes a fill-in box.

### Good to know

- **"Open all" and pop-ups.** Browsers block several new tabs at once by default. The first time, click the pop-up icon in the address bar and choose "Always allow pop-ups from this site". Until then, use **Open next in Gmail**.
- **Gmail compose links send plain text.** Links show as full web addresses, which Gmail makes clickable automatically. Formatting such as bold is not carried over.
- **The app never sends anything itself.** It only prepares the email. Nothing goes out until you press Send in Gmail, so a log entry means "opened in Gmail", not "delivered".
- **Check names before sending.** Names come from public listings. For example, Franke Tobey Jones's published email goes to a general contact, not the admissions person named in the list.
- **Patient information.** Never put client or patient details in these emails. Ask partners to send referrals by fax, phone or the web form.
- **Sending volume.** To protect your Gmail account from spam flags, keep to about 20–30 new outreach emails a day.

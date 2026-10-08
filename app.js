/* Golden Years Outreach – plain JS + Supabase
 * Flow: pick template → pick receivers → generate one personalized draft each → open each in Gmail.
 */
(() => {
  "use strict";

  // ---------------------------------------------------------------- setup
  const cfg = window.APP_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") && !cfg.SUPABASE_ANON_KEY.includes("YOUR-ANON");

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const show = (el, on = true) => el.classList.toggle("hidden", !on);

  // "Back to Admin" links
  const adminUrl = cfg.ADMIN_URL || "https://golden-years-websites-admin.vercel.app";
  $$(".admin-link").forEach((a) => (a.href = adminUrl));

  if (!configured) {
    show($("#config-view"));
    return;
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const CATEGORY_LABEL = {
    hospital: "Hospital",
    snf: "Skilled nursing",
    rehab: "Rehab",
    memory_care: "Memory care / AL",
    afh: "Adult family home",
  };
  const STATUS_LABEL = {
    not_contacted: "Not contacted",
    in_sequence: "In sequence",
    replied: "Replied",
    meeting: "Meeting",
    partner: "Partner",
    do_not_contact: "Do not contact",
  };
  const STAGE_LABEL = {
    1: "1 · Introduction",
    2: "2 · Value follow-up (day 4)",
    3: "3 · Meeting offer (day 10)",
    4: "4 · Final follow-up (day 21)",
    5: "5 · After a reply",
  };
  // Greeting used when we don't know the person's name
  const TEAM_GREETING = {
    hospital: "Care Management Team",
    snf: "Admissions Team",
    rehab: "Admissions Team",
    memory_care: "Community Relations Team",
    afh: "Care Team",
  };
  const CLIENT_NOUN = {
    hospital: "patient",
    snf: "resident",
    rehab: "resident",
    memory_care: "family",
    afh: "client",
  };
  const CATEGORY_LINE = {
    hospital:
      "This is especially helpful for patients who are medically ready to leave but whose families can't cover the first nights at home.",
    snf: "This is especially helpful in the first few weeks after discharge, while residents regain strength at home.",
    rehab:
      "This is especially helpful in the first few weeks after discharge, while residents regain strength at home.",
    memory_care: "This gives families on your waitlist a safe option at home in the meantime.",
    afh: "This gives you a single number to call for respite or extra coverage.",
  };
  const AUTO_FIELDS = new Set([
    "first_name", "contact_name", "facility", "city", "county", "sender_name", "sender_title",
    "direct_line", "client_noun", "category_line", "signature", "previous_subject",
  ]);

  const state = {
    contacts: [],
    templates: [],
    settings: {},
    lastSubjectByContact: {}, // contact_id → most recent subject sent
    selectedTemplateId: null,
    selectedIds: new Set(),
    drafts: [], // {contact, to, subject, body, opened}
    manualValues: {},
    editingTemplateId: null,
    editingContactId: null,
  };

  // ---------------------------------------------------------------- helpers
  function toast(msg, isError = false) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("error", isError);
    show(t);
    clearTimeout(toast._t);
    toast._t = setTimeout(() => show(t, false), 3500);
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (k === "checked" || k === "disabled" || k === "value") node[k] = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function firstName(contact) {
    const n = (contact.contact_name || "").trim();
    if (n) return n.split(/\s+/)[0];
    return TEAM_GREETING[contact.category] || "there";
  }

  // The Gmail account emails open in: Settings value first, then config.js SENDER_EMAIL.
  function senderEmail() {
    return ((state.settings.gmail_account || "").trim() || (cfg.SENDER_EMAIL || "").trim()).toLowerCase();
  }

  function signature() {
    const s = state.settings;
    return [
      s.sender_name || "{sender_name}",
      `${s.sender_title || "{sender_title}"} | Golden Years Home Care WA`,
      "A Golden Years Home Health company — RN-led, founded by Rose Mbote, BSN, RN",
      "Main (206) 717-1234 · Office (253) 487-7217 · Fax (253) 229-8194",
      s.direct_line && s.direct_line !== "(253) 487-7217" ? `Direct ${s.direct_line}` : null,
      senderEmail() || "contact@goldenyearshomehealthllc.com",
      "https://goldenyearshomecarewa.com",
      "Free care consultation: https://goldenyearshomecarewa.com/contact",
      "614 Harrison St, Suite C, Sumner, WA 98390",
      "",
      "If you'd prefer not to hear from us, reply \"unsubscribe\" and we'll remove you right away.",
    ].filter((l) => l !== null).join("\n");
  }

  function previousSubject(contact) {
    const prev = state.lastSubjectByContact[contact.id];
    if (prev) return prev.subject.replace(/^(re:\s*)+/i, "");
    // fall back to the intro template written for this contact's category
    const intro = state.templates.find((t) => t.stage === 1 && t.categories.includes(contact.category));
    return intro ? fill(intro.subject, contact) : "Golden Years Home Care WA";
  }

  function autoValues(contact) {
    const s = state.settings;
    return {
      first_name: firstName(contact),
      contact_name: contact.contact_name || TEAM_GREETING[contact.category],
      facility: contact.facility,
      city: contact.city || contact.county || "your area",
      county: contact.county ? `${contact.county} County` : "",
      sender_name: s.sender_name || "",
      sender_title: s.sender_title || "",
      direct_line: s.direct_line || "(206) 717-1234",
      client_noun: CLIENT_NOUN[contact.category] || "client",
      category_line: CATEGORY_LINE[contact.category] || "",
      signature: signature(),
    };
  }

  // Replace {placeholders}. Unknown ones are left as {name} so the user sees what's missing.
  function fill(text, contact, extra = {}) {
    const values = { ...autoValues(contact), ...extra };
    return text.replace(/\{([a-z0-9_]+)\}/gi, (m, key) => {
      if (key === "previous_subject") return previousSubject(contact);
      const v = values[key];
      return v !== undefined && v !== "" ? v : m;
    });
  }

  function placeholdersIn(text) {
    return [...new Set([...text.matchAll(/\{([a-z0-9_]+)\}/gi)].map((m) => m[1]))];
  }

  function gmailUrl(to, subject, body) {
    const p = new URLSearchParams({ view: "cm", fs: "1", tf: "1", to, su: subject, body });
    // /mail/u/<email>/ makes Gmail open in that exact account even when several are signed in.
    const acct = senderEmail().replace(/[^a-z0-9@._+-]/g, "");
    if (!acct) return "https://mail.google.com/mail/?" + p.toString();
    p.set("authuser", acct);
    return `https://mail.google.com/mail/u/${acct}/?` + p.toString();
  }

  // ---------------------------------------------------------------- data
  async function loadAll() {
    const [c, t, s, l] = await Promise.all([
      sb.from("contacts").select("*").order("facility"),
      sb.from("templates").select("*").order("stage").order("sort_order"),
      sb.from("settings").select("*"),
      sb.from("email_log").select("contact_id, template_id, subject, opened_at").order("opened_at", { ascending: true }),
    ]);
    for (const r of [c, t, s, l]) if (r.error) throw r.error;
    state.contacts = c.data;
    state.templates = t.data.map((x) => ({ ...x, categories: x.categories || [] }));
    state.settings = Object.fromEntries(s.data.map((r) => [r.key, r.value]));
    state.lastSubjectByContact = {};
    // Email 2 replies to the intro thread: remember the last intro (stage 1) subject per contact,
    // falling back to the last subject of any kind.
    const stageOf = Object.fromEntries(state.templates.map((x) => [x.id, x.stage]));
    for (const row of l.data) {
      const isIntro = stageOf[row.template_id] === 1;
      const prev = state.lastSubjectByContact[row.contact_id];
      if (isIntro || !prev || !prev.intro) state.lastSubjectByContact[row.contact_id] = { subject: row.subject, intro: isIntro };
    }
  }

  async function refresh() {
    try {
      await loadAll();
      renderAll();
    } catch (e) {
      console.error(e);
      toast("Could not load data: " + (e.message || e), true);
    }
  }

  // ---------------------------------------------------------------- auth
  async function initAuth() {
    const { data } = await sb.auth.getSession();
    sb.auth.onAuthStateChange((_evt, session) => setSignedIn(!!session));
    setSignedIn(!!data.session);
  }

  function setSignedIn(on) {
    show($("#login-view"), !on);
    show($("#app-view"), on);
    if (on && !setSignedIn._loaded) {
      setSignedIn._loaded = true;
      refresh();
    }
    if (!on) setSignedIn._loaded = false;
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#login-error").textContent = "";
    const { error } = await sb.auth.signInWithPassword({
      email: $("#login-email").value.trim(),
      password: $("#login-password").value,
    });
    if (error) $("#login-error").textContent = error.message;
  });
  $("#logout").addEventListener("click", () => sb.auth.signOut());

  // ---------------------------------------------------------------- tabs
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]");
    if (!b) return;
    $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".tab").forEach((t) => show(t, t.id === "tab-" + b.dataset.tab));
  });

  function renderAll() {
    renderTemplatePicker();
    renderCountyFilter();
    renderRecipients();
    renderContacts();
    renderTemplateEditorList();
    renderSettings();
    renderLog();
  }

  // ================================================================ COMPOSE
  function selectedTemplate() {
    return state.templates.find((t) => t.id === state.selectedTemplateId) || null;
  }

  function renderTemplatePicker() {
    const box = $("#template-list");
    box.replaceChildren();
    let stage = null;
    for (const t of state.templates) {
      if (t.stage !== stage) {
        stage = t.stage;
        box.append(el("div", { class: "stage-label" }, STAGE_LABEL[stage] || `Stage ${stage}`));
      }
      box.append(
        el("button", {
          class: "tpl" + (t.id === state.selectedTemplateId ? " active" : ""),
          onclick: () => {
            state.selectedTemplateId = t.id;
            // drop selected receivers this template isn't written for, so nothing hidden gets emailed
            if (t.categories.length) {
              for (const id of [...state.selectedIds]) {
                const c = state.contacts.find((x) => x.id === id);
                if (!c || !t.categories.includes(c.category)) state.selectedIds.delete(id);
              }
            }
            renderTemplatePicker();
            renderRecipients();
          },
        },
          el("strong", {}, `${t.code ? t.code + " · " : ""}${t.name}`),
          el("span", { class: "muted small" },
            t.categories.length ? t.categories.map((c) => CATEGORY_LABEL[c]).join(", ") : "All categories"),
        ),
      );
    }
    if (!state.templates.length) box.append(el("p", { class: "muted" }, "No templates yet. Run supabase/03_seed_templates.sql or add one in Templates."));
  }

  function renderCountyFilter() {
    const sel = $("#r-county");
    const current = sel.value;
    const counties = [...new Set(state.contacts.map((c) => c.county).filter(Boolean))].sort();
    sel.replaceChildren(el("option", { value: "" }, "All counties"), ...counties.map((c) => el("option", { value: c }, c)));
    sel.value = current;
  }

  function filteredRecipients() {
    const q = $("#r-search").value.trim().toLowerCase();
    const cat = $("#r-category").value;
    const county = $("#r-county").value;
    const status = $("#r-status").value;
    const t = selectedTemplate();
    const matchOnly = $("#r-match").checked && t && t.categories.length;
    return state.contacts.filter((c) => {
      if (cat && c.category !== cat) return false;
      if (county && c.county !== county) return false;
      if (status && c.status !== status) return false;
      if (matchOnly && !t.categories.includes(c.category)) return false;
      if (q) {
        const hay = [c.facility, c.contact_name, c.city, c.county, c.email, c.role].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  const sendable = (c) => !!c.email && c.status !== "do_not_contact";

  function renderRecipients() {
    const list = $("#recipient-list");
    list.replaceChildren();
    const rows = filteredRecipients();
    // emailable first
    rows.sort((a, b) => (sendable(b) - sendable(a)) || a.facility.localeCompare(b.facility));
    for (const c of rows) {
      const ok = sendable(c);
      list.append(
        el("label", { class: "recipient" + (ok ? "" : " disabled") },
          el("input", {
            type: "checkbox",
            checked: state.selectedIds.has(c.id),
            disabled: !ok,
            onchange: (e) => {
              e.target.checked ? state.selectedIds.add(c.id) : state.selectedIds.delete(c.id);
              updateSelectedCount();
            },
          }),
          el("div", { class: "r-main" },
            el("div", {}, el("strong", {}, c.facility), " ", el("span", { class: "tag " + c.category }, CATEGORY_LABEL[c.category])),
            el("div", { class: "muted small" },
              [c.contact_name, [c.city, c.county].filter(Boolean).join(", "), c.email || "no email"].filter(Boolean).join(" · ")),
          ),
          el("span", { class: "status " + c.status }, STATUS_LABEL[c.status] || c.status),
        ),
      );
    }
    if (!rows.length) list.append(el("p", { class: "muted pad" }, "No contacts match these filters."));
    updateSelectedCount();
  }

  function updateSelectedCount() {
    $("#selected-count").textContent = `${state.selectedIds.size} selected`;
  }

  ["#r-search", "#r-category", "#r-county", "#r-status", "#r-match"].forEach((s) =>
    $(s).addEventListener("input", renderRecipients));
  $("#r-select-all").addEventListener("click", () => {
    filteredRecipients().filter(sendable).forEach((c) => state.selectedIds.add(c.id));
    renderRecipients();
  });
  $("#r-clear").addEventListener("click", () => {
    state.selectedIds.clear();
    renderRecipients();
  });

  // ---------- generate drafts
  $("#generate").addEventListener("click", () => {
    const t = selectedTemplate();
    if (!t) return toast("Pick a template first.", true);
    const chosen = state.contacts.filter((c) => state.selectedIds.has(c.id) && sendable(c));
    if (!chosen.length) return toast("Select at least one receiver with an email.", true);

    const mismatched = chosen.filter((c) => t.categories.length && !t.categories.includes(c.category));
    state.manualValues = {};
    state.drafts = chosen.map((c) => ({
      contact: c,
      template: t,
      to: c.email,
      subject: fill(t.subject, c),
      body: fill(t.body, c),
      opened: false,
    }));
    renderManualFields();
    renderDrafts();
    const msg = $("#drafts-msg");
    if (mismatched.length) {
      msg.textContent = `Heads up: "${t.name}" is written for ${t.categories.map((x) => CATEGORY_LABEL[x]).join(", ")}, but ${mismatched.length} receiver(s) are in other categories. Check their drafts before sending.`;
      show(msg);
    } else show(msg, false);
    show($("#drafts-section"));
    $("#drafts-section").scrollIntoView({ behavior: "smooth" });
  });

  // Fields like {day_option_1} that can't be auto-filled: one box applies to every draft.
  function renderManualFields() {
    const box = $("#manual-fields");
    box.replaceChildren();
    const keys = new Set();
    for (const d of state.drafts) placeholdersIn(d.subject + "\n" + d.body).forEach((k) => keys.add(k));
    if (!keys.size) return show(box, false);
    box.append(el("p", { class: "small" }, el("strong", {}, "Fill these in once for all drafts"), " (you can still edit each draft below):"));
    const grid = el("div", { class: "row wrap" });
    for (const k of keys) {
      const input = el("input", { placeholder: k.replace(/_/g, " "), "data-key": k });
      grid.append(el("label", {}, k.replace(/_/g, " "), input));
    }
    const apply = el("button", {
      class: "btn small",
      onclick: () => {
        $$("input[data-key]", box).forEach((i) => { if (i.value.trim()) state.manualValues[i.dataset.key] = i.value.trim(); });
        for (const d of state.drafts) {
          d.subject = replaceManual(d.subject);
          d.body = replaceManual(d.body);
        }
        renderManualFields();
        renderDrafts();
      },
    }, "Apply to all drafts");
    box.append(grid, apply);
    show(box);
  }

  function replaceManual(text) {
    return text.replace(/\{([a-z0-9_]+)\}/gi, (m, k) => state.manualValues[k] ?? m);
  }

  function renderDrafts() {
    const box = $("#drafts");
    box.replaceChildren();
    const openedCount = state.drafts.filter((d) => d.opened).length;
    $("#draft-count").textContent = `${openedCount} of ${state.drafts.length} opened`;
    $("#sending-from").textContent = senderEmail()
      ? `Opens in Gmail as ${senderEmail()}`
      : "No sending account set – Gmail will use your default account. Set one in Settings.";

    state.drafts.forEach((d, i) => {
      const subj = el("input", { value: d.subject, oninput: (e) => { d.subject = e.target.value; refreshWarn(); } });
      const to = el("input", { type: "email", value: d.to, oninput: (e) => (d.to = e.target.value.trim()) });
      const body = el("textarea", { rows: 14, oninput: (e) => { d.body = e.target.value; refreshWarn(); } });
      body.value = d.body;
      const warn = el("p", { class: "warn small" });
      function refreshWarn() {
        const m = placeholdersIn(d.subject + "\n" + d.body);
        warn.textContent = m.length ? "Still to fill: " + m.map((x) => `{${x}}`).join(", ") : "";
        show(warn, m.length > 0);
      }
      refreshWarn();

      const card = el("article", { class: "draft" + (d.opened ? " opened" : "") },
        el("header", {},
          el("div", {},
            el("strong", {}, d.contact.facility), " ",
            el("span", { class: "tag " + d.contact.category }, CATEGORY_LABEL[d.contact.category]),
            d.contact.email_note ? el("div", { class: "muted small" }, "Note: " + d.contact.email_note) : null,
          ),
          el("span", { class: "muted small" }, `#${i + 1}`),
        ),
        el("label", {}, "To", to),
        el("label", {}, "Subject", subj),
        el("label", {}, "Body", body),
        warn,
        el("div", { class: "actions" },
          el("button", { class: "btn ghost small", onclick: () => copyDraft(d) }, "Copy text"),
          el("button", { class: "btn ghost small", onclick: () => { state.drafts.splice(i, 1); renderDrafts(); } }, "Remove"),
          el("button", { class: "btn primary small", onclick: () => openDraft(d) }, d.opened ? "Open again in Gmail" : "Open in Gmail"),
        ),
      );
      box.append(card);
    });
  }

  async function copyDraft(d) {
    try {
      await navigator.clipboard.writeText(`To: ${d.to}\nSubject: ${d.subject}\n\n${d.body}`);
      toast("Copied.");
    } catch {
      toast("Copy failed – select the text manually.", true);
    }
  }

  function draftProblems(d) {
    if (!d.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.to)) return "This draft has no valid email address.";
    const m = placeholdersIn(d.subject + "\n" + d.body);
    if (m.length) return `Fill ${m.map((x) => `{${x}}`).join(", ")} for ${d.contact.facility} first.`;
    return null;
  }

  // Opens Gmail compose. Returns false if the browser blocked the pop-up.
  function openDraft(d, { silent = false } = {}) {
    const problem = draftProblems(d);
    if (problem) {
      if (!silent) toast(problem, true);
      return "invalid";
    }
    const url = gmailUrl(d.to, d.subject, d.body);
    if (url.length > 8000 && !silent) toast("This email is very long; Gmail may cut it off. Consider shortening it.", true);
    const w = window.open(url, "_blank");
    if (!w) return "blocked";
    d.opened = true;
    logSend(d);
    renderDrafts();
    return "ok";
  }

  async function logSend(d) {
    const c = d.contact;
    const { error } = await sb.from("email_log").insert({
      contact_id: c.id, template_id: d.template?.id ?? null, to_email: d.to, subject: d.subject, body: d.body,
    });
    if (error) return toast("Opened in Gmail, but logging failed: " + error.message, true);
    const patch = { last_contacted_at: new Date().toISOString() };
    if (c.status === "not_contacted") patch.status = "in_sequence";
    await sb.from("contacts").update(patch).eq("id", c.id);
    Object.assign(c, patch);
    const isIntro = d.template?.stage === 1;
    const prev = state.lastSubjectByContact[c.id];
    if (isIntro || !prev || !prev.intro) state.lastSubjectByContact[c.id] = { subject: d.subject, intro: isIntro };
    renderRecipients();
    renderContacts();
    renderLog();
  }

  $("#open-next").addEventListener("click", () => {
    const next = state.drafts.find((d) => !d.opened);
    if (!next) return toast("All drafts have been opened.");
    const r = openDraft(next);
    if (r === "blocked") toast("Your browser blocked the Gmail tab. Allow pop-ups for this site and try again.", true);
  });

  $("#open-all").addEventListener("click", () => {
    const pending = state.drafts.filter((d) => !d.opened);
    if (!pending.length) return toast("All drafts have been opened.");
    const bad = pending.map(draftProblems).filter(Boolean);
    if (bad.length) return toast(bad[0], true);
    if (pending.length > 1 && !confirm(`Open ${pending.length} Gmail tabs, one per receiver? You'll review and press Send in each tab.`)) return;
    let opened = 0;
    for (const d of pending) {
      const r = openDraft(d, { silent: true });
      if (r === "blocked") break;
      if (r === "ok") opened++;
    }
    if (opened < pending.length) {
      toast(`Opened ${opened} of ${pending.length}. Your browser blocked the rest – allow pop-ups for this site, or use "Open next".`, true);
    } else toast(`Opened ${opened} Gmail tabs.`);
  });

  // ================================================================ CONTACTS
  function renderContacts() {
    const q = $("#c-search").value.trim().toLowerCase();
    const body = $("#contact-rows");
    body.replaceChildren();
    const rows = state.contacts.filter((c) =>
      !q || [c.facility, c.contact_name, c.city, c.county, c.email, c.category].join(" ").toLowerCase().includes(q));
    $("#contact-count").textContent = `${rows.length} of ${state.contacts.length}`;
    for (const c of rows) {
      body.append(el("tr", {},
        el("td", {}, el("strong", {}, c.facility)),
        el("td", {}, el("span", { class: "tag " + c.category }, CATEGORY_LABEL[c.category])),
        el("td", {}, [c.city, c.county].filter(Boolean).join(", ")),
        el("td", {}, c.contact_name || "—"),
        el("td", {}, c.email || el("span", { class: "muted" }, "not published")),
        el("td", {}, el("span", { class: "status " + c.status }, STATUS_LABEL[c.status])),
        el("td", { class: "small" }, fmtDate(c.last_contacted_at)),
        el("td", {}, el("button", { class: "btn ghost small", onclick: () => openContact(c) }, "Edit")),
      ));
    }
  }
  $("#c-search").addEventListener("input", renderContacts);
  $("#c-add").addEventListener("click", () => openContact(null));

  const CONTACT_FIELDS = ["facility", "category", "county", "city", "contact_name", "role", "email", "email_note", "phone", "status", "notes", "source"];

  function openContact(c) {
    state.editingContactId = c ? c.id : null;
    $("#contact-dialog-title").textContent = c ? "Edit contact" : "Add contact";
    for (const f of CONTACT_FIELDS) $("#f-" + f).value = c ? (c[f] ?? "") : (f === "status" ? "not_contacted" : f === "category" ? "afh" : "");
    show($("#contact-delete"), !!c);
    $("#contact-dialog").showModal();
  }

  $("#contact-form").addEventListener("submit", async (e) => {
    if (e.submitter?.value !== "save") return;
    e.preventDefault();
    const row = {};
    for (const f of CONTACT_FIELDS) row[f] = $("#f-" + f).value.trim() || null;
    if (!row.facility) return toast("Facility is required.", true);
    row.status = row.status || "not_contacted";
    const q = state.editingContactId
      ? sb.from("contacts").update(row).eq("id", state.editingContactId)
      : sb.from("contacts").insert(row);
    const { error } = await q;
    if (error) return toast(error.message, true);
    $("#contact-dialog").close();
    toast("Contact saved.");
    refresh();
  });

  $("#contact-delete").addEventListener("click", async () => {
    if (!state.editingContactId || !confirm("Delete this contact and its sent log?")) return;
    const { error } = await sb.from("contacts").delete().eq("id", state.editingContactId);
    if (error) return toast(error.message, true);
    state.selectedIds.delete(state.editingContactId);
    $("#contact-dialog").close();
    toast("Contact deleted.");
    refresh();
  });

  // ================================================================ TEMPLATES
  function renderTemplateEditorList() {
    const box = $("#tpl-edit-list");
    box.replaceChildren();
    for (const t of state.templates) {
      box.append(el("button", {
        class: "tpl" + (t.id === state.editingTemplateId ? " active" : ""),
        onclick: () => editTemplate(t),
      }, el("strong", {}, `${t.code ? t.code + " · " : ""}${t.name}`), el("span", { class: "muted small" }, STAGE_LABEL[t.stage] || "")));
    }
    if (state.editingTemplateId === null && state.templates[0] && !renderTemplateEditorList._init) {
      renderTemplateEditorList._init = true;
      editTemplate(state.templates[0]);
    }
  }

  function editTemplate(t) {
    state.editingTemplateId = t ? t.id : null;
    $("#t-code").value = t?.code || "";
    $("#t-stage").value = t?.stage || 1;
    $("#t-order").value = t?.sort_order ?? (state.templates.length + 1) * 10;
    $("#t-name").value = t?.name || "";
    $("#t-subject").value = t?.subject || "";
    $("#t-body").value = t?.body || "Hi {first_name},\n\n\n\n{signature}";
    $$(".cats input").forEach((i) => (i.checked = !!t && t.categories.includes(i.value)));
    show($("#t-delete"), !!t);
    renderTemplateEditorList();
  }

  $("#t-new").addEventListener("click", () => editTemplate(null));

  $("#tpl-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const row = {
      code: $("#t-code").value.trim() || null,
      stage: Number($("#t-stage").value),
      sort_order: Number($("#t-order").value) || 0,
      name: $("#t-name").value.trim(),
      subject: $("#t-subject").value.trim(),
      body: $("#t-body").value,
      categories: $$(".cats input:checked").map((i) => i.value),
    };
    const q = state.editingTemplateId
      ? sb.from("templates").update(row).eq("id", state.editingTemplateId).select().single()
      : sb.from("templates").insert(row).select().single();
    const { data, error } = await q;
    if (error) return toast(error.message, true);
    state.editingTemplateId = data.id;
    toast("Template saved.");
    refresh();
  });

  $("#t-delete").addEventListener("click", async () => {
    if (!state.editingTemplateId || !confirm("Delete this template?")) return;
    const { error } = await sb.from("templates").delete().eq("id", state.editingTemplateId);
    if (error) return toast(error.message, true);
    if (state.selectedTemplateId === state.editingTemplateId) state.selectedTemplateId = null;
    state.editingTemplateId = null;
    renderTemplateEditorList._init = false;
    toast("Template deleted.");
    refresh();
  });

  // ================================================================ LOG
  async function renderLog() {
    const { data, error } = await sb
      .from("email_log")
      .select("opened_at, to_email, subject, contacts(facility), templates(code, name)")
      .order("opened_at", { ascending: false })
      .limit(300);
    const body = $("#log-rows");
    body.replaceChildren();
    if (error) return body.append(el("tr", {}, el("td", { colspan: 5 }, error.message)));
    if (!data.length) return body.append(el("tr", {}, el("td", { colspan: 5, class: "muted" }, "Nothing sent yet.")));
    for (const r of data) {
      body.append(el("tr", {},
        el("td", { class: "small" }, fmtDate(r.opened_at)),
        el("td", {}, r.contacts?.facility || "—"),
        el("td", {}, r.to_email),
        el("td", {}, r.templates ? `${r.templates.code || ""} ${r.templates.name}` : "—"),
        el("td", {}, r.subject),
      ));
    }
  }

  // ================================================================ SETTINGS
  const SETTING_KEYS = ["sender_name", "sender_title", "direct_line", "gmail_account"];
  function renderSettings() {
    for (const k of SETTING_KEYS) $("#s-" + k).value = state.settings[k] || "";
    $("#sig-preview").textContent = signature();
  }
  SETTING_KEYS.forEach((k) => $("#s-" + k).addEventListener("input", () => {
    state.settings[k] = $("#s-" + k).value;
    $("#sig-preview").textContent = signature();
  }));
  $("#settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const rows = SETTING_KEYS.map((k) => ({ key: k, value: $("#s-" + k).value.trim() }));
    const { error } = await sb.from("settings").upsert(rows);
    if (error) return toast(error.message, true);
    toast("Settings saved.");
    refresh();
  });

  initAuth();
})();

import { loadStrings, el } from "/common.js";

const t = await loadStrings();
const app = document.getElementById("app");

const titleInput = el("input", { type: "text", maxlength: "200", placeholder: t.create.titlePlaceholder, id: "title" });
const nameInput = el("input", { type: "text", maxlength: "60", id: "creator" });
const participantRows = el("div");
const optionRows = el("div");
const errorBox = el("p", { class: "error", role: "alert", hidden: true });
const submit = el("button", { type: "submit", class: "primary" }, t.create.submit);

function listRow(container, placeholder, min) {
  const input = el("input", { type: "text", maxlength: "100", placeholder, "aria-label": placeholder });
  const remove = el("button", { type: "button", onclick: () => { if (container.children.length > min) row.remove(); } }, t.create.remove);
  const row = el("div", { class: "row" }, input, remove);
  container.append(row);
  return input;
}
const values = (container) => [...container.querySelectorAll("input")].map((i) => i.value);

for (let i = 0; i < 2; i++) listRow(optionRows, t.create.optionPlaceholder, 2);
listRow(participantRows, t.create.participantPlaceholder, 1);

const form = el(
  "form",
  { novalidate: true },
  el("label", { for: "title" }, t.create.title), titleInput,
  el("label", { for: "creator" }, t.create.yourName), nameInput,
  el("label", {}, t.create.participants), participantRows,
  el("button", { type: "button", onclick: () => listRow(participantRows, t.create.participantPlaceholder, 1).focus() }, t.create.addParticipant),
  el("label", {}, t.create.options), optionRows,
  el("button", { type: "button", onclick: () => { if (optionRows.children.length < 10) listRow(optionRows, t.create.optionPlaceholder, 2).focus(); } }, t.create.addOption),
  errorBox,
  el("div", { class: "actions" }, submit),
);

app.append(el("h1", {}, t.create.heading), el("p", { class: "muted" }, t.create.intro), form);

const lastLink = document.cookie.split("; ").find((c) => c.startsWith("last-draw="));
if (lastLink) {
  const path = decodeURIComponent(lastLink.slice("last-draw=".length));
  if (/^\/d\/[\w-]+\?key=[\w-]+$/.test(path)) {
    app.append(el("p", { class: "muted" }, el("a", { href: path }, t.create.yourLink)));
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  submit.disabled = true;
  try {
    const res = await fetch("/api/draws", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: titleInput.value,
        creatorName: nameInput.value,
        participantNames: values(participantRows).filter((v) => v.trim() !== ""),
        options: values(optionRows).filter((v) => v.trim() !== ""),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      errorBox.textContent = t.errors[json.error] ?? t.errors.network;
      errorBox.hidden = false;
      return;
    }
    showLinks(json);
  } catch {
    errorBox.textContent = t.errors.network;
    errorBox.hidden = false;
  } finally {
    submit.disabled = false;
  }
});

function showLinks(json) {
  const mine = json.links.find((l) => l.isCreator);
  document.cookie = `last-draw=${encodeURIComponent(mine.path)}; max-age=${30 * 86400}; path=/; samesite=lax`;
  app.replaceChildren(
    el("h1", {}, t.create.resultHeading),
    el("p", { class: "muted" }, t.create.resultHelp),
    ...json.links.map((l) => {
      const url = location.origin + l.path;
      const copyBtn = el("button", { type: "button" }, t.create.copy);
      copyBtn.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(url); copyBtn.textContent = t.create.copied; }
        catch { window.prompt(l.name, url); }
      });
      return el(
        "div", { class: "card" },
        el("strong", {}, l.isCreator ? `${l.name} — ${t.create.yourLink}` : l.name),
        el("div", { class: "linkbox" }, url),
        el("div", { class: "actions" }, copyBtn, el("a", { class: "btn", href: l.path }, t.create.open)),
      );
    }),
  );
}

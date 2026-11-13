import { loadStrings, el, fmt, formatDate } from "/common.js";

const t = await loadStrings();
const app = document.getElementById("app");
const id = location.pathname.split("/").filter(Boolean)[1] ?? "";
const key = new URLSearchParams(location.search).get("key") ?? "";
const api = (suffix = "") => `/api/draws/${encodeURIComponent(id)}${suffix}?key=${encodeURIComponent(key)}`;

let shownDrawn = false;

async function load() {
  const res = await fetch(api());
  if (res.status === 404) return renderNotFound();
  if (!res.ok) return renderError(t.errors.network);
  const v = await res.json();
  // Once the result is on screen (possibly mid-animation) later loads must not replace it.
  if (shownDrawn && v.state === "drawn") return;
  if (v.state === "drawn") shownDrawn = true;
  render(v);
}

function renderNotFound() {
  app.replaceChildren(el("h1", {}, t.notFound.heading), el("p", {}, t.errors.not_found));
}
function renderError(msg) {
  app.append(el("p", { class: "error", role: "alert" }, msg));
}

async function act(name, button) {
  button.disabled = true;
  const res = await fetch(api(`/${name}`), { method: "POST" });
  if (!res.ok && res.status !== 409) {
    button.disabled = false;
    return renderError(t.errors.network);
  }
  await load();
}

function render(v) {
  const stateText = {
    declined: t.draw.declinedText,
    cancelled: t.draw.cancelledText,
    expired: t.draw.expiredText,
  }[v.state];

  const children = [
    el("p", { class: "muted" }, el("span", { class: "badge" }, t.states[v.state]), " ", fmt(t.draw.youAre, { name: v.me.name })),
    el("h1", {}, v.title),
  ];

  if (v.state === "drawn") children.push(resultBox(v));
  else if (stateText) children.push(el("p", { class: "card" }, stateText));

  children.push(
    el("h2", {}, t.draw.optionsHeading),
    el("ul", { class: "plain card" }, v.options.map((o) => el("li", {}, el("span", {}, o.label), el("span", { class: "muted" }, o.odds)))),
    el("h2", {}, t.draw.participantsHeading),
    el(
      "ul", { class: "plain card" },
      v.participants.map((p) =>
        el("li", {}, el("span", {}, p.name), el("span", { class: p.accepted ? "ok" : "wait" }, p.accepted ? `✓ ${t.draw.accepted}` : t.draw.waiting)),
      ),
    ),
  );

  if (v.state === "pending") {
    children.push(el("p", {}, v.me.accepted ? t.draw.pendingMeAccepted : t.draw.pendingMeNotAccepted));
    const actions = el("div", { class: "actions" });
    if (!v.me.accepted) {
      const a = el("button", { class: "primary", type: "button" }, t.draw.accept);
      a.addEventListener("click", () => act("accept", a));
      actions.append(a);
    }
    const d = el("button", { class: "danger", type: "button" }, t.draw.decline);
    d.addEventListener("click", () => act("decline", d));
    actions.append(d);
    if (v.me.isCreator) {
      const c = el("button", { class: "danger", type: "button" }, t.draw.cancel);
      c.addEventListener("click", () => act("cancel", c));
      actions.append(c);
    }
    children.push(actions, el("p", { class: "muted" }, fmt(t.draw.expiresAt, { date: formatDate(v.expiresAt) })));
  }

  children.push(el("p", { class: "muted" }, t.draw.footerNote));
  app.replaceChildren(...children);
}

function resultBox(v) {
  const label = el("div", { class: "label" });
  const box = el("div", { class: "result" }, el("div", { class: "muted" }, t.draw.resultHeading), label);
  const note = [
    el("p", { class: "muted" }, fmt(t.draw.drawnAt, { date: formatDate(v.result.drawnAt) })),
    el("p", { class: "muted" }, t.draw.fixedNote),
  ];
  const wrap = el("div", {}, box, ...note);

  const land = () => {
    label.textContent = v.result.label;
    box.classList.remove("spinning");
    box.classList.add("landed");
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!v.reveal || reduced) {
    land();
    return wrap;
  }

  // First view for this participant: slot-machine style reveal that slows down and lands on the stored result.
  box.classList.add("spinning");
  label.textContent = t.draw.revealing;
  const labels = v.options.map((o) => o.label);
  const total = 3200;
  const start = performance.now();
  let i = Math.floor(Math.random() * labels.length);
  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed >= total) return land();
    i = (i + 1) % labels.length;
    label.textContent = labels[i];
    const delay = 60 + (elapsed / total) ** 2 * 420;
    setTimeout(tick, delay);
  };
  setTimeout(tick, 500);
  return wrap;
}

await load();

// Live updates: refetch when something changes. The page works without this too.
try {
  const es = new EventSource(api("/events"));
  es.addEventListener("changed", () => load());
} catch {
  /* optional */
}

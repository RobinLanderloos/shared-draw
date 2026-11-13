// Shared helpers. All text comes from /strings.json (single Dutch source on the server).
export async function loadStrings() {
  const res = await fetch("/strings.json");
  return res.json();
}

export const fmt = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]));

/** Build an element. Children are strings (inserted as text, never HTML) or nodes. */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== false && v !== undefined) node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleString("nl-BE", { dateStyle: "long", timeStyle: "short" });

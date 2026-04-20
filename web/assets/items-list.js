import { loadItems, itemDisplayName, itemEffect, t } from "./app.js";

const CATEGORIES = [
  { slug: "held", label: t("items.cat.held") },
  { slug: "mega-stone", label: t("items.cat.mega-stone") },
  { slug: "berry", label: t("items.cat.berry") },
];

function categoryOf(item) {
  return item.category || "other";
}

const state = {
  all: [],
  query: "",
  categories: new Set(),
};

const els = {
  search: document.getElementById("search"),
  categoryFilters: document.getElementById("category-filters"),
  grid: document.getElementById("item-grid"),
  empty: document.getElementById("empty-state"),
  resultCount: document.getElementById("result-count"),
  totalCount: document.getElementById("total-count"),
  reset: document.getElementById("reset-filters"),
};

// ── init ───────────────────────────────────────────────────────

async function init() {
  buildCategoryFilter();

  readStateFromUrl();
  syncControlsFromState();

  try {
    state.all = await loadItems();
  } catch (err) {
    els.grid.innerHTML = `<p class="empty-state">${t("error.loadFailed")}: ${err.message}</p>`;
    return;
  }
  els.totalCount.textContent = state.all.length;

  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    writeStateToUrl();
    render();
  });
  els.reset.addEventListener("click", resetAll);

  render();
}

function buildCategoryFilter() {
  els.categoryFilters.innerHTML = "";
  for (const { slug, label } of CATEGORIES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.slug = slug;
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (state.categories.has(slug)) state.categories.delete(slug);
      else state.categories.add(slug);
      btn.setAttribute("aria-pressed", state.categories.has(slug) ? "true" : "false");
      writeStateToUrl();
      render();
    });
    els.categoryFilters.appendChild(btn);
  }
}

// ── state ↔ URL ────────────────────────────────────────────────

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") ?? "";
  state.categories = new Set(
    (params.get("cat") ?? "").split(",").filter(Boolean),
  );
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.categories.size) params.set("cat", [...state.categories].join(","));
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function syncControlsFromState() {
  els.search.value = state.query;
  for (const btn of els.categoryFilters.querySelectorAll("[data-slug]")) {
    btn.setAttribute(
      "aria-pressed",
      state.categories.has(btn.dataset.slug) ? "true" : "false",
    );
  }
}

function resetAll() {
  state.query = "";
  state.categories.clear();
  syncControlsFromState();
  writeStateToUrl();
  render();
}

// ── filter ───────────────────────────────────────────────────

function matches(item, q) {
  if (!q) return true;
  const lq = q.trim().toLowerCase();
  if (!lq) return true;
  return (
    item.nameEn.toLowerCase().includes(lq) ||
    (item.nameKo ?? "").toLowerCase().includes(lq) ||
    item.slug.toLowerCase().includes(lq) ||
    (item.effect ?? "").toLowerCase().includes(lq) ||
    (item.effectKo ?? "").toLowerCase().includes(lq)
  );
}

function applyFilters(list) {
  return list.filter((it) => {
    if (!matches(it, state.query)) return false;
    if (state.categories.size) {
      const cat = categoryOf(it);
      if (!state.categories.has(cat)) return false;
    }
    return true;
  });
}

// ── render ────────────────────────────────────────────────────

function render() {
  const filtered = applyFilters(state.all);
  els.resultCount.textContent = filtered.length;
  els.empty.hidden = filtered.length !== 0;

  const frag = document.createDocumentFragment();
  for (const it of filtered) frag.appendChild(renderCard(it));
  els.grid.replaceChildren(frag);
}

function renderCard(it) {
  const article = document.createElement("article");
  article.className = "item-card";

  const icon = document.createElement("img");
  icon.className = "item-card__icon";
  icon.loading = "lazy";
  icon.decoding = "async";
  icon.alt = `${itemDisplayName(it)} 아이콘`;
  icon.src = it.iconPath || "";
  if (!it.iconPath) icon.style.visibility = "hidden";

  const body = document.createElement("div");
  body.className = "item-card__body";

  const names = document.createElement("div");
  names.className = "item-card__names";

  const name = document.createElement("h3");
  name.className = "item-card__name";
  name.textContent = itemDisplayName(it);
  names.appendChild(name);

  const primary = itemDisplayName(it);
  const sub = primary === it.nameEn ? (it.nameKo || "") : it.nameEn;
  if (sub) {
    const subEl = document.createElement("span");
    subEl.className = "item-card__name-sub";
    subEl.textContent = sub;
    names.appendChild(subEl);
  }

  const effect = document.createElement("p");
  effect.className = "item-card__effect";
  effect.textContent = itemEffect(it);

  const meta = document.createElement("div");
  meta.className = "item-card__meta";

  const cat = categoryOf(it);
  const catLabel = CATEGORIES.find((c) => c.slug === cat)?.label ?? "기타";
  const catBadge = document.createElement("span");
  catBadge.className = `category-tag category-tag--${cat}`;
  catBadge.textContent = catLabel;
  meta.appendChild(catBadge);

  if (it.location) {
    const loc = document.createElement("span");
    loc.className = "item-card__location";
    loc.textContent = it.location;
    meta.appendChild(loc);
  }

  body.append(names, effect, meta);
  article.append(icon, body);
  return article;
}

init();

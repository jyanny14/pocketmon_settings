import {
  loadPokemon,
  matchesQuery,
  formatDex,
  statTotal,
  typeLabel,
  obtainLabel,
  formDisplayName,
  t,
} from "./app.js";

const TYPE_ORDER = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

const OBTAIN_ORDER = ["recruit", "transfer", "gift", "default"];

const state = {
  all: [],
  query: "",
  types: new Set(),
  obtain: new Set(),
  sort: "number",
};

const els = {
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  typeFilters: document.getElementById("type-filters"),
  obtainFilters: document.getElementById("obtain-filters"),
  grid: document.getElementById("pokemon-grid"),
  empty: document.getElementById("empty-state"),
  resultCount: document.getElementById("result-count"),
  totalCount: document.getElementById("total-count"),
  reset: document.getElementById("reset-filters"),
};

// ── init ───────────────────────────────────────────────────────

async function init() {
  buildChipFilter(els.typeFilters, TYPE_ORDER, (s) => typeLabel(s), state.types, "type");
  buildChipFilter(els.obtainFilters, OBTAIN_ORDER, (s) => obtainLabel(s), state.obtain, "obtain");

  readStateFromUrl();
  syncControlsFromState();

  try {
    state.all = await loadPokemon();
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
  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    writeStateToUrl();
    render();
  });
  els.reset.addEventListener("click", resetAll);

  render();
}

// ── chip filters ───────────────────────────────────────────────

function buildChipFilter(container, values, labelFn, selectedSet, kind) {
  container.innerHTML = "";
  for (const slug of values) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip chip--${kind} chip--${kind}-${slug}`;
    btn.dataset.slug = slug;
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = labelFn(slug);
    btn.addEventListener("click", () => {
      if (selectedSet.has(slug)) selectedSet.delete(slug);
      else selectedSet.add(slug);
      btn.setAttribute("aria-pressed", selectedSet.has(slug) ? "true" : "false");
      writeStateToUrl();
      render();
    });
    container.appendChild(btn);
  }
}

function syncChipButtons(container, selectedSet) {
  for (const btn of container.querySelectorAll("[data-slug]")) {
    btn.setAttribute(
      "aria-pressed",
      selectedSet.has(btn.dataset.slug) ? "true" : "false",
    );
  }
}

// ── state ↔ URL ────────────────────────────────────────────────

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") ?? "";
  state.sort = params.get("sort") ?? "number";
  state.types = new Set((params.get("type") ?? "").split(",").filter(Boolean));
  state.obtain = new Set((params.get("obtain") ?? "").split(",").filter(Boolean));
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.sort && state.sort !== "number") params.set("sort", state.sort);
  if (state.types.size) params.set("type", [...state.types].join(","));
  if (state.obtain.size) params.set("obtain", [...state.obtain].join(","));
  const qs = params.toString();
  const url = qs ? `?${qs}` : location.pathname;
  history.replaceState(null, "", url);
}

function syncControlsFromState() {
  els.search.value = state.query;
  els.sort.value = state.sort;
  syncChipButtons(els.typeFilters, state.types);
  syncChipButtons(els.obtainFilters, state.obtain);
}

function resetAll() {
  state.query = "";
  state.sort = "number";
  state.types.clear();
  state.obtain.clear();
  syncControlsFromState();
  writeStateToUrl();
  render();
}

// ── filter / sort ─────────────────────────────────────────────

function applyFilters(list) {
  return list.filter((p) => {
    if (!matchesQuery(p, state.query)) return false;
    if (state.types.size) {
      const allTypes = new Set(
        p.forms.flatMap((f) => f.types).concat(p.types ?? []),
      );
      for (const tt of state.types) if (!allTypes.has(tt)) return false;
    }
    if (state.obtain.size) {
      const ok = (p.obtain ?? []).some((o) => state.obtain.has(o));
      if (!ok) return false;
    }
    return true;
  });
}

function applySort(list) {
  const copy = list.slice();
  const collator = new Intl.Collator("ko");
  switch (state.sort) {
    case "nameKo":
      copy.sort((a, b) => collator.compare(a.nameKo, b.nameKo));
      break;
    case "nameEn":
      copy.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
      break;
    case "statTotal":
      copy.sort((a, b) => statTotal(b.baseStats) - statTotal(a.baseStats));
      break;
    case "number":
    default:
      copy.sort((a, b) => a.number.localeCompare(b.number) || a.slug.localeCompare(b.slug));
  }
  return copy;
}

// ── render ────────────────────────────────────────────────────

function render() {
  const filtered = applySort(applyFilters(state.all));
  els.resultCount.textContent = filtered.length;
  els.empty.hidden = filtered.length !== 0;

  const frag = document.createDocumentFragment();
  for (const p of filtered) frag.appendChild(renderCard(p));
  els.grid.replaceChildren(frag);
}

function renderCard(p) {
  const article = document.createElement("a");
  article.className = "poke-card";
  article.href = `./pokemon-detail.html?slug=${encodeURIComponent(p.slug)}`;

  const img = document.createElement("img");
  img.className = "poke-card__sprite";
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = `${p.nameKo} (${p.nameEn}) 스프라이트`;
  img.src = p.spritePath || "";
  if (!p.spritePath) img.style.visibility = "hidden";

  const body = document.createElement("div");
  body.className = "poke-card__body";

  const dex = document.createElement("p");
  dex.className = "poke-card__dex";
  dex.textContent = formatDex(p.number);

  const nameKo = document.createElement("h3");
  nameKo.className = "poke-card__name-ko";
  nameKo.textContent = p.nameKo || p.nameEn;

  const nameEn = document.createElement("p");
  nameEn.className = "poke-card__name-en";
  nameEn.textContent = p.nameEn;

  const types = document.createElement("div");
  types.className = "poke-card__types";
  for (const tt of p.types ?? []) types.appendChild(typeBadge(tt));

  const meta = document.createElement("div");
  meta.className = "poke-card__meta";

  const total = document.createElement("span");
  total.className = "poke-card__stat-total";
  total.title = t("pokemon.sort.statTotal");
  total.textContent = `${t("pokemon.statTotal")} ${statTotal(p.baseStats)}`;
  meta.appendChild(total);

  for (const o of p.obtain ?? []) {
    const badge = document.createElement("span");
    badge.className = `obtain obtain--${o}`;
    badge.textContent = obtainLabel(o);
    meta.appendChild(badge);
  }

  if (p.forms?.length > 1) {
    const forms = document.createElement("span");
    forms.className = "poke-card__forms";
    forms.textContent = `${t("pokemon.forms")} ${p.forms.length}`;
    forms.title = p.forms.map((f) => formDisplayName(f)).join(" · ");
    meta.appendChild(forms);
  }

  body.append(dex, nameKo, nameEn, types, meta);
  article.append(img, body);
  return article;
}

function typeBadge(slug) {
  const span = document.createElement("span");
  span.className = `type type--${slug}`;
  span.textContent = typeLabel(slug);
  return span;
}

init();

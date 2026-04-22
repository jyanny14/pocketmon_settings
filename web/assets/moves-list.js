import {
  loadMoves,
  moveDisplayName,
  moveCategoryLabel,
  typeLabel,
  t,
  getLang,
} from "./app.js";

const TYPE_ORDER = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

const CATEGORY_ORDER = ["physical", "special", "status"];

const state = {
  all: [],
  query: "",
  types: /** @type {Set<string>} */ (new Set()),
  categories: /** @type {Set<string>} */ (new Set()),
  championsOnly: false,
  sort: "nameEn",
};

const els = {
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  typeFilters: document.getElementById("type-filters"),
  categoryFilters: document.getElementById("category-filters"),
  championsOnly: document.getElementById("champions-only"),
  tbody: document.getElementById("moves-tbody"),
  empty: document.getElementById("empty-state"),
  resultCount: document.getElementById("result-count"),
  totalCount: document.getElementById("total-count"),
  reset: document.getElementById("reset-filters"),
};

// ── init ───────────────────────────────────────────────────────

async function init() {
  buildChipFilter(els.typeFilters, TYPE_ORDER, (s) => typeLabel(s), state.types, "type");
  buildChipFilter(els.categoryFilters, CATEGORY_ORDER, (s) => moveCategoryLabel(s), state.categories, "cat");

  readStateFromUrl();
  syncControlsFromState();

  try {
    state.all = await loadMoves();
  } catch (err) {
    els.tbody.innerHTML = `<tr><td colspan="7" class="empty-state">${t("error.loadFailed")}: ${err.message}</td></tr>`;
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
  els.championsOnly.addEventListener("change", () => {
    state.championsOnly = els.championsOnly.checked;
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
      if (selectedSet.has(slug)) {
        selectedSet.delete(slug);
        btn.setAttribute("aria-pressed", "false");
      } else {
        selectedSet.add(slug);
        btn.setAttribute("aria-pressed", "true");
      }
      writeStateToUrl();
      render();
    });
    container.appendChild(btn);
  }
}

// ── state ↔ URL ────────────────────────────────────────────────

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") ?? "";
  const types = (params.get("types") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  state.types = new Set(types.filter((s) => TYPE_ORDER.includes(s)));
  const cats = (params.get("cat") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  state.categories = new Set(cats.filter((s) => CATEGORY_ORDER.includes(s)));
  state.championsOnly = params.get("champions") === "1";
  state.sort = params.get("sort") ?? "nameEn";
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.types.size) params.set("types", [...state.types].join(","));
  if (state.categories.size) params.set("cat", [...state.categories].join(","));
  if (state.championsOnly) params.set("champions", "1");
  if (state.sort && state.sort !== "nameEn") params.set("sort", state.sort);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function syncControlsFromState() {
  els.search.value = state.query;
  els.sort.value = state.sort;
  els.championsOnly.checked = state.championsOnly;
  for (const btn of els.typeFilters.querySelectorAll("[data-slug]")) {
    btn.setAttribute("aria-pressed", state.types.has(btn.dataset.slug) ? "true" : "false");
  }
  for (const btn of els.categoryFilters.querySelectorAll("[data-slug]")) {
    btn.setAttribute("aria-pressed", state.categories.has(btn.dataset.slug) ? "true" : "false");
  }
}

function resetAll() {
  state.query = "";
  state.types.clear();
  state.categories.clear();
  state.championsOnly = false;
  state.sort = "nameEn";
  syncControlsFromState();
  writeStateToUrl();
  render();
}

// ── filter / sort ─────────────────────────────────────────────

function matches(move, q) {
  if (!q) return true;
  const lq = q.trim().toLowerCase();
  if (!lq) return true;
  return (
    move.nameEn.toLowerCase().includes(lq) ||
    (move.nameKo ?? "").toLowerCase().includes(lq) ||
    (move.nameJa ?? "").toLowerCase().includes(lq) ||
    (move.nameZh ?? "").toLowerCase().includes(lq) ||
    move.slug.toLowerCase().includes(lq) ||
    (move.flavorTextEn ?? "").toLowerCase().includes(lq) ||
    (move.flavorTextKo ?? "").toLowerCase().includes(lq) ||
    (move.flavorTextJa ?? "").toLowerCase().includes(lq) ||
    (move.flavorTextZh ?? "").toLowerCase().includes(lq)
  );
}

function applyFilters(list) {
  return list.filter((m) => {
    if (!matches(m, state.query)) return false;
    if (state.types.size && !state.types.has(m.type)) return false;
    if (state.categories.size && !state.categories.has(m.category)) return false;
    if (state.championsOnly && !m.updatedInChampions) return false;
    return true;
  });
}

function sortMoves(list) {
  const lang = getLang();
  const copy = [...list];
  const typeIdx = (t) => {
    const i = TYPE_ORDER.indexOf(t);
    return i < 0 ? 99 : i;
  };
  const num = (v) => (v == null ? -1 : v);
  copy.sort((a, b) => {
    switch (state.sort) {
      case "nameKo":
        return (a.nameKo || a.nameEn).localeCompare(b.nameKo || b.nameEn, lang === "ko" ? "ko" : "en");
      case "type":
        return typeIdx(a.type) - typeIdx(b.type) || a.nameEn.localeCompare(b.nameEn);
      case "power":
        return num(b.power) - num(a.power) || a.nameEn.localeCompare(b.nameEn);
      case "accuracy":
        return num(b.accuracy) - num(a.accuracy) || a.nameEn.localeCompare(b.nameEn);
      case "pp":
        return num(b.pp) - num(a.pp) || a.nameEn.localeCompare(b.nameEn);
      case "nameEn":
      default:
        return a.nameEn.localeCompare(b.nameEn);
    }
  });
  return copy;
}

// ── render ────────────────────────────────────────────────────

function render() {
  const filtered = sortMoves(applyFilters(state.all));
  els.resultCount.textContent = filtered.length;

  if (!filtered.length) {
    els.tbody.innerHTML = "";
    els.empty.hidden = false;
    return;
  }
  els.empty.hidden = true;

  const frag = document.createDocumentFragment();
  for (const m of filtered) {
    frag.appendChild(renderRow(m));
  }
  els.tbody.replaceChildren(frag);
}

function renderRow(m) {
  const tr = document.createElement("tr");
  if (m.updatedInChampions) tr.classList.add("moves-row--champions");

  const nameCell = document.createElement("td");
  nameCell.className = "moves-col-name";
  const nameText = document.createElement("span");
  nameText.textContent = moveDisplayName(m);
  nameCell.appendChild(nameText);
  if (m.updatedInChampions) {
    const badge = document.createElement("span");
    badge.className = "moves-updated-badge";
    badge.title = t("moves.championsBadgeTitle");
    badge.textContent = "⚡";
    nameCell.appendChild(badge);
  }

  const typeCell = document.createElement("td");
  if (m.type) {
    const badge = document.createElement("span");
    badge.className = `type type--${m.type}`;
    badge.textContent = typeLabel(m.type);
    typeCell.appendChild(badge);
  }

  const catCell = document.createElement("td");
  catCell.textContent = m.category ? moveCategoryLabel(m.category) : "";

  const powerCell = document.createElement("td");
  powerCell.textContent = m.power ?? "—";
  powerCell.className = "moves-num";

  const accCell = document.createElement("td");
  accCell.textContent = m.accuracy ?? "—";
  accCell.className = "moves-num";

  const ppCell = document.createElement("td");
  ppCell.textContent = m.pp ?? "—";
  ppCell.className = "moves-num";

  const flavorCell = document.createElement("td");
  flavorCell.className = "moves-col-flavor";
  const lang = getLang();
  flavorCell.textContent =
    lang === "ja" ? (m.flavorTextJa || m.flavorTextEn || "")
    : lang === "zh" ? (m.flavorTextZh || m.flavorTextEn || "")
    : lang === "en" ? (m.flavorTextEn || "")
    : (m.flavorTextKo || m.flavorTextEn || "");

  tr.append(nameCell, typeCell, catCell, powerCell, accCell, ppCell, flavorCell);
  return tr;
}

init();

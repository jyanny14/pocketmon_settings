import {
  loadAbilities,
  loadPokemon,
  abilityDisplayName,
  abilityGameText,
  abilityDescription,
  formDisplayName,
  getLang,
  t,
} from "./app.js";

const state = {
  all: [],
  pokemonMap: new Map(),
  query: "",
  sort: "nameEn",
};

const els = {
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  grid: document.getElementById("ability-grid"),
  empty: document.getElementById("empty-state"),
  resultCount: document.getElementById("result-count"),
  totalCount: document.getElementById("total-count"),
  reset: document.getElementById("reset-filters"),
};

// ── init ───────────────────────────────────────────────────────

async function init() {
  readStateFromUrl();
  syncControlsFromState();

  try {
    const [abilities, pokemon] = await Promise.all([
      loadAbilities(),
      loadPokemon(),
    ]);
    state.all = abilities;
    for (const p of pokemon) state.pokemonMap.set(p.slug, p);
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

// ── state ↔ URL ────────────────────────────────────────────────

function readStateFromUrl() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") ?? "";
  state.sort = params.get("sort") ?? "nameEn";
}

function writeStateToUrl() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.sort && state.sort !== "nameEn") params.set("sort", state.sort);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

function syncControlsFromState() {
  els.search.value = state.query;
  els.sort.value = state.sort;
}

function resetAll() {
  state.query = "";
  state.sort = "nameEn";
  syncControlsFromState();
  writeStateToUrl();
  render();
}

// ── filter / sort ─────────────────────────────────────────────

function matches(ability, q) {
  if (!q) return true;
  const lq = q.trim().toLowerCase();
  if (!lq) return true;
  return (
    ability.nameEn.toLowerCase().includes(lq) ||
    (ability.nameKo ?? "").toLowerCase().includes(lq) ||
    ability.slug.toLowerCase().includes(lq) ||
    (ability.gameText ?? "").toLowerCase().includes(lq) ||
    (ability.gameTextKo ?? "").toLowerCase().includes(lq) ||
    (ability.description ?? "").toLowerCase().includes(lq)
  );
}

function applyFilters(list) {
  return list.filter((a) => matches(a, state.query));
}

function applySort(list) {
  const copy = list.slice();
  const koCollator = new Intl.Collator("ko");
  const byPrimaryName = (a, b) => {
    if (getLang() === "ko") {
      return koCollator.compare(
        a.nameKo || a.nameEn,
        b.nameKo || b.nameEn,
      );
    }
    return a.nameEn.localeCompare(b.nameEn);
  };
  switch (state.sort) {
    case "holders":
      copy.sort(
        (a, b) => (b.pokemon?.length ?? 0) - (a.pokemon?.length ?? 0) || byPrimaryName(a, b),
      );
      break;
    case "nameEn":
    default:
      copy.sort(byPrimaryName);
  }
  return copy;
}

// ── render ────────────────────────────────────────────────────

function render() {
  const filtered = applySort(applyFilters(state.all));
  els.resultCount.textContent = filtered.length;
  els.empty.hidden = filtered.length !== 0;

  const frag = document.createDocumentFragment();
  for (const a of filtered) frag.appendChild(renderCard(a));
  els.grid.replaceChildren(frag);
}

function renderCard(ability) {
  const article = document.createElement("article");
  article.className = "ability-card";

  const header = document.createElement("div");
  header.className = "ability-card__header";

  const names = document.createElement("div");
  names.className = "ability-card__names";

  const name = document.createElement("h3");
  name.className = "ability-card__name";
  name.textContent = abilityDisplayName(ability);
  names.appendChild(name);

  const primary = abilityDisplayName(ability);
  const sub = primary === ability.nameEn ? (ability.nameKo || "") : ability.nameEn;
  if (sub) {
    const subEl = document.createElement("span");
    subEl.className = "ability-card__name-sub";
    subEl.textContent = sub;
    names.appendChild(subEl);
  }

  const count = document.createElement("span");
  count.className = "ability-card__count";
  const holderCount = ability.pokemon?.length ?? 0;
  count.textContent = `${holderCount}${t("abilities.holderUnit")}`;
  count.title = t("abilities.sort.holders");

  header.append(names, count);

  const gameText = document.createElement("p");
  gameText.className = "ability-card__game-text";
  gameText.textContent = abilityGameText(ability);

  const desc = document.createElement("p");
  desc.className = "ability-card__desc";
  desc.textContent = abilityDescription(ability);

  const holders = document.createElement("div");
  holders.className = "ability-card__holders";

  const holderList = dedupeHolders(ability.pokemon ?? []);
  for (const h of holderList) {
    holders.appendChild(renderHolder(h));
  }

  article.append(header, gameText, desc, holders);
  return article;
}

function dedupeHolders(pokemonList) {
  const map = new Map();
  for (const { slug, form } of pokemonList) {
    if (!map.has(slug)) {
      map.set(slug, { slug, forms: [] });
    }
    map.get(slug).forms.push(form);
  }
  return [...map.values()];
}

function renderHolder(holder) {
  const el = document.createElement("span");
  el.className = "ability-holder";

  const poke = state.pokemonMap.get(holder.slug);

  if (poke?.spritePath) {
    const img = document.createElement("img");
    img.className = "ability-holder__sprite";
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "";
    img.src = poke.spritePath;
    el.appendChild(img);
  }

  const label = document.createElement("span");
  label.className = "ability-holder__name";
  const displayName = poke?.nameKo || holder.slug;
  label.textContent = displayName;

  const variantFormNames = holder.forms
    .filter((f) => f !== (poke?.nameEn ?? holder.slug))
    .map((formName) => {
      const form = poke?.forms?.find((fm) => fm.name === formName);
      return form ? formDisplayName(form) : formName;
    });
  if (variantFormNames.length > 0) {
    el.title = variantFormNames.join(", ");
    if (holder.forms.length > 1) {
      label.textContent = `${displayName} (${holder.forms.length})`;
    }
  }

  el.appendChild(label);
  return el;
}

init();

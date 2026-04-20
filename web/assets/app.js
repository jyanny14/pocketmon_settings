// Shared data loader + small helpers used by every page.
// No bundler, no dependencies — just an ES module.

import {
  t,
  getLang,
  setLang,
  applyTranslations,
  initLangToggle,
} from "./i18n.js";

// Re-export i18n for page-specific modules
export { t, getLang, setLang };

const DATA_ROOT = new URL("../data/", import.meta.url);

// Per-session in-memory cache keeps network calls down without persisting
// across reloads. Browser HTTP caching is left to server headers so that
// regenerated data/*.json is picked up on the next reload.
const _cache = new Map();

async function loadJson(name) {
  if (_cache.has(name)) return _cache.get(name);
  const url = new URL(`${name}.json`, DATA_ROOT);
  const promise = fetch(url, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`failed to load ${name}.json (${r.status})`);
    return r.json();
  });
  _cache.set(name, promise);
  return promise;
}

export const loadPokemon = () => loadJson("pokemon");
export const loadItems = () => loadJson("items");
export const loadAbilities = () => loadJson("abilities");
export const loadMoves = () => loadJson("moves");

// ── small helpers ──────────────────────────────────────────────

/** Case-insensitive match against Korean or English name (or slug). */
export function matchesQuery(pokemon, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    pokemon.nameKo.toLowerCase().includes(q) ||
    pokemon.nameEn.toLowerCase().includes(q) ||
    pokemon.slug.toLowerCase().includes(q)
  );
}

/** Format a national dex number: '0006' → '#006'. */
export function formatDex(num) {
  if (!num) return "";
  const trimmed = String(num).replace(/^0+/, "") || "0";
  return `#${trimmed.padStart(3, "0")}`;
}

/** Form display name, switched by current language. Falls back gracefully. */
export function formDisplayName(form) {
  if (!form) return "";
  return getLang() === "ko" ? (form.nameKo || form.name) : form.name;
}

/** Look up a form on a pokemon by its English `name` key. */
export function findForm(pokemon, formNameEn) {
  return pokemon?.forms?.find((f) => f.name === formNameEn);
}

/** Ability display name: prefer nameKo in KO mode (fallback nameEn). */
export function abilityDisplayName(ability) {
  if (!ability) return "";
  return getLang() === "ko" ? (ability.nameKo || ability.nameEn) : ability.nameEn;
}

/** Ability game text: prefer gameTextKo in KO mode (fallback gameText). */
export function abilityGameText(ability) {
  if (!ability) return "";
  return getLang() === "ko"
    ? (ability.gameTextKo || ability.gameText || "")
    : (ability.gameText || "");
}

/** Ability description: currently English only; keep for symmetry. */
export function abilityDescription(ability) {
  if (!ability) return "";
  return getLang() === "ko"
    ? (ability.descriptionKo || ability.description || "")
    : (ability.description || "");
}

/** Item display name: prefer nameKo in KO mode (fallback nameEn). */
export function itemDisplayName(item) {
  if (!item) return "";
  return getLang() === "ko" ? (item.nameKo || item.nameEn) : item.nameEn;
}

/** Move display name: prefer nameKo in KO mode (fallback nameEn). */
export function moveDisplayName(move) {
  if (!move) return "";
  return getLang() === "ko" ? (move.nameKo || move.nameEn) : move.nameEn;
}

/** Move damage class label (physical/special/status). */
export function moveCategoryLabel(category) {
  if (!category) return "";
  return t("move.cat." + category) || category;
}

/** Total of base stats (hp/atk/def/spAtk/spDef/speed). */
export function statTotal(stats) {
  if (!stats) return 0;
  return (
    (stats.hp | 0) +
    (stats.atk | 0) +
    (stats.def | 0) +
    (stats.spAtk | 0) +
    (stats.spDef | 0) +
    (stats.speed | 0)
  );
}

// ── type / obtain labels (i18n-aware) ─────────────────────────

export function typeLabel(slug) {
  return t("type." + slug);
}

export function obtainLabel(slug) {
  return t("obtain." + slug);
}

// Backward-compat aliases
export const typeLabelKo = typeLabel;
export const obtainLabelKo = obtainLabel;

// Kept for reference by chip builders — still useful for iteration order
export const TYPE_LABELS_KO = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기",
  grass: "풀", ice: "얼음", fighting: "격투", poison: "독",
  ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악",
  steel: "강철", fairy: "페어리",
};

export const OBTAIN_LABELS_KO = {
  recruit: "리크루트", transfer: "전송 전용",
  gift: "선물", default: "기본 보유",
};

// ── landing-page counters + current-nav highlight ──────────────

async function hydrateCounts() {
  const lang = getLang();
  const targets = {
    "pokemon-count": () =>
      loadPokemon().then((l) =>
        lang === "ko" ? `${l.length} 마리` : `${l.length} Pokémon`,
      ),
    "item-count": () =>
      loadItems().then((l) =>
        lang === "ko" ? `${l.length} 개` : `${l.length} items`,
      ),
    "ability-count": () =>
      loadAbilities().then((l) =>
        lang === "ko" ? `${l.length} 개` : `${l.length} abilities`,
      ),
  };
  for (const [key, fetcher] of Object.entries(targets)) {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if (!el) continue;
    try {
      el.textContent = await fetcher();
    } catch (err) {
      el.textContent = t("error.noData");
      console.error(err);
    }
  }
}

function markCurrentNav() {
  const here = location.pathname.split("/").pop() || "index.html";
  for (const link of document.querySelectorAll(".primary-nav a")) {
    const href = link.getAttribute("href")?.replace("./", "");
    if (href === here) link.setAttribute("aria-current", "page");
  }
}

// Entry point for pages that simply include app.js.
applyTranslations();
initLangToggle();
markCurrentNav();
hydrateCounts();

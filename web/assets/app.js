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

/** Case-insensitive match against any localized name (ko/en/ja/zh) or slug.
 *
 * Phase 1 M2: 일본어·중국어 사용자도 자기 언어 이름으로 검색 가능.
 * ja/zh 에서는 lowercase 가 대부분 무해 (한자·가나는 대소문자 개념 없음).
 */
export function matchesQuery(pokemon, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const names = [
    pokemon.nameKo,
    pokemon.nameEn,
    pokemon.nameJa,
    pokemon.nameZh,
    pokemon.slug,
  ];
  return names.some((n) => n && n.toLowerCase().includes(q));
}

/** Format a national dex number: '0006' → '#006'. */
export function formatDex(num) {
  if (!num) return "";
  const trimmed = String(num).replace(/^0+/, "") || "0";
  return `#${trimmed.padStart(3, "0")}`;
}

/** Form display name, switched by current language. Falls back gracefully.
 *
 * Note: form.name is the English functional identifier (e.g. "Mega Venusaur")
 * used in URL encoding and sprite paths. Display names live in `nameKo/Ja/Zh`
 * and are synthesized by scripts/form_i18n.py at build time.
 */
export function formDisplayName(form) {
  if (!form) return "";
  switch (getLang()) {
    case "ja": return form.nameJa || form.name;
    case "zh": return form.nameZh || form.name;
    case "en": return form.name;
    default:   return form.nameKo || form.name;
  }
}

/** Look up a form on a pokemon by its English `name` key. */
export function findForm(pokemon, formNameEn) {
  return pokemon?.forms?.find((f) => f.name === formNameEn);
}

/**
 * Learnable move slugs for a given form: species-wide `moves` plus any
 * form-exclusive slugs in `species.formMoves[formName]`. Order preserves the
 * species list with form-exclusives appended. Currently only Rotom carries
 * `formMoves`; for everything else this returns `species.moves` unchanged.
 */
export function learnableMoveSlugsForForm(species, formName) {
  const base = Array.isArray(species?.moves) ? species.moves : [];
  const extra = species?.formMoves?.[formName];
  if (!Array.isArray(extra) || extra.length === 0) return base.slice();
  const seen = new Set(base);
  const out = base.slice();
  for (const slug of extra) {
    if (!seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

/** Union of species moves with every form-exclusive pool (used on species detail page). */
export function allLearnableMoveSlugs(species) {
  const base = Array.isArray(species?.moves) ? species.moves : [];
  const formMoves = species?.formMoves;
  if (!formMoves) return base.slice();
  const seen = new Set(base);
  const out = base.slice();
  for (const slugs of Object.values(formMoves)) {
    if (!Array.isArray(slugs)) continue;
    for (const slug of slugs) {
      if (!seen.has(slug)) {
        seen.add(slug);
        out.push(slug);
      }
    }
  }
  return out;
}

/**
 * Pick display name from an object with nameKo/nameEn/nameJa/nameZh fields.
 * Phase 1 M2: 4-way 언어 분기. 해당 언어값 없으면 영어로 폴백.
 * 이름 필드는 PokeAPI 공식 지역화만 담겨 있어 안전 (LLM 번역 아님).
 */
function pickNameByLang(obj) {
  if (!obj) return "";
  switch (getLang()) {
    case "ja": return obj.nameJa || obj.nameEn || "";
    case "zh": return obj.nameZh || obj.nameEn || "";
    case "en": return obj.nameEn || "";
    default:   return obj.nameKo || obj.nameEn || "";
  }
}

/** Ability display name — 4-way by current language. */
export function abilityDisplayName(ability) {
  return pickNameByLang(ability);
}

/** Ability game text — 4-way. PokeAPI flavor_text 기반 ja/zh 수집(Phase 2).
 *  descriptionKo / descriptionJa / descriptionZh 는 긴 상세 설명으로 별도 헬퍼. */
export function abilityGameText(ability) {
  if (!ability) return "";
  switch (getLang()) {
    case "ja": return ability.gameTextJa || ability.gameText || "";
    case "zh": return ability.gameTextZh || ability.gameText || "";
    case "en": return ability.gameText || "";
    default:   return ability.gameTextKo || ability.gameText || "";
  }
}

/**
 * Ability description paragraph (상세 설명).
 * Phase 2: ko 는 descriptionKo, ja/zh 는 아직 미수집(LLM 번역 예정) 이라 영어 폴백.
 */
export function abilityDescription(ability) {
  if (!ability) return "";
  switch (getLang()) {
    case "ja": return ability.descriptionJa || ability.description || "";
    case "zh": return ability.descriptionZh || ability.description || "";
    case "en": return ability.description || "";
    default:   return ability.descriptionKo || "";
  }
}

/** Item display name — 4-way by current language. */
export function itemDisplayName(item) {
  return pickNameByLang(item);
}

/** Item effect text — 4-way. ja/zh 는 PokeAPI 도구 flavor_text 공식 게임 내 설명 사용. */
export function itemEffect(item) {
  if (!item) return "";
  switch (getLang()) {
    case "ja": return item.effectJa || item.effect || "";
    case "zh": return item.effectZh || item.effect || "";
    case "en": return item.effect || "";
    default:   return item.effectKo || item.effect || "";
  }
}

/** Move display name — 4-way by current language. */
export function moveDisplayName(move) {
  return pickNameByLang(move);
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
    "move-count": () =>
      loadMoves().then((l) =>
        lang === "ko" ? `${l.length} 개` : `${l.length} moves`,
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

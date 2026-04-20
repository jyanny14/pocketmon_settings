import { findForm } from "./app.js";

export const SLOT_COUNT = 6;
export const SP_TOTAL_MAX = 66;
export const SP_PER_STAT_MAX = 32;
export const MOVES_PER_SLOT = 4;
export const SP_STAT_KEYS = ["hp", "atk", "def", "spAtk", "spDef", "speed"];

export function emptySps() {
  return [0, 0, 0, 0, 0, 0];
}

/**
 * @typedef Slot
 * @property {string} slug
 * @property {string} formName
 * @property {string} abilitySlug
 * @property {string|null} itemSlug
 * @property {string[]} moves   up to 4 learnable move slugs (may be empty)
 * @property {number[]} sps     length 6, each 0..32, sum <=66 (hp/atk/def/spAtk/spDef/speed)
 * @property {string|null} nature  nature slug or null (null = no nature selected)
 */

/** @typedef {{pokemonMap: Map<string, any>, items: {slug:string}[]}} DecodeCtx */

// URL form: slug:formName:abilitySlug:itemSlug[:moves[:sps[:nature]]]
//   moves   = "m1,m2,m3,m4"   (comma-separated move slugs, trailing empties ok)
//   sps     = "hp/atk/def/spA/spD/spe"   (slash-separated integers)
//   nature  = "adamant"
// Trailing empty tail fields are omitted for readability, so legacy
// 4-field URLs continue to decode unchanged.

export function slotToString(s) {
  if (!s) return "";
  const moves = Array.isArray(s.moves) ? s.moves.filter(Boolean) : [];
  const sps = Array.isArray(s.sps) && s.sps.length === 6 ? s.sps : emptySps();
  const nature = s.nature || "";

  const movesStr = moves.length ? moves.join(",") : "";
  const spsStr = sps.some((v) => v > 0) ? sps.join("/") : "";

  const parts = [
    s.slug,
    s.formName,
    s.abilitySlug,
    s.itemSlug ?? "",
    movesStr,
    spsStr,
    nature,
  ];
  while (parts.length > 4 && !parts[parts.length - 1]) parts.pop();
  return parts.map(encodeURIComponent).join(":");
}

export function stringToSlot(str, ctx) {
  if (!str) return null;
  const parts = str.split(":").map(decodeURIComponent);
  const slug = parts[0] || "";
  if (!slug) return null;
  const p = ctx.pokemonMap.get(slug);
  if (!p) return null;

  const formName = parts[1] || "";
  const abilitySlug = parts[2] || "";
  const itemSlug = parts[3] || "";
  const movesStr = parts[4] || "";
  const spsStr = parts[5] || "";
  const natureStr = parts[6] || "";

  const form = findForm(p, formName) || p.forms[0];

  const learnable = new Set(p.moves || []);
  const moves = movesStr
    ? movesStr
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x && learnable.has(x))
        .slice(0, MOVES_PER_SLOT)
    : [];

  let sps = emptySps();
  if (spsStr) {
    const arr = spsStr.split("/").map((x) => parseInt(x, 10));
    if (arr.length === 6 && arr.every((n) => Number.isFinite(n))) {
      const clamped = arr.map((n) => Math.max(0, Math.min(SP_PER_STAT_MAX, n)));
      const total = clamped.reduce((a, b) => a + b, 0);
      if (total <= SP_TOTAL_MAX) sps = clamped;
      // else: invalid configuration, fall through to zeros
    }
  }

  const nature = natureStr && /^[a-z]+$/.test(natureStr) ? natureStr : null;

  return {
    slug,
    formName: form.name,
    abilitySlug: form.abilities.includes(abilitySlug) ? abilitySlug : (form.abilities[0] || ""),
    itemSlug: itemSlug && ctx.items.some((x) => x.slug === itemSlug) ? itemSlug : null,
    moves,
    sps,
    nature,
  };
}

export function encodeParty(party) {
  return party.map(slotToString).join("|");
}

export function decodeParty(encoded, ctx) {
  const result = Array(SLOT_COUNT).fill(null);
  if (!encoded) return result;
  const parts = encoded.split("|");
  for (let i = 0; i < Math.min(SLOT_COUNT, parts.length); i++) {
    result[i] = stringToSlot(parts[i], ctx);
  }
  return result;
}

/**
 * Apply nature's +10%/-10% stat modifier.
 * HP is never affected; neutral natures return 1.0 for all stats.
 * @param {string|null} natureSlug
 * @param {{increased: string|null, decreased: string|null}[]} natures  natures.json
 * @returns {Record<string, number>}  {hp: 1, atk: 1|0.9|1.1, ...}
 */
export function natureMultipliers(natureSlug, natures) {
  const base = { hp: 1, atk: 1, def: 1, spAtk: 1, spDef: 1, speed: 1 };
  if (!natureSlug) return base;
  const n = (natures || []).find((x) => x.slug === natureSlug);
  if (!n) return base;
  if (n.increased && n.increased !== n.decreased) base[n.increased] = 1.1;
  if (n.decreased && n.decreased !== n.increased) base[n.decreased] = 0.9;
  return base;
}

import { findForm } from "./app.js";

export const SLOT_COUNT = 6;

/** @typedef {{slug:string, formName:string, abilitySlug:string, itemSlug:string|null}} Slot */
/** @typedef {{pokemonMap: Map<string, any>, items: {slug:string}[]}} DecodeCtx */

export function slotToString(s) {
  if (!s) return "";
  const parts = [s.slug, s.formName, s.abilitySlug, s.itemSlug ?? ""];
  return parts.map(encodeURIComponent).join(":");
}

export function stringToSlot(str, ctx) {
  if (!str) return null;
  const parts = str.split(":").map(decodeURIComponent);
  const [slug, formName, abilitySlug, itemSlug] = [
    parts[0] || "",
    parts[1] || "",
    parts[2] || "",
    parts[3] || "",
  ];
  if (!slug) return null;
  const p = ctx.pokemonMap.get(slug);
  if (!p) return null;
  const form = findForm(p, formName) || p.forms[0];
  return {
    slug,
    formName: form.name,
    abilitySlug: form.abilities.includes(abilitySlug) ? abilitySlug : (form.abilities[0] || ""),
    itemSlug: itemSlug && ctx.items.some((x) => x.slug === itemSlug) ? itemSlug : null,
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

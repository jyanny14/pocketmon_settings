import {
  loadPokemon,
  loadAbilities,
  loadItems,
  loadMoves,
  formatDex,
  statTotal,
  typeLabel,
  obtainLabel,
  formDisplayName,
  abilityDisplayName,
  itemDisplayName,
  moveDisplayName,
  moveCategoryLabel,
  findForm,
  t,
  getLang,
} from "./app.js";
import { SLOT_COUNT, encodeParty, decodeParty, emptySps } from "./party-encode.js";

const TYPE_ORDER = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const STAT_KEYS = ["hp", "atk", "def", "spAtk", "spDef", "speed"];
const STORAGE_KEY = "pc.savedParties.v1";

/** @typedef {{slug:string, formName:string, abilitySlug:string, itemSlug:string|null, moves:string[], sps:number[], nature:string|null}} Slot */

const state = {
  pokemon: [],
  pokemonMap: /** @type {Map<string, any>} */ (new Map()),
  abilityMap: /** @type {Map<string, any>} */ (new Map()),
  items: [],
  moveMap: /** @type {Map<string, any>} */ (new Map()),
  typeChart: null,
  // Party: Array of Slot|null, fixed length SLOT_COUNT
  party: /** @type {(Slot|null)[]} */ (Array(SLOT_COUNT).fill(null)),
  // Modal
  pickerTarget: -1,
  pickerQuery: "",
  pickerTypes: /** @type {Set<string>} */ (new Set()),
};

const els = {
  grid: document.getElementById("party-grid"),
  analysis: document.getElementById("analysis"),
  share: document.getElementById("share-party"),
  save: document.getElementById("save-party"),
  loadSaved: document.getElementById("load-saved"),
  aiPrompts: document.getElementById("ai-prompts"),
  reset: document.getElementById("reset-party"),
  modal: /** @type {HTMLDialogElement} */ (document.getElementById("picker-modal")),
  pickerSearch: document.getElementById("picker-search"),
  pickerTypeFilters: document.getElementById("picker-type-filters"),
  pickerList: document.getElementById("picker-list"),
  pickerEmpty: document.getElementById("picker-empty"),
};

// ── init ───────────────────────────────────────────────────────

async function init() {
  try {
    const [pokemon, abilities, items, moves, typeChart] = await Promise.all([
      loadPokemon(),
      loadAbilities(),
      loadItems(),
      loadMoves(),
      fetch(new URL("../data/type_chart.json", import.meta.url), { cache: "no-cache" }).then((r) => r.json()),
    ]);
    state.pokemon = pokemon;
    for (const p of pokemon) state.pokemonMap.set(p.slug, p);
    for (const a of abilities) state.abilityMap.set(a.slug, a);
    for (const m of moves) state.moveMap.set(m.slug, m);
    state.items = items;
    state.typeChart = typeChart;
  } catch (err) {
    els.grid.innerHTML = `<p class="empty-state">${t("error.loadFailed")}: ${err.message}</p>`;
    return;
  }

  renderTypeChips();
  readPartyFromUrl();
  writePartyToUrl();
  renderSavedList();
  bindGlobalEvents();
  renderAll();
}

function bindGlobalEvents() {
  els.share.addEventListener("click", copyShareUrl);
  els.save.addEventListener("click", savePartyDialog);
  els.loadSaved.addEventListener("change", onLoadSavedChange);
  els.reset.addEventListener("click", () => {
    state.party = Array(SLOT_COUNT).fill(null);
    writePartyToUrl();
    renderAll();
  });
  els.pickerSearch.addEventListener("input", () => {
    state.pickerQuery = els.pickerSearch.value;
    renderPickerList();
  });
}

// ── party slot rendering ──────────────────────────────────────

function renderAll() {
  renderGrid();
  renderAnalysis();
}

function renderGrid() {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < SLOT_COUNT; i++) {
    frag.appendChild(renderSlot(i, state.party[i]));
  }
  els.grid.replaceChildren(frag);
}

function renderSlot(index, slot) {
  const card = document.createElement("article");
  card.className = "slot-card" + (slot ? " slot-card--filled" : " slot-card--empty");
  card.setAttribute("role", "listitem");

  if (!slot) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-card__empty-btn";
    btn.dataset.slot = String(index);
    btn.textContent = `+ ${t("party.addSlot")}`;
    btn.addEventListener("click", () => openPicker(index));
    card.appendChild(btn);
    return card;
  }

  const pokemon = state.pokemonMap.get(slot.slug);
  const form = findForm(pokemon, slot.formName) || pokemon.forms[0];
  const ability = state.abilityMap.get(slot.abilitySlug);
  const item = slot.itemSlug ? state.items.find((x) => x.slug === slot.itemSlug) : null;

  // Header: sprite + name + remove
  const header = document.createElement("div");
  header.className = "slot-card__header";

  const img = document.createElement("img");
  img.className = "slot-card__sprite";
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = "";
  img.src = form.spritePath || pokemon.spritePath || "";

  const names = document.createElement("div");
  names.className = "slot-card__names";
  const nameKo = document.createElement("span");
  nameKo.className = "slot-card__name-ko";
  nameKo.textContent = formDisplayName(form) || pokemon.nameKo;
  const nameEn = document.createElement("span");
  nameEn.className = "slot-card__name-en";
  nameEn.textContent = form.name || pokemon.nameEn;
  const dex = document.createElement("span");
  dex.className = "slot-card__dex";
  dex.textContent = formatDex(pokemon.number);
  names.append(nameKo, nameEn, dex);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "slot-card__remove";
  remove.setAttribute("aria-label", t("party.removeSlot"));
  remove.textContent = "×";
  remove.addEventListener("click", () => {
    state.party[index] = null;
    writePartyToUrl();
    renderAll();
  });

  header.append(img, names, remove);

  // Types
  const types = document.createElement("div");
  types.className = "slot-card__types";
  for (const tt of form.types ?? []) {
    const badge = document.createElement("span");
    badge.className = `type type--${tt}`;
    badge.textContent = typeLabel(tt);
    types.appendChild(badge);
  }

  // Form selector (if multi-form)
  const controls = document.createElement("div");
  controls.className = "slot-card__controls";

  if (pokemon.forms.length > 1) {
    controls.appendChild(makeFormSelect(index, pokemon, slot));
  }
  controls.appendChild(makeAbilitySelect(index, form, slot));
  controls.appendChild(makeItemSelect(index, slot));

  // Stat bar (mini)
  const stats = document.createElement("div");
  stats.className = "slot-card__stats";
  const total = statTotal(form.baseStats);
  const totalLabel = document.createElement("span");
  totalLabel.className = "slot-card__stat-total";
  totalLabel.textContent = `${t("pokemon.statTotal")} ${total}`;
  stats.appendChild(totalLabel);

  const moves = makeMovesSection(index, pokemon, slot);

  card.append(header, types, controls, stats, moves);
  return card;
}

function makeMovesSection(index, pokemon, slot) {
  const details = document.createElement("details");
  details.className = "slot-card__moves";
  details.open = (slot.moves || []).length > 0;

  const summary = document.createElement("summary");
  summary.className = "slot-card__moves-summary";
  const count = (slot.moves || []).length;
  summary.textContent = `${t("party.moves.title")} (${count}/4)`;
  details.appendChild(summary);

  const learnable = (pokemon.moves || [])
    .map((s) => state.moveMap.get(s))
    .filter(Boolean);
  learnable.sort((a, b) =>
    moveDisplayName(a).localeCompare(moveDisplayName(b), getLang() === "ko" ? "ko" : "en"),
  );

  const row = document.createElement("div");
  row.className = "slot-card__moves-row";

  for (let i = 0; i < 4; i++) {
    row.appendChild(makeMoveSelect(index, pokemon, slot, learnable, i));
  }

  details.appendChild(row);
  return details;
}

function makeMoveSelect(index, pokemon, slot, learnable, slotPos) {
  const wrap = document.createElement("label");
  wrap.className = "slot-card__field";

  const label = document.createElement("span");
  label.className = "slot-card__field-label";
  label.textContent = `${t("party.moves.slot")} ${slotPos + 1}`;

  const sel = document.createElement("select");
  sel.className = "field__control";

  const none = document.createElement("option");
  none.value = "";
  none.textContent = t("party.moves.none");
  sel.appendChild(none);

  const selected = slot.moves?.[slotPos] || "";
  const excluded = new Set((slot.moves || []).filter((m, j) => m && j !== slotPos));

  for (const m of learnable) {
    if (excluded.has(m.slug)) continue;
    const opt = document.createElement("option");
    opt.value = m.slug;
    const typeL = typeLabel(m.type);
    const catL = moveCategoryLabel(m.category || "");
    opt.textContent = `${moveDisplayName(m)} · ${typeL}${catL ? " · " + catL : ""}`;
    if (m.slug === selected) opt.selected = true;
    sel.appendChild(opt);
  }

  sel.addEventListener("change", () => {
    const current = state.party[index];
    if (!current) return;
    const moves = [...(current.moves || [])];
    const newValue = sel.value;
    if (newValue) {
      if (slotPos < moves.length) moves[slotPos] = newValue;
      else moves.push(newValue);
    } else if (slotPos < moves.length) {
      moves.splice(slotPos, 1);
    }
    state.party[index] = { ...current, moves };
    writePartyToUrl();
    renderAll();
  });

  wrap.append(label, sel);
  return wrap;
}

function makeFormSelect(index, pokemon, slot) {
  const wrap = document.createElement("label");
  wrap.className = "slot-card__field";
  const label = document.createElement("span");
  label.className = "slot-card__field-label";
  label.textContent = t("detail.forms");
  const sel = document.createElement("select");
  sel.className = "field__control";
  for (const f of pokemon.forms) {
    const opt = document.createElement("option");
    opt.value = f.name;
    opt.textContent = formDisplayName(f);
    if (f.name === slot.formName) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    const newForm = findForm(pokemon, sel.value) || pokemon.forms[0];
    state.party[index] = {
      ...slot,
      formName: newForm.name,
      // Reset ability to first of new form if current is not valid
      abilitySlug: newForm.abilities.includes(slot.abilitySlug)
        ? slot.abilitySlug
        : newForm.abilities[0],
    };
    writePartyToUrl();
    renderAll();
  });
  wrap.append(label, sel);
  return wrap;
}

function makeAbilitySelect(index, form, slot) {
  const wrap = document.createElement("label");
  wrap.className = "slot-card__field";
  const label = document.createElement("span");
  label.className = "slot-card__field-label";
  label.textContent = t("detail.abilities");
  const sel = document.createElement("select");
  sel.className = "field__control";
  for (const abSlug of form.abilities ?? []) {
    const ab = state.abilityMap.get(abSlug);
    const opt = document.createElement("option");
    opt.value = abSlug;
    opt.textContent = ab ? abilityDisplayName(ab) : abSlug;
    if (abSlug === slot.abilitySlug) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    state.party[index] = { ...slot, abilitySlug: sel.value };
    writePartyToUrl();
    renderAll();
  });
  wrap.append(label, sel);
  return wrap;
}

function makeItemSelect(index, slot) {
  const wrap = document.createElement("label");
  wrap.className = "slot-card__field";
  const label = document.createElement("span");
  label.className = "slot-card__field-label";
  label.textContent = t("nav.items");
  const sel = document.createElement("select");
  sel.className = "field__control";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = t("party.noItem");
  sel.appendChild(none);
  const byCategory = { held: [], "mega-stone": [], berry: [] };
  for (const it of state.items) {
    byCategory[it.category]?.push(it);
  }
  for (const cat of ["held", "mega-stone", "berry"]) {
    const list = byCategory[cat];
    if (!list?.length) continue;
    const group = document.createElement("optgroup");
    group.label = t(`items.cat.${cat}`);
    for (const it of list) {
      const opt = document.createElement("option");
      opt.value = it.slug;
      opt.textContent = itemDisplayName(it);
      if (it.slug === slot.itemSlug) opt.selected = true;
      group.appendChild(opt);
    }
    sel.appendChild(group);
  }
  sel.addEventListener("change", () => {
    state.party[index] = { ...slot, itemSlug: sel.value || null };
    writePartyToUrl();
    renderAll();
  });
  wrap.append(label, sel);
  return wrap;
}

// ── picker modal ─────────────────────────────────────────────

function renderTypeChips() {
  const frag = document.createDocumentFragment();
  for (const tt of TYPE_ORDER) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip type--${tt}`;
    chip.textContent = typeLabel(tt);
    chip.setAttribute("aria-pressed", "false");
    chip.addEventListener("click", () => {
      if (state.pickerTypes.has(tt)) state.pickerTypes.delete(tt);
      else state.pickerTypes.add(tt);
      chip.setAttribute("aria-pressed", state.pickerTypes.has(tt) ? "true" : "false");
      renderPickerList();
    });
    frag.appendChild(chip);
  }
  els.pickerTypeFilters.replaceChildren(frag);
}

function openPicker(slotIndex) {
  state.pickerTarget = slotIndex;
  state.pickerQuery = "";
  state.pickerTypes.clear();
  els.pickerSearch.value = "";
  for (const chip of els.pickerTypeFilters.querySelectorAll(".chip")) {
    chip.setAttribute("aria-pressed", "false");
  }
  renderPickerList();
  if (typeof els.modal.showModal === "function") {
    els.modal.showModal();
  } else {
    els.modal.setAttribute("open", "");
  }
  els.pickerSearch.focus();
}

function renderPickerList() {
  const q = state.pickerQuery.trim().toLowerCase();
  const typeFilter = state.pickerTypes;

  // (slug, formName) combinations already present in the party — shown but disabled.
  const taken = new Set(
    state.party
      .filter((s, i) => s && i !== state.pickerTarget)
      .map((s) => `${s.slug}::${s.formName}`),
  );

  // Build one row per (pokemon, form) — species with multiple forms appear
  // multiple times, each with its own sprite and types.
  const rows = [];
  for (const p of state.pokemon) {
    for (const form of p.forms) {
      const formTypes = form.types ?? [];
      if (typeFilter.size) {
        let ok = true;
        for (const tt of typeFilter) if (!formTypes.includes(tt)) { ok = false; break; }
        if (!ok) continue;
      }
      if (q) {
        const displayKo = form.nameKo || p.nameKo;
        const displayEn = form.name || p.nameEn;
        const hit =
          displayKo.toLowerCase().includes(q) ||
          displayEn.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q);
        if (!hit) continue;
      }
      rows.push({ pokemon: p, form });
    }
  }

  els.pickerEmpty.hidden = rows.length > 0;

  const frag = document.createDocumentFragment();
  for (const { pokemon: p, form } of rows) {
    const isTaken = taken.has(`${p.slug}::${form.name}`);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "picker-row" + (isTaken ? " picker-row--taken" : "");
    row.disabled = isTaken;

    const img = document.createElement("img");
    img.className = "picker-row__sprite";
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "";
    img.src = form.spritePath || p.spritePath || "";

    const textWrap = document.createElement("span");
    textWrap.className = "picker-row__text";
    const displayKo = form.nameKo || p.nameKo;
    const displayEn = form.name || p.nameEn;
    const primaryEl = document.createElement("span");
    primaryEl.className = "picker-row__name";
    primaryEl.textContent = getLang() === "ko" ? displayKo : displayEn;
    const subEl = document.createElement("span");
    subEl.className = "picker-row__sub";
    const sub = getLang() === "ko" ? displayEn : displayKo;
    subEl.textContent = `${formatDex(p.number)} · ${sub}`;
    textWrap.append(primaryEl, subEl);

    const types = document.createElement("span");
    types.className = "picker-row__types";
    for (const tt of form.types ?? []) {
      const badge = document.createElement("span");
      badge.className = `type type--${tt}`;
      badge.textContent = typeLabel(tt);
      types.appendChild(badge);
    }

    row.append(img, textWrap, types);

    if (isTaken) {
      const taken = document.createElement("span");
      taken.className = "picker-row__taken";
      taken.textContent = t("party.alreadyInParty");
      row.appendChild(taken);
    } else {
      row.addEventListener("click", () => pickForm(p, form));
    }
    frag.appendChild(row);
  }
  els.pickerList.replaceChildren(frag);
}

function pickForm(p, form) {
  /** @type {Slot} */
  const newSlot = {
    slug: p.slug,
    formName: form.name,
    abilitySlug: form.abilities[0] || "",
    itemSlug: null,
    moves: [],
    sps: emptySps(),
    nature: null,
  };
  if (state.pickerTarget >= 0) {
    state.party[state.pickerTarget] = newSlot;
  }
  if (typeof els.modal.close === "function") els.modal.close();
  else els.modal.removeAttribute("open");
  writePartyToUrl();
  renderAll();
}

// ── analysis panel ───────────────────────────────────────────

function renderAnalysis() {
  const filled = state.party.filter((x) => x);
  if (filled.length === 0) {
    els.analysis.hidden = true;
    els.analysis.replaceChildren();
    return;
  }
  els.analysis.hidden = false;

  const members = filled.map((s) => {
    const p = state.pokemonMap.get(s.slug);
    const f = findForm(p, s.formName) || p.forms[0];
    return { slot: s, pokemon: p, form: f };
  });

  const frag = document.createDocumentFragment();
  frag.appendChild(renderStatsSummary(members));
  frag.appendChild(renderTypeDistribution(members));
  frag.appendChild(renderAttackCoverage(members));
  frag.appendChild(renderDefensiveProfile(members));
  frag.appendChild(renderSourceGameOverlap(members));
  els.analysis.replaceChildren(frag);
}

function section(title) {
  const s = document.createElement("section");
  s.className = "analysis-section";
  const h = document.createElement("h2");
  h.className = "analysis-section__title";
  h.textContent = title;
  s.appendChild(h);
  return s;
}

function renderStatsSummary(members) {
  const s = section(t("party.analysis.stats"));
  const grid = document.createElement("div");
  grid.className = "analysis-stats-grid";
  const totals = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, speed: 0 };
  for (const m of members) {
    for (const k of STAT_KEYS) totals[k] += m.form.baseStats?.[k] || 0;
  }
  const sum = STAT_KEYS.reduce((a, k) => a + totals[k], 0);
  for (const k of STAT_KEYS) {
    const cell = document.createElement("div");
    cell.className = "analysis-stat-cell";
    const label = document.createElement("span");
    label.className = "analysis-stat-cell__label";
    label.textContent = t("stat." + k);
    const val = document.createElement("span");
    val.className = "analysis-stat-cell__value";
    val.textContent = totals[k];
    const avg = document.createElement("span");
    avg.className = "analysis-stat-cell__sub";
    avg.textContent = `avg ${Math.round(totals[k] / members.length)}`;
    cell.append(label, val, avg);
    grid.appendChild(cell);
  }
  s.appendChild(grid);
  const totalP = document.createElement("p");
  totalP.className = "analysis-total";
  totalP.textContent = `${t("party.analysis.totalBase")}: ${sum}`;
  s.appendChild(totalP);
  return s;
}

function renderTypeDistribution(members) {
  const s = section(t("party.analysis.types"));
  const counts = new Map();
  for (const m of members) {
    for (const tt of m.form.types ?? []) counts.set(tt, (counts.get(tt) || 0) + 1);
  }
  const list = document.createElement("div");
  list.className = "chip-row chip-row--dense";
  for (const tt of TYPE_ORDER) {
    const n = counts.get(tt) || 0;
    if (!n) continue;
    const chip = document.createElement("span");
    chip.className = `type type--${tt}`;
    chip.textContent = `${typeLabel(tt)} ×${n}`;
    list.appendChild(chip);
  }
  s.appendChild(list);

  // Duplicate-combo warning
  const combos = new Map();
  for (const m of members) {
    const key = [...(m.form.types ?? [])].sort().join("/");
    combos.set(key, (combos.get(key) || 0) + 1);
  }
  const dups = [...combos.entries()].filter(([, v]) => v > 1);
  if (dups.length) {
    const warn = document.createElement("p");
    warn.className = "analysis-warn";
    warn.textContent =
      t("party.analysis.duplicateCombo") +
      ": " +
      dups.map(([k, v]) => `${k} ×${v}`).join(", ");
    s.appendChild(warn);
  }
  return s;
}

function attackMultiplier(attackType, defenderTypes) {
  const m = state.typeChart?.matrix?.[attackType];
  if (!m) return 1;
  let mul = 1;
  for (const d of defenderTypes) mul *= m[d] ?? 1;
  return mul;
}

function renderAttackCoverage(members) {
  const s = section(t("party.analysis.offense"));
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent = t("party.analysis.offenseHint");
  s.appendChild(intro);

  // For each defender type, find the best multiplier any member can produce.
  // If a member has configured damaging moves, only those move types count
  // (the analysis reflects the actual battle plan). Otherwise fall back to
  // the member's own STAB types as a best-case assumption.
  const partyAttackTypes = new Set();
  for (const m of members) {
    const configuredTypes = collectAttackTypes(m.slot);
    if (configuredTypes.size) {
      for (const tt of configuredTypes) partyAttackTypes.add(tt);
    } else {
      for (const tt of m.form.types ?? []) partyAttackTypes.add(tt);
    }
  }

  const table = document.createElement("div");
  table.className = "coverage-grid";
  const uncovered = [];
  for (const d of TYPE_ORDER) {
    let best = 0;
    for (const atk of partyAttackTypes) {
      const mul = attackMultiplier(atk, [d]);
      if (mul > best) best = mul;
    }
    const cell = document.createElement("span");
    cell.className = `coverage-cell type--${d} coverage--${coverageClass(best)}`;
    cell.textContent = `${typeLabel(d)} ×${formatMul(best)}`;
    cell.title = `${t("party.analysis.bestVs")} ${typeLabel(d)}: ×${formatMul(best)}`;
    table.appendChild(cell);
    if (best < 2) uncovered.push(d);
  }
  s.appendChild(table);
  if (uncovered.length) {
    const warn = document.createElement("p");
    warn.className = "analysis-warn";
    warn.textContent =
      `${t("party.analysis.noSuperEffective")}: ` +
      uncovered.map((x) => typeLabel(x)).join(", ");
    s.appendChild(warn);
  }
  return s;
}

function coverageClass(mul) {
  if (mul >= 4) return "4x";
  if (mul >= 2) return "2x";
  if (mul >= 1) return "1x";
  if (mul > 0) return "half";
  return "zero";
}

/**
 * Collect damaging-move types from a slot's configured moves (T22a).
 * Returns empty Set if no damaging moves set — caller should fall back
 * to the slot's own form types (classic STAB assumption).
 */
function collectAttackTypes(slot) {
  const result = new Set();
  for (const slug of slot?.moves || []) {
    const m = state.moveMap.get(slug);
    if (!m) continue;
    if (m.category === "status") continue;
    // Treat non-null positive power as damaging. null / 0 often means fixed
    // or 1-HP moves which do deal damage — include them too so moves like
    // Seismic Toss still count as coverage.
    if (m.type) result.add(m.type);
  }
  return result;
}

function formatMul(m) {
  if (m === 0) return "0";
  if (m === 0.5) return "0.5";
  if (m === 0.25) return "0.25";
  if (Number.isInteger(m)) return String(m);
  return m.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function renderDefensiveProfile(members) {
  const s = section(t("party.analysis.defense"));
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent = t("party.analysis.defenseHint");
  s.appendChild(intro);

  // For each attacker type, how many party members take >=2x from it
  const rows = [];
  for (const atk of TYPE_ORDER) {
    let weak = 0;
    let resist = 0;
    let immune = 0;
    for (const m of members) {
      const mul = attackMultiplier(atk, m.form.types ?? []);
      if (mul === 0) immune++;
      else if (mul >= 2) weak++;
      else if (mul < 1) resist++;
    }
    rows.push({ atk, weak, resist, immune });
  }
  const risky = rows.filter((r) => r.weak >= 3);
  const table = document.createElement("div");
  table.className = "coverage-grid";
  for (const r of rows) {
    const cell = document.createElement("span");
    const cls = r.weak >= 3 ? "risk" : r.weak >= 2 ? "caution" : r.weak ? "minor" : "ok";
    cell.className = `coverage-cell type--${r.atk} coverage--${cls}`;
    cell.textContent = `${typeLabel(r.atk)} ${r.weak}/${members.length}`;
    cell.title = `${t("party.analysis.weakCount")} ${r.weak}, ${t("party.analysis.resistCount")} ${r.resist}, ${t("party.analysis.immuneCount")} ${r.immune}`;
    table.appendChild(cell);
  }
  s.appendChild(table);
  if (risky.length) {
    const warn = document.createElement("p");
    warn.className = "analysis-warn";
    warn.textContent =
      `${t("party.analysis.sharedWeakness")}: ` +
      risky
        .map((r) => `${typeLabel(r.atk)} (${r.weak}/${members.length})`)
        .join(", ");
    s.appendChild(warn);
  }
  return s;
}

function renderSourceGameOverlap(members) {
  const s = section(t("party.analysis.games"));
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent = t("party.analysis.gamesHint");
  s.appendChild(intro);

  const list = document.createElement("div");
  list.className = "chip-row chip-row--dense";

  // Union: any party member provides each game
  const union = new Set();
  // Per-member sets
  const perMember = members.map((m) => new Set(m.form.sourceGames ?? []));
  for (const set of perMember) for (const g of set) union.add(g);

  if (union.size === 0) {
    const note = document.createElement("p");
    note.className = "analysis-warn";
    note.textContent = t("party.analysis.noDirectHome");
    s.appendChild(note);
    return s;
  }

  // Games that cover ALL members (overlap)
  const intersection = new Set(perMember[0] || []);
  for (let i = 1; i < perMember.length; i++) {
    for (const g of [...intersection]) if (!perMember[i].has(g)) intersection.delete(g);
  }

  const allLabel = document.createElement("p");
  allLabel.className = "muted";
  allLabel.textContent = t("party.analysis.allMembersGames") + ":";
  s.appendChild(allLabel);
  if (intersection.size === 0) {
    const none = document.createElement("p");
    none.className = "analysis-warn";
    none.textContent = t("party.analysis.noSingleGame");
    s.appendChild(none);
  } else {
    const row = document.createElement("div");
    row.className = "chip-row chip-row--dense";
    for (const g of [...intersection].sort()) {
      const chip = document.createElement("span");
      chip.className = "chip chip--game";
      chip.textContent = gameLabel(g);
      row.appendChild(chip);
    }
    s.appendChild(row);
  }
  return s;
}

function gameLabel(slug) {
  return t("game." + slug) || slug;
}

// ── URL encoding ─────────────────────────────────────────────

function decodeCtx() {
  return { pokemonMap: state.pokemonMap, items: state.items };
}

function writePartyToUrl() {
  const encoded = encodeParty(state.party);
  const params = new URLSearchParams();
  if (state.party.some((x) => x)) params.set("p", encoded);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  if (els.aiPrompts) {
    els.aiPrompts.href = `./prompts.html${qs ? `?${qs}` : ""}`;
  }
}

function readPartyFromUrl() {
  const params = new URLSearchParams(location.search);
  const encoded = params.get("p");
  if (!encoded) return;
  state.party = decodeParty(encoded, decodeCtx());
}

async function copyShareUrl() {
  writePartyToUrl();
  try {
    await navigator.clipboard.writeText(location.href);
    els.share.textContent = t("party.copied");
    setTimeout(() => (els.share.textContent = t("party.copyUrl")), 1500);
  } catch {
    // Fallback: select URL into prompt
    prompt(t("party.copyUrl"), location.href);
  }
}

// ── local storage ────────────────────────────────────────────

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeSaved(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

function savePartyDialog() {
  if (!state.party.some((x) => x)) {
    alert(t("party.emptyCantSave"));
    return;
  }
  const name = prompt(t("party.saveAs"));
  if (!name) return;
  const saved = loadSaved();
  saved[name] = state.party.map(slotToString).join("|");
  writeSaved(saved);
  renderSavedList();
  els.loadSaved.value = name;
}

function onLoadSavedChange() {
  const name = els.loadSaved.value;
  if (!name) return;
  const saved = loadSaved();
  const encoded = saved[name];
  if (!encoded) return;
  state.party = decodeParty(encoded, decodeCtx());
  writePartyToUrl();
  renderAll();
}

function renderSavedList() {
  const saved = loadSaved();
  const names = Object.keys(saved).sort();
  const current = els.loadSaved.value;
  els.loadSaved.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = t("party.loadSaved");
  els.loadSaved.appendChild(first);
  for (const n of names) {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    if (n === current) o.selected = true;
    els.loadSaved.appendChild(o);
  }
}

init();

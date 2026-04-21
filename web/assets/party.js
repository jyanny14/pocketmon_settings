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
import {
  SLOT_COUNT,
  encodeParty,
  decodeParty,
  emptySps,
  SP_PER_STAT_MAX,
  SP_TOTAL_MAX,
  SP_STAT_KEYS,
} from "./party-encode.js";
import { effectiveStats, effectiveStatsTotal } from "./stats.js";

const TYPE_ORDER = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const STAT_KEYS = ["hp", "atk", "def", "spAtk", "spDef", "speed"];
const STORAGE_KEY = "pc.savedParties.v1";

/** @typedef {{slug:string, formName:string, abilitySlug:string, itemSlug:string|null, moves:string[], sps:number[], nature:string|null}} Slot */

// Populated in init() once items.json is loaded. Keys are form.name ("Mega
// Charizard X"), values are the mega-stone item slug ("charizardite-x"). Forms
// without a corresponding stone (Mega Rayquaza) are absent — callers must
// treat "missing" as "no lock needed".
const MEGA_STONE_BY_FORM = /** @type {Map<string, string>} */ (new Map());

function buildMegaStoneMap(items) {
  MEGA_STONE_BY_FORM.clear();
  for (const item of items) {
    if (item.category !== "mega-stone") continue;
    // Effect text shape: "...A/An [optional adjective] {Pokemon} holding this
    // stone will be able to Mega Evolve..." The pokemon name is always the
    // capitalized word directly before "holding this stone".
    const m = item.effect?.match(/([A-Z][a-z]+)\s+holding this stone/);
    if (!m) continue;
    const pokeName = m[1];
    let suffix = "";
    if (item.slug.endsWith("-x")) suffix = " X";
    else if (item.slug.endsWith("-y")) suffix = " Y";
    MEGA_STONE_BY_FORM.set(`Mega ${pokeName}${suffix}`, item.slug);
  }
}

function megaStoneForForm(formName) {
  return MEGA_STONE_BY_FORM.get(formName) || null;
}

/** If this slot's form requires a mega stone, force the itemSlug to that
 *  stone. Otherwise return the slot unchanged. Non-mutating. */
function applyMegaStoneLock(slot) {
  if (!slot) return slot;
  const stone = megaStoneForForm(slot.formName);
  if (stone && slot.itemSlug !== stone) {
    return { ...slot, itemSlug: stone };
  }
  return slot;
}

const state = {
  pokemon: [],
  pokemonMap: /** @type {Map<string, any>} */ (new Map()),
  abilityMap: /** @type {Map<string, any>} */ (new Map()),
  items: [],
  moveMap: /** @type {Map<string, any>} */ (new Map()),
  natures: /** @type {{slug:string, nameKo:string, nameEn:string, increased:string|null, decreased:string|null}[]} */ ([]),
  typeChart: null,
  // Party: Array of Slot|null, fixed length SLOT_COUNT
  party: /** @type {(Slot|null)[]} */ (Array(SLOT_COUNT).fill(null)),
  // Modal (pokemon picker)
  pickerTarget: -1,
  pickerQuery: "",
  pickerTypes: /** @type {Set<string>} */ (new Set()),
  // Modal (move picker) — target identifies (partySlotIndex, moveSlotPos 0..3)
  movePickerTarget: /** @type {{slotIndex: number, slotPos: number}} */ ({ slotIndex: -1, slotPos: -1 }),
  movePickerQuery: "",
  movePickerTypes: /** @type {Set<string>} */ (new Set()),
  movePickerCats: /** @type {Set<string>} */ (new Set()),
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
  moveModal: /** @type {HTMLDialogElement} */ (document.getElementById("move-picker-modal")),
  movePickerSearch: document.getElementById("move-picker-search"),
  movePickerTypeFilters: document.getElementById("move-picker-type-filters"),
  movePickerCatFilters: document.getElementById("move-picker-cat-filters"),
  movePickerList: document.getElementById("move-picker-list"),
  movePickerEmpty: document.getElementById("move-picker-empty"),
};

// ── init ───────────────────────────────────────────────────────

async function init() {
  try {
    const [pokemon, abilities, items, moves, typeChart, natures] = await Promise.all([
      loadPokemon(),
      loadAbilities(),
      loadItems(),
      loadMoves(),
      fetch(new URL("../data/type_chart.json", import.meta.url), { cache: "no-cache" }).then((r) => r.json()),
      fetch(new URL("../data/natures.json", import.meta.url), { cache: "no-cache" }).then((r) => r.json()),
    ]);
    state.pokemon = pokemon;
    for (const p of pokemon) state.pokemonMap.set(p.slug, p);
    for (const a of abilities) state.abilityMap.set(a.slug, a);
    for (const m of moves) state.moveMap.set(m.slug, m);
    state.items = items;
    state.typeChart = typeChart;
    state.natures = natures;
    buildMegaStoneMap(items);
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
  if (els.movePickerSearch) {
    els.movePickerSearch.addEventListener("input", () => {
      state.movePickerQuery = els.movePickerSearch.value;
      renderMovePickerList();
    });
  }
  if (els.moveModal) {
    // <dialog>'s native "cancel" (Esc) / submit("cancel") fire "close".
    // Reset the modal target so re-opening starts clean.
    els.moveModal.addEventListener("close", () => {
      state.movePickerTarget = { slotIndex: -1, slotPos: -1 };
    });
  }
  if (els.aiPrompts) {
    els.aiPrompts.addEventListener("click", (e) => {
      if (els.aiPrompts.getAttribute("aria-disabled") === "true") {
        e.preventDefault();
      }
    });
  }
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

  const extras = makeExtendedSection(index, pokemon, form, slot);

  card.append(header, types, controls, stats, extras);
  return card;
}

function makeExtendedSection(index, pokemon, form, slot) {
  const details = document.createElement("details");
  details.className = "slot-card__extra";
  const hasMoves = (slot.moves || []).length > 0;
  const hasSps = (slot.sps || []).some((v) => v > 0);
  const hasNature = !!slot.nature;
  details.open = hasMoves || hasSps || hasNature;

  const summary = document.createElement("summary");
  summary.className = "slot-card__extra-summary";
  summary.textContent = buildExtraSummary(slot);
  details.appendChild(summary);

  // Tabs: [Moves] [Training]. Default to Moves each time the details opens —
  // both panels always render but only the active one is visible, so tab
  // switching is instant and no re-render is needed.
  const tabPanelMovesId = `slot-${index}-tab-moves`;
  const tabPanelTrainingId = `slot-${index}-tab-training`;
  const tabMovesId = `slot-${index}-tab-btn-moves`;
  const tabTrainingId = `slot-${index}-tab-btn-training`;

  const tablist = document.createElement("div");
  tablist.className = "slot-card__tabs";
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", t("party.extras.title"));

  const tabMoves = document.createElement("button");
  tabMoves.type = "button";
  tabMoves.className = "slot-card__tab slot-card__tab--active";
  tabMoves.id = tabMovesId;
  tabMoves.setAttribute("role", "tab");
  tabMoves.setAttribute("aria-selected", "true");
  tabMoves.setAttribute("aria-controls", tabPanelMovesId);
  tabMoves.textContent = t("party.tab.moves");

  const tabTraining = document.createElement("button");
  tabTraining.type = "button";
  tabTraining.className = "slot-card__tab";
  tabTraining.id = tabTrainingId;
  tabTraining.setAttribute("role", "tab");
  tabTraining.setAttribute("aria-selected", "false");
  tabTraining.setAttribute("aria-controls", tabPanelTrainingId);
  tabTraining.setAttribute("tabindex", "-1");
  tabTraining.textContent = t("party.tab.training");

  tablist.append(tabMoves, tabTraining);
  details.appendChild(tablist);

  // Panels
  const panelMoves = document.createElement("div");
  panelMoves.className = "slot-card__tabpanel";
  panelMoves.id = tabPanelMovesId;
  panelMoves.setAttribute("role", "tabpanel");
  panelMoves.setAttribute("aria-labelledby", tabMovesId);
  panelMoves.appendChild(buildMovesBlock(index, pokemon, slot));

  const panelTraining = document.createElement("div");
  panelTraining.className = "slot-card__tabpanel";
  panelTraining.id = tabPanelTrainingId;
  panelTraining.setAttribute("role", "tabpanel");
  panelTraining.setAttribute("aria-labelledby", tabTrainingId);
  panelTraining.hidden = true;
  panelTraining.appendChild(buildTrainingBlock(index, form, slot));

  details.append(panelMoves, panelTraining);

  // Tab wiring: click + arrow-key navigation. Activating a tab toggles the
  // selected state, focus, and panel visibility in one place.
  const activate = (which) => {
    const movesActive = which === "moves";
    tabMoves.classList.toggle("slot-card__tab--active", movesActive);
    tabTraining.classList.toggle("slot-card__tab--active", !movesActive);
    tabMoves.setAttribute("aria-selected", movesActive ? "true" : "false");
    tabTraining.setAttribute("aria-selected", movesActive ? "false" : "true");
    tabMoves.setAttribute("tabindex", movesActive ? "0" : "-1");
    tabTraining.setAttribute("tabindex", movesActive ? "-1" : "0");
    panelMoves.hidden = !movesActive;
    panelTraining.hidden = movesActive;
    (movesActive ? tabMoves : tabTraining).focus({ preventScroll: true });
  };
  tabMoves.addEventListener("click", () => activate("moves"));
  tabTraining.addEventListener("click", () => activate("training"));
  const onKey = (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      activate(tabMoves.getAttribute("aria-selected") === "true" ? "training" : "moves");
    } else if (e.key === "Home") {
      e.preventDefault();
      activate("moves");
    } else if (e.key === "End") {
      e.preventDefault();
      activate("training");
    }
  };
  tabMoves.addEventListener("keydown", onKey);
  tabTraining.addEventListener("keydown", onKey);

  return details;
}

function buildExtraSummary(slot) {
  const movesN = (slot.moves || []).length;
  const spTotal = (slot.sps || []).reduce((a, b) => a + b, 0);
  const natureSlug = slot.nature;
  let natureLabel = "—";
  if (natureSlug) {
    natureLabel = isNeutralNatureSlug(natureSlug)
      ? t("party.nature.neutral")
      : t(`nature.${natureSlug}`);
  }
  return `${t("party.extras.title")} · ${t("party.moves.title")} ${movesN}/4 · SP ${spTotal}/${SP_TOTAL_MAX} · ${t("party.nature.title")} ${natureLabel}`;
}

function buildMovesBlock(index, pokemon, slot) {
  const block = document.createElement("div");
  block.className = "slot-card__extra-block";
  // heading removed: the tab label above already announces this section

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
  block.appendChild(row);
  return block;
}

function buildTrainingBlock(index, form, slot) {
  const block = document.createElement("div");
  block.className = "slot-card__extra-block";
  // heading removed: the tab label above already announces this section

  // Nature dropdown
  block.appendChild(makeNatureSelect(index, slot));

  // SP inputs
  block.appendChild(makeSpInputs(index, form, slot));

  return block;
}

// The game has 5 "neutral" natures (Hardy / Docile / Serious / Bashful /
// Quirky) that all produce identical 1.0× modifiers. Showing 5 separate
// options in the dropdown confused users, so we collapse them into one
// "neutral" entry and store Hardy as the canonical value. Shared-URL back
// compat is preserved — decoding any of the 5 slugs still works; they just
// display as "neutral" in the UI.
const CANONICAL_NEUTRAL_NATURE = "hardy";

function isNeutralNatureSlug(slug) {
  if (!slug) return false;
  const n = state.natures.find((x) => x.slug === slug);
  return !!n && !n.increased && !n.decreased;
}

function makeNatureSelect(index, slot) {
  const wrap = document.createElement("label");
  wrap.className = "slot-card__field";

  const label = document.createElement("span");
  label.className = "slot-card__field-label";
  label.textContent = t("party.nature.title");

  const sel = document.createElement("select");
  sel.className = "field__control";

  const none = document.createElement("option");
  none.value = "";
  none.textContent = t("party.nature.none");
  sel.appendChild(none);

  const currentIsNeutral = isNeutralNatureSlug(slot.nature);

  // Single collapsed "neutral" entry — represents all 5 neutrals.
  const neutralOpt = document.createElement("option");
  neutralOpt.value = CANONICAL_NEUTRAL_NATURE;
  neutralOpt.textContent = t("party.nature.neutral");
  neutralOpt.title = t("party.nature.neutralHint");
  if (currentIsNeutral) neutralOpt.selected = true;
  sel.appendChild(neutralOpt);

  // 20 non-neutral natures, sorted by display name.
  const nonNeutral = state.natures.filter((n) => n.increased && n.decreased);
  nonNeutral.sort((a, b) =>
    (a.nameKo || a.nameEn).localeCompare(b.nameKo || b.nameEn, getLang() === "ko" ? "ko" : "en"),
  );
  for (const n of nonNeutral) {
    const opt = document.createElement("option");
    opt.value = n.slug;
    const displayName = getLang() === "ko" ? (n.nameKo || n.nameEn) : n.nameEn;
    const modTag = ` (+${statShortLabel(n.increased)} / −${statShortLabel(n.decreased)})`;
    opt.textContent = `${displayName}${modTag}`;
    opt.title = modTag.trim();
    if (n.slug === slot.nature) opt.selected = true;
    sel.appendChild(opt);
  }

  if (!slot.nature) none.selected = true;

  sel.addEventListener("change", () => {
    const current = state.party[index];
    if (!current) return;
    state.party[index] = { ...current, nature: sel.value || null };
    writePartyToUrl();
    renderAll();
  });

  wrap.append(label, sel);
  return wrap;
}

function statShortLabel(statKey) {
  const map = {
    hp: t("stat.hp"),
    atk: t("stat.atk"),
    def: t("stat.def"),
    spAtk: t("stat.spAtk"),
    spDef: t("stat.spDef"),
    speed: t("stat.speed"),
  };
  return map[statKey] || statKey;
}

function makeSpInputs(index, form, slot) {
  const wrap = document.createElement("div");
  wrap.className = "slot-card__sp";

  const sps = (slot.sps && slot.sps.length === 6) ? [...slot.sps] : emptySps();
  const total = sps.reduce((a, b) => a + b, 0);
  const over = total > SP_TOTAL_MAX;

  // Look up the selected nature so we can tint stats it boosts / cuts.
  const nature = slot.nature
    ? state.natures.find((n) => n.slug === slot.nature) || null
    : null;

  const header = document.createElement("div");
  header.className = "slot-card__sp-header";
  header.innerHTML = `<span>${t("party.sp.title")}</span><span class="slot-card__sp-total${over ? " slot-card__sp-total--over" : ""}">${total}/${SP_TOTAL_MAX}</span>`;
  wrap.appendChild(header);

  // 66-point budget bar — width = total / cap, clamped to 100%.
  const budget = document.createElement("div");
  budget.className = "slot-card__sp-budget";
  budget.setAttribute("role", "progressbar");
  budget.setAttribute("aria-valuemin", "0");
  budget.setAttribute("aria-valuemax", String(SP_TOTAL_MAX));
  budget.setAttribute("aria-valuenow", String(Math.min(total, SP_TOTAL_MAX)));
  const pct = Math.min(100, Math.round((total / SP_TOTAL_MAX) * 100));
  const fill = document.createElement("div");
  fill.className = "slot-card__sp-budget-fill" + (over ? " slot-card__sp-budget-fill--over" : "");
  fill.style.width = `${pct}%`;
  budget.appendChild(fill);
  wrap.appendChild(budget);

  const grid = document.createElement("div");
  grid.className = "slot-card__sp-grid";

  /** Apply a proposed value to sps[i] — clamps the stat to 0..32, rejects if
   *  the new total would exceed 66. Re-renders on accept. */
  const commit = (i, rawValue) => {
    const current = state.party[index];
    if (!current) return false;
    let v = Math.max(0, Math.min(SP_PER_STAT_MAX, Math.floor(rawValue || 0)));
    const base = (current.sps && current.sps.length === 6) ? current.sps : emptySps();
    const nextSps = [...base];
    nextSps[i] = v;
    const newTotal = nextSps.reduce((a, b) => a + b, 0);
    if (newTotal > SP_TOTAL_MAX) return false;
    state.party[index] = { ...current, sps: nextSps };
    writePartyToUrl();
    renderAll();
    return true;
  };

  /** Budget headroom for a stat = min(32, 66 − other_stats). */
  const maxFor = (i) => {
    const others = sps.reduce((acc, v, j) => acc + (j === i ? 0 : v), 0);
    return Math.max(0, Math.min(SP_PER_STAT_MAX, SP_TOTAL_MAX - others));
  };

  SP_STAT_KEYS.forEach((key, i) => {
    const cell = document.createElement("div");
    cell.className = "slot-card__sp-cell";
    cell.dataset.stat = key;
    if (nature?.increased === key) cell.dataset.natureEffect = "up";
    else if (nature?.decreased === key) cell.dataset.natureEffect = "down";

    const lab = document.createElement("span");
    lab.className = "slot-card__sp-label";
    lab.textContent = statShortLabel(key);
    if (nature?.increased === key) {
      const arrow = document.createElement("span");
      arrow.className = "slot-card__sp-label-arrow slot-card__sp-label-arrow--up";
      arrow.textContent = "↑";
      arrow.title = t("party.nature.title") + ": +10%";
      lab.appendChild(arrow);
    } else if (nature?.decreased === key) {
      const arrow = document.createElement("span");
      arrow.className = "slot-card__sp-label-arrow slot-card__sp-label-arrow--down";
      arrow.textContent = "↓";
      arrow.title = t("party.nature.title") + ": -10%";
      lab.appendChild(arrow);
    }
    cell.appendChild(lab);

    // Stepper row: [−] [input] [+]
    const stepper = document.createElement("div");
    stepper.className = "slot-card__sp-stepper";

    const dec = document.createElement("button");
    dec.type = "button";
    dec.className = "slot-card__sp-step";
    dec.textContent = "−";
    dec.setAttribute("aria-label", `${statShortLabel(key)} ${t("party.sp.dec")}`);
    dec.disabled = sps[i] <= 0;
    dec.addEventListener("click", () => commit(i, sps[i] - 1));

    const input = document.createElement("input");
    input.type = "number";
    input.className = "slot-card__sp-input field__control";
    input.min = "0";
    input.max = String(SP_PER_STAT_MAX);
    input.step = "1";
    input.inputMode = "numeric";
    input.value = String(sps[i] || 0);
    input.setAttribute("aria-label", statShortLabel(key));
    input.addEventListener("change", () => {
      const v = parseInt(input.value, 10);
      if (!commit(i, v)) {
        // revert on rejected change (budget exceeded)
        input.value = String(sps[i] || 0);
      }
    });

    const inc = document.createElement("button");
    inc.type = "button";
    inc.className = "slot-card__sp-step";
    inc.textContent = "+";
    inc.setAttribute("aria-label", `${statShortLabel(key)} ${t("party.sp.inc")}`);
    const headroom = maxFor(i);
    inc.disabled = sps[i] >= headroom;
    inc.addEventListener("click", () => commit(i, sps[i] + 1));

    stepper.append(dec, input, inc);
    cell.appendChild(stepper);

    // Quick MAX / 0 row
    const quick = document.createElement("div");
    quick.className = "slot-card__sp-quick";

    const maxBtn = document.createElement("button");
    maxBtn.type = "button";
    maxBtn.className = "slot-card__sp-quick-btn";
    maxBtn.textContent = "MAX";
    maxBtn.setAttribute("aria-label", `${statShortLabel(key)} ${t("party.sp.max")}`);
    maxBtn.addEventListener("click", () => commit(i, maxFor(i)));

    const zeroBtn = document.createElement("button");
    zeroBtn.type = "button";
    zeroBtn.className = "slot-card__sp-quick-btn";
    zeroBtn.textContent = "0";
    zeroBtn.setAttribute("aria-label", `${statShortLabel(key)} ${t("party.sp.zero")}`);
    zeroBtn.addEventListener("click", () => commit(i, 0));

    quick.append(maxBtn, zeroBtn);
    cell.appendChild(quick);

    grid.appendChild(cell);
  });

  wrap.appendChild(grid);

  // Effective stats preview
  const effective = effectiveStats(form.baseStats, sps, slot.nature, state.natures);
  const effTotal = effectiveStatsTotal(effective);
  const eff = document.createElement("div");
  eff.className = "slot-card__sp-effective";
  const parts = SP_STAT_KEYS.map(
    (k) => `<span><span class="muted">${statShortLabel(k)}</span> ${effective[k]}</span>`,
  );
  eff.innerHTML = `<span class="muted">${t("party.sp.effective")} (${t("party.sp.level")} 50 · IV 31, ${t("party.sp.total")} ${effTotal}):</span> ${parts.join(" · ")}`;
  wrap.appendChild(eff);

  return wrap;
}

function makeMoveSelect(index, pokemon, slot, learnable, slotPos) {
  // Render a button that opens the shared move-picker modal. The old native
  // <select> with 80+ options was slow to skim; the modal has search + type
  // / category filters and reuses the existing pokemon-picker <dialog>
  // pattern so users only learn one interaction.
  const wrap = document.createElement("div");
  wrap.className = "slot-card__field";

  const label = document.createElement("span");
  label.className = "slot-card__field-label";
  label.textContent = `${t("party.moves.slot")} ${slotPos + 1}`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "slot-card__move-btn";

  const selectedSlug = slot.moves?.[slotPos] || "";
  const selectedMove = selectedSlug ? state.moveMap.get(selectedSlug) : null;

  if (selectedMove) {
    const typeL = typeLabel(selectedMove.type);
    const catL = moveCategoryLabel(selectedMove.category || "");
    btn.innerHTML = `${moveDisplayName(selectedMove)}<span class="slot-card__move-btn-meta">· ${typeL}${catL ? " · " + catL : ""}</span>`;
  } else {
    btn.classList.add("slot-card__move-btn--empty");
    btn.textContent = t("party.moves.placeholder");
  }

  btn.addEventListener("click", () => {
    openMovePicker(index, slotPos);
  });

  wrap.append(label, btn);
  return wrap;
}

// ── move picker modal ───────────────────────────────────────
// Shared across all 6 × 4 = 24 move slots. Target is tracked on state.

function openMovePicker(slotIndex, slotPos) {
  state.movePickerTarget = { slotIndex, slotPos };
  state.movePickerQuery = "";
  // Filters persist across opens — users often apply the same filter to
  // multiple slots in a row. Click a chip again to deactivate.
  if (els.movePickerSearch) els.movePickerSearch.value = "";
  renderMovePickerChips();
  renderMovePickerList();
  if (typeof els.moveModal.showModal === "function") {
    els.moveModal.showModal();
  } else {
    els.moveModal.setAttribute("open", "");
  }
  if (els.movePickerSearch) els.movePickerSearch.focus();
}

function closeMovePicker() {
  if (typeof els.moveModal.close === "function") els.moveModal.close();
  else els.moveModal.removeAttribute("open");
  state.movePickerTarget = { slotIndex: -1, slotPos: -1 };
}

function renderMovePickerChips() {
  // Type chips
  const typeHost = els.movePickerTypeFilters;
  if (typeHost && !typeHost.dataset.built) {
    typeHost.replaceChildren();
    for (const tp of TYPE_ORDER) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `chip chip--type chip--type-${tp}`;
      chip.textContent = typeLabel(tp);
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        if (state.movePickerTypes.has(tp)) state.movePickerTypes.delete(tp);
        else state.movePickerTypes.add(tp);
        chip.setAttribute("aria-pressed", state.movePickerTypes.has(tp) ? "true" : "false");
        renderMovePickerList();
      });
      typeHost.appendChild(chip);
    }
    typeHost.dataset.built = "1";
  }
  // Sync pressed state (filters persist across opens)
  if (typeHost) {
    for (const chip of typeHost.querySelectorAll("[aria-pressed]")) {
      const tp = chip.textContent;
      // find by comparing label
      const active = [...state.movePickerTypes].some((k) => typeLabel(k) === tp);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  // Category chips (physical / special / status)
  const catHost = els.movePickerCatFilters;
  if (catHost && !catHost.dataset.built) {
    catHost.replaceChildren();
    for (const cat of ["physical", "special", "status"]) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip chip--cat";
      chip.textContent = moveCategoryLabel(cat);
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", (e) => {
        e.preventDefault();
        if (state.movePickerCats.has(cat)) state.movePickerCats.delete(cat);
        else state.movePickerCats.add(cat);
        chip.setAttribute("aria-pressed", state.movePickerCats.has(cat) ? "true" : "false");
        renderMovePickerList();
      });
      catHost.appendChild(chip);
    }
    catHost.dataset.built = "1";
  }
  if (catHost) {
    const chips = catHost.querySelectorAll("[aria-pressed]");
    const cats = ["physical", "special", "status"];
    chips.forEach((chip, i) => {
      chip.setAttribute(
        "aria-pressed",
        state.movePickerCats.has(cats[i]) ? "true" : "false",
      );
    });
  }
}

function renderMovePickerList() {
  const { slotIndex, slotPos } = state.movePickerTarget;
  const slot = state.party[slotIndex];
  if (!slot) return;
  const pokemon = state.pokemonMap.get(slot.slug);
  if (!pokemon) return;

  const learnable = (pokemon.moves || [])
    .map((s) => state.moveMap.get(s))
    .filter(Boolean);
  learnable.sort((a, b) =>
    moveDisplayName(a).localeCompare(moveDisplayName(b), getLang() === "ko" ? "ko" : "en"),
  );

  const q = (state.movePickerQuery || "").trim().toLowerCase();
  // moves selected in OTHER positions in the same slot — mark as taken
  const takenInOther = new Set(
    (slot.moves || []).filter((m, j) => m && j !== slotPos),
  );
  const currentPick = slot.moves?.[slotPos] || "";

  const frag = document.createDocumentFragment();
  let shown = 0;
  for (const m of learnable) {
    if (state.movePickerTypes.size && !state.movePickerTypes.has(m.type)) continue;
    if (state.movePickerCats.size && !state.movePickerCats.has(m.category)) continue;
    if (q) {
      const hay = [
        m.slug,
        m.nameKo || "",
        m.nameEn || "",
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) continue;
    }
    shown++;
    const isTaken = takenInOther.has(m.slug);
    const isCurrent = m.slug === currentPick;

    const row = document.createElement("button");
    row.type = "button";
    row.className = "picker-row picker-row--move";
    if (isTaken) row.classList.add("picker-row--taken");
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", isCurrent ? "true" : "false");
    if (isTaken) row.setAttribute("aria-disabled", "true");

    // Line 1: name + type badge + category pill + pwr/acc/pp
    const main = document.createElement("div");
    main.className = "picker-row__main";

    const name = document.createElement("span");
    name.className = "picker-row__name";
    name.textContent = moveDisplayName(m);
    if (m.updatedInChampions) {
      const badge = document.createElement("span");
      badge.className = "picker-row__champions";
      badge.textContent = "★";
      badge.title = t("moves.championsBadgeTitle");
      name.appendChild(badge);
    }

    const typeBadge = document.createElement("span");
    typeBadge.className = `type type--${m.type}`;
    typeBadge.textContent = typeLabel(m.type);

    const catBadge = document.createElement("span");
    catBadge.className = `picker-row__cat picker-row__cat--${m.category || "status"}`;
    catBadge.textContent = moveCategoryLabel(m.category || "status");

    const nums = document.createElement("span");
    nums.className = "picker-row__num";
    const pwr = m.power == null ? "—" : m.power;
    const acc = m.accuracy == null ? "—" : m.accuracy;
    const pp = m.pp == null ? "—" : m.pp;
    nums.textContent = `${pwr} / ${acc} / ${pp}`;
    nums.title = `${t("detail.move.power")} / ${t("detail.move.accuracy")} / ${t("detail.move.pp")}`;

    main.append(name, typeBadge, catBadge, nums);

    if (isTaken) {
      const tag = document.createElement("span");
      tag.className = "picker-row__taken";
      tag.textContent = t("party.movePicker.alreadyUsed");
      main.appendChild(tag);
    }

    row.appendChild(main);

    // Line 2: flavor text (Champions/PokeAPI short description) — muted,
    // 2-line ellipsis. Shown so the user doesn't have to open another page
    // to know what a move does.
    const flavorKo = m.flavorTextKo || "";
    const flavorEn = m.flavorTextEn || "";
    const flavor = getLang() === "ko" ? (flavorKo || flavorEn) : (flavorEn || flavorKo);
    if (flavor) {
      const desc = document.createElement("span");
      desc.className = "picker-row__flavor";
      desc.textContent = flavor;
      row.appendChild(desc);
    }

    if (!isTaken) {
      row.addEventListener("click", () => pickMove(m.slug));
    }

    frag.appendChild(row);
  }
  els.movePickerList.replaceChildren(frag);
  els.movePickerEmpty.hidden = shown > 0;
}

function pickMove(moveSlug) {
  const { slotIndex, slotPos } = state.movePickerTarget;
  const current = state.party[slotIndex];
  if (!current) return;
  const moves = [...(current.moves || [])];
  // Ensure array has slotPos entries
  while (moves.length < slotPos) moves.push("");
  moves[slotPos] = moveSlug;
  // Trim trailing empties
  while (moves.length && !moves[moves.length - 1]) moves.pop();
  state.party[slotIndex] = { ...current, moves };
  closeMovePicker();
  writePartyToUrl();
  renderAll();
}

// Clear a single move slot (invoked from the "None" quick action row in the
// modal — added as the first row when the current slot has a pick).
function clearMoveSlot() {
  const { slotIndex, slotPos } = state.movePickerTarget;
  const current = state.party[slotIndex];
  if (!current) return;
  const moves = [...(current.moves || [])];
  if (slotPos < moves.length) moves[slotPos] = "";
  while (moves.length && !moves[moves.length - 1]) moves.pop();
  state.party[slotIndex] = { ...current, moves };
  closeMovePicker();
  writePartyToUrl();
  renderAll();
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
    state.party[index] = applyMegaStoneLock({
      ...slot,
      formName: newForm.name,
      // Reset ability to first of new form if current is not valid
      abilitySlug: newForm.abilities.includes(slot.abilitySlug)
        ? slot.abilitySlug
        : newForm.abilities[0],
    });
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
  // Mega forms lock the item to their corresponding stone. applyMegaStoneLock
  // already forces the value; here we just disable the control so the user
  // can't change it.
  const lockedStone = megaStoneForForm(slot.formName);
  if (lockedStone) {
    sel.disabled = true;
    sel.title = t("party.megaStoneLocked");
    wrap.classList.add("slot-card__field--locked");
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
  const newSlot = applyMegaStoneLock({
    slug: p.slug,
    formName: form.name,
    abilitySlug: form.abilities[0] || "",
    itemSlug: null,
    moves: [],
    sps: emptySps(),
    nature: null,
  });
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
  const hasAny = state.party.some((x) => x);
  if (hasAny) params.set("p", encoded);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  if (els.aiPrompts) {
    if (hasAny) {
      els.aiPrompts.href = `./prompts.html${qs ? `?${qs}` : ""}`;
      els.aiPrompts.removeAttribute("aria-disabled");
      els.aiPrompts.removeAttribute("title");
    } else {
      els.aiPrompts.removeAttribute("href");
      els.aiPrompts.setAttribute("aria-disabled", "true");
      els.aiPrompts.setAttribute("title", t("party.aiPromptsDisabledHint"));
    }
  }
}

function readPartyFromUrl() {
  const params = new URLSearchParams(location.search);
  const encoded = params.get("p");
  if (!encoded) return;
  const decoded = decodeParty(encoded, decodeCtx());
  // Auto-correct older URLs where a mega form slot held something other than
  // its required mega stone. Avoids the "Mega Charizard X with leftovers"
  // inconsistency showing up in the UI.
  state.party = decoded.map((s) => (s ? applyMegaStoneLock(s) : s));
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

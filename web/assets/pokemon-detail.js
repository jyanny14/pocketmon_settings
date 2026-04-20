import {
  loadPokemon,
  loadAbilities,
  loadMoves,
  formatDex,
  statTotal,
  typeLabel,
  obtainLabel,
  formDisplayName,
  abilityDisplayName,
  abilityGameText,
  moveDisplayName,
  moveCategoryLabel,
  getLang,
  t,
} from "./app.js";

const STAT_KEYS = ["hp", "atk", "def", "spAtk", "spDef", "speed"];
const STAT_MAX = 255; // reference max for bar width

const root = document.getElementById("detail-root");

async function init() {
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) {
    root.innerHTML = `<p class="empty-state">${t("detail.notFound")}</p>`;
    return;
  }

  let pokemon, allAbilities, allMoves;
  try {
    const [pokemonList, abilityList, moveList] = await Promise.all([
      loadPokemon(),
      loadAbilities(),
      loadMoves().catch(() => []),
    ]);
    pokemon = pokemonList.find((p) => p.slug === slug);
    allAbilities = new Map(abilityList.map((a) => [a.slug, a]));
    allMoves = new Map((moveList || []).map((m) => [m.slug, m]));
  } catch (err) {
    root.innerHTML = `<p class="empty-state">${t("error.loadFailed")}: ${err.message}</p>`;
    return;
  }

  if (!pokemon) {
    root.innerHTML = `<p class="empty-state">${t("detail.notFound")}</p>`;
    return;
  }

  document.title = `${pokemon.nameKo} (${pokemon.nameEn}) · Pokemon Champions`;
  root.replaceChildren(renderDetail(pokemon, allAbilities, allMoves));
}

// ── main layout ──────────────────────────────────────────────

function renderDetail(p, allAbilities, allMoves) {
  const wrap = document.createElement("div");
  wrap.className = "poke-detail";

  // Back link
  const back = document.createElement("a");
  back.href = "./pokemon.html";
  back.className = "poke-detail__back";
  back.textContent = `← ${t("detail.backToList")}`;

  // Hero section
  const hero = document.createElement("div");
  hero.className = "poke-detail__hero";

  const sprite = document.createElement("img");
  sprite.className = "poke-detail__sprite";
  sprite.src = p.spritePath || "";
  sprite.alt = `${p.nameKo} (${p.nameEn})`;
  if (!p.spritePath) sprite.style.visibility = "hidden";

  const info = document.createElement("div");
  info.className = "poke-detail__info";

  const dex = document.createElement("p");
  dex.className = "poke-detail__dex";
  dex.textContent = formatDex(p.number);

  const nameKo = document.createElement("h1");
  nameKo.className = "poke-detail__name-ko";
  nameKo.textContent = p.nameKo || p.nameEn;

  const nameEn = document.createElement("p");
  nameEn.className = "poke-detail__name-en";
  nameEn.textContent = p.nameEn;

  const types = document.createElement("div");
  types.className = "poke-detail__types";
  for (const tt of p.types ?? []) {
    const badge = document.createElement("span");
    badge.className = `type type--${tt}`;
    badge.textContent = typeLabel(tt);
    types.appendChild(badge);
  }

  const obtainWrap = document.createElement("div");
  obtainWrap.className = "poke-detail__obtain";
  for (const o of p.obtain ?? []) {
    const badge = document.createElement("span");
    badge.className = `obtain obtain--${o}`;
    badge.textContent = obtainLabel(o);
    obtainWrap.appendChild(badge);
  }

  info.append(dex, nameKo, nameEn, types, obtainWrap);
  hero.append(sprite, info);

  // Base stats
  const statsSection = renderStatsSection(
    t("detail.baseStats"),
    p.baseStats,
  );

  // Abilities
  const abilitiesSection = renderAbilitiesSection(p.abilities, allAbilities);

  // Forms
  let formsSection = null;
  if (p.forms?.length > 1) {
    formsSection = renderFormsSection(p.forms, allAbilities);
  }

  wrap.append(back, hero, statsSection, abilitiesSection);
  if (formsSection) wrap.appendChild(formsSection);

  if (p.moves?.length) {
    wrap.appendChild(renderMovesSection(p.moves, allMoves));
  }

  return wrap;
}

// ── moves ────────────────────────────────────────────────────

function renderMovesSection(moveSlugs, allMoves) {
  const section = document.createElement("section");
  section.className = "poke-detail__section";

  const heading = document.createElement("h2");
  heading.className = "poke-detail__section-title";
  heading.textContent = `${t("detail.moves")} (${moveSlugs.length})`;
  section.appendChild(heading);

  const controls = document.createElement("div");
  controls.className = "moves-controls";
  const search = document.createElement("input");
  search.type = "search";
  search.className = "moves-search";
  search.placeholder = t("detail.movesSearch");
  controls.appendChild(search);
  section.appendChild(controls);

  const table = document.createElement("table");
  table.className = "moves-table";
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th data-i18n="detail.move.name">기술</th>
      <th data-i18n="detail.move.type">타입</th>
      <th data-i18n="detail.move.category">분류</th>
      <th data-i18n="detail.move.power">위력</th>
      <th data-i18n="detail.move.accuracy">명중</th>
      <th data-i18n="detail.move.pp">PP</th>
    </tr>`;
  // translate headers manually since this is dynamic
  thead.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const rows = [];
  for (const slug of moveSlugs) {
    const m = allMoves.get(slug);
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = m ? moveDisplayName(m) : slug;
    nameCell.title = m?.flavorTextKo || m?.flavorTextEn || "";

    const typeCell = document.createElement("td");
    if (m?.type) {
      const badge = document.createElement("span");
      badge.className = `type type--${m.type}`;
      badge.textContent = typeLabel(m.type);
      typeCell.appendChild(badge);
    }

    const catCell = document.createElement("td");
    catCell.textContent = m?.category ? moveCategoryLabel(m.category) : "";

    const powerCell = document.createElement("td");
    powerCell.textContent = m?.power ?? "—";
    powerCell.className = "moves-num";

    const accCell = document.createElement("td");
    accCell.textContent = m?.accuracy ?? "—";
    accCell.className = "moves-num";

    const ppCell = document.createElement("td");
    ppCell.textContent = m?.pp ?? "—";
    ppCell.className = "moves-num";

    row.append(nameCell, typeCell, catCell, powerCell, accCell, ppCell);
    tbody.appendChild(row);
    rows.push({ row, name: (m ? moveDisplayName(m) : slug).toLowerCase(), nameEn: (m?.nameEn || slug).toLowerCase(), type: m?.type || "" });
  }
  table.appendChild(tbody);
  section.appendChild(table);

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    for (const r of rows) {
      const hit = !q || r.name.includes(q) || r.nameEn.includes(q) || r.type.includes(q);
      r.row.style.display = hit ? "" : "none";
    }
  });

  return section;
}

// ── stats bar chart ──────────────────────────────────────────

function renderStatsSection(title, stats) {
  const section = document.createElement("section");
  section.className = "poke-detail__section";

  const heading = document.createElement("h2");
  heading.className = "poke-detail__section-title";
  heading.textContent = title;

  const table = document.createElement("div");
  table.className = "stat-chart";

  for (const key of STAT_KEYS) {
    const val = stats?.[key] ?? 0;
    const row = document.createElement("div");
    row.className = "stat-chart__row";

    const label = document.createElement("span");
    label.className = "stat-chart__label";
    label.textContent = t("stat." + key);

    const barWrap = document.createElement("div");
    barWrap.className = "stat-chart__bar-wrap";

    const bar = document.createElement("div");
    bar.className = "stat-chart__bar";
    const pct = Math.min((val / STAT_MAX) * 100, 100);
    bar.style.width = pct + "%";
    bar.classList.add(statColorClass(val));

    barWrap.appendChild(bar);

    const num = document.createElement("span");
    num.className = "stat-chart__value";
    num.textContent = val;

    row.append(label, barWrap, num);
    table.appendChild(row);
  }

  // Total row
  const totalRow = document.createElement("div");
  totalRow.className = "stat-chart__row stat-chart__row--total";
  const totalLabel = document.createElement("span");
  totalLabel.className = "stat-chart__label";
  totalLabel.textContent = t("pokemon.statTotal");
  const totalSpacer = document.createElement("div");
  totalSpacer.className = "stat-chart__bar-wrap";
  const totalNum = document.createElement("span");
  totalNum.className = "stat-chart__value";
  totalNum.textContent = statTotal(stats);
  totalRow.append(totalLabel, totalSpacer, totalNum);
  table.appendChild(totalRow);

  section.append(heading, table);
  return section;
}

function statColorClass(val) {
  if (val >= 150) return "stat-chart__bar--excellent";
  if (val >= 100) return "stat-chart__bar--good";
  if (val >= 60) return "stat-chart__bar--average";
  return "stat-chart__bar--low";
}

// ── abilities ────────────────────────────────────────────────

function renderAbilitiesSection(abilitySlugs, allAbilities) {
  const section = document.createElement("section");
  section.className = "poke-detail__section";

  const heading = document.createElement("h2");
  heading.className = "poke-detail__section-title";
  heading.textContent = t("detail.abilities");

  const list = document.createElement("div");
  list.className = "ability-list";

  for (const slug of abilitySlugs ?? []) {
    const ability = allAbilities.get(slug);
    const item = document.createElement("a");
    item.className = "ability-list__item";
    const queryHint = ability ? abilityDisplayName(ability) : slug;
    item.href = `./abilities.html?q=${encodeURIComponent(queryHint)}`;

    const name = document.createElement("span");
    name.className = "ability-list__name";
    name.textContent = ability ? abilityDisplayName(ability) : slug;

    const desc = document.createElement("span");
    desc.className = "ability-list__desc";
    desc.textContent = abilityGameText(ability);

    item.append(name, desc);
    list.appendChild(item);
  }

  section.append(heading, list);
  return section;
}

// ── forms ────────────────────────────────────────────────────

function renderFormsSection(forms, allAbilities) {
  const section = document.createElement("section");
  section.className = "poke-detail__section";

  const heading = document.createElement("h2");
  heading.className = "poke-detail__section-title";
  heading.textContent = `${t("detail.forms")} (${forms.length})`;

  const grid = document.createElement("div");
  grid.className = "form-grid";

  for (const form of forms) {
    grid.appendChild(renderFormCard(form, allAbilities));
  }

  section.append(heading, grid);
  return section;
}

function renderFormCard(form, allAbilities) {
  const card = document.createElement("div");
  card.className = "form-card";

  const name = document.createElement("h3");
  name.className = "form-card__name";
  name.textContent = formDisplayName(form);

  const types = document.createElement("div");
  types.className = "form-card__types";
  for (const tt of form.types ?? []) {
    const badge = document.createElement("span");
    badge.className = `type type--${tt}`;
    badge.textContent = typeLabel(tt);
    types.appendChild(badge);
  }

  const abilities = document.createElement("div");
  abilities.className = "form-card__abilities";
  const abLabel = document.createElement("span");
  abLabel.className = "form-card__ab-label";
  abLabel.textContent = t("detail.abilities") + ":";
  abilities.appendChild(abLabel);
  for (const slug of form.abilities ?? []) {
    const ab = allAbilities.get(slug);
    const tag = document.createElement("a");
    tag.className = "form-card__ab-tag";
    const display = ab ? abilityDisplayName(ab) : slug;
    tag.href = `./abilities.html?q=${encodeURIComponent(display)}`;
    tag.textContent = display;
    abilities.appendChild(tag);
  }

  const stats = renderMiniStats(form.baseStats);

  card.append(name, types, abilities, stats);
  return card;
}

function renderMiniStats(stats) {
  const wrap = document.createElement("div");
  wrap.className = "mini-stats";
  for (const key of STAT_KEYS) {
    const val = stats?.[key] ?? 0;
    const cell = document.createElement("div");
    cell.className = "mini-stats__cell";

    const label = document.createElement("span");
    label.className = "mini-stats__label";
    label.textContent = t("stat." + key);

    const num = document.createElement("span");
    num.className = "mini-stats__value";
    num.textContent = val;

    cell.append(label, num);
    wrap.appendChild(cell);
  }
  // Total
  const totalCell = document.createElement("div");
  totalCell.className = "mini-stats__cell mini-stats__cell--total";
  const totalLabel = document.createElement("span");
  totalLabel.className = "mini-stats__label";
  totalLabel.textContent = t("pokemon.statTotal");
  const totalVal = document.createElement("span");
  totalVal.className = "mini-stats__value";
  totalVal.textContent = statTotal(stats);
  totalCell.append(totalLabel, totalVal);
  wrap.appendChild(totalCell);

  return wrap;
}

init();

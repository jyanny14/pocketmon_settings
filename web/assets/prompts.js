import {
  loadPokemon,
  loadAbilities,
  loadItems,
  loadMoves,
  findForm,
  formDisplayName,
  t,
} from "./app.js";
import { decodeParty } from "./party-encode.js";
import { TEMPLATES } from "./prompts-templates.js";

const state = {
  pokemonMap: new Map(),
  abilityMap: new Map(),
  itemMap: new Map(),
  moveMap: new Map(),
  items: [],
  party: [],
};

const els = {
  summary: document.getElementById("party-summary"),
  cards: document.getElementById("prompt-cards"),
  backToParty: document.getElementById("back-to-party"),
};

async function init() {
  try {
    const [pokemon, abilities, items, moves] = await Promise.all([
      loadPokemon(),
      loadAbilities(),
      loadItems(),
      loadMoves(),
    ]);
    for (const p of pokemon) state.pokemonMap.set(p.slug, p);
    for (const a of abilities) state.abilityMap.set(a.slug, a);
    for (const it of items) state.itemMap.set(it.slug, it);
    for (const m of moves) state.moveMap.set(m.slug, m);
    state.items = items;
  } catch (err) {
    els.cards.innerHTML = `<p class="empty-state">${t("prompts.loadError")}: ${err.message}</p>`;
    return;
  }

  const params = new URLSearchParams(location.search);
  const encoded = params.get("p") || "";
  state.party = decodeParty(encoded, { pokemonMap: state.pokemonMap, items: state.items });

  const backQuery = encoded ? `?p=${encoded}` : "";
  els.backToParty.href = `./party.html${backQuery}`;

  renderSummary();
  renderCards();
}

// ── data extraction ──────────────────────────────────────────

function extractSlot(slot) {
  if (!slot) return null;
  const p = state.pokemonMap.get(slot.slug);
  if (!p) return null;
  const form = findForm(p, slot.formName) || p.forms[0];
  const ability = state.abilityMap.get(slot.abilitySlug) || null;
  const item = slot.itemSlug ? state.itemMap.get(slot.itemSlug) || null : null;

  const learnableMoves = (p.moves || [])
    .map((slug) => state.moveMap.get(slug))
    .filter(Boolean)
    .map((m) => {
      const out = {
        slug: m.slug,
        nameKo: m.nameKo,
        nameEn: m.nameEn,
        type: m.type,
        category: m.category,
        power: m.power,
        accuracy: m.accuracy,
        pp: m.pp,
      };
      if (m.updatedInChampions) out.updatedInChampions = true;
      return out;
    });

  return {
    slug: slot.slug,
    dex: p.number,
    nameKo: p.nameKo,
    nameEn: p.nameEn,
    form: {
      name: form.name,
      nameKo: form.nameKo,
      types: form.types,
      baseStats: form.baseStats,
      abilities: form.abilities,
    },
    ability: ability
      ? {
          slug: ability.slug,
          nameKo: ability.nameKo,
          nameEn: ability.nameEn,
          description: ability.gameTextKo || ability.gameText || ability.description || "",
          ...(ability.isNewInChampions ? { isNewInChampions: true } : {}),
        }
      : null,
    item: item
      ? {
          slug: item.slug,
          nameKo: item.nameKo,
          nameEn: item.nameEn,
          effect: item.effect,
        }
      : null,
    learnableMoves,
  };
}

function buildInlineJson() {
  const slots = state.party.map(extractSlot).filter(Boolean);
  return JSON.stringify(slots, null, 2);
}

// ── URLs ─────────────────────────────────────────────────────

function currentUrls() {
  const params = new URLSearchParams(location.search);
  const pq = params.get("p") ? `?p=${params.get("p")}` : "";
  return {
    partyUrl: new URL(`./party.html${pq}`, location.href).href,
    llmsUrl: new URL("./llms.txt", location.href).href,
    pokemonJsonUrl: new URL("./data/pokemon.json", location.href).href,
  };
}

function substitute(body, { includeData }) {
  const u = currentUrls();
  const inline = includeData ? buildInlineJson() : t("prompts.urlOnlyHint");
  return body
    .replaceAll("{{PARTY_URL}}", u.partyUrl)
    .replaceAll("{{LLMS_TXT_URL}}", u.llmsUrl)
    .replaceAll("{{POKEMON_JSON_URL}}", u.pokemonJsonUrl)
    .replaceAll("{{PARTY_INLINE_JSON}}", inline);
}

// ── render ───────────────────────────────────────────────────

function renderSummary() {
  const filled = state.party.filter(Boolean);
  if (filled.length === 0) {
    els.summary.innerHTML = `<p class="prompts-summary__empty">${t("prompts.emptyBefore")} <a href="./party.html">${t("prompts.emptyLink")}</a>${t("prompts.emptyAfter")}</p>`;
    return;
  }
  els.summary.innerHTML = filled
    .map((s) => {
      const p = state.pokemonMap.get(s.slug);
      if (!p) return "";
      const form = findForm(p, s.formName) || p.forms[0];
      const sprite = form.spritePath || p.spritePath;
      const name = formDisplayName(form) || p.nameKo || p.nameEn;
      return `<span class="prompts-summary__chip"><img src="./${sprite}" alt="" loading="lazy" />${name}</span>`;
    })
    .join("");
}

function renderCards() {
  const hasParty = state.party.some(Boolean);
  els.cards.innerHTML = "";
  for (const tpl of TEMPLATES) {
    const card = document.createElement("article");
    card.className = "card prompt-card";
    const title = t(tpl.titleKey);
    const desc = t(tpl.descKey);
    card.innerHTML = `
      <h2 class="card__title">${title}${
        tpl.requiresPokemonPool
          ? `<span class="prompt-card__tag">${t("prompts.fetchRequired")}</span>`
          : ""
      }</h2>
      <p class="card__desc">${desc}</p>
      <pre class="prompt-card__preview" aria-label="${t("prompts.previewAria")}"></pre>
      <div class="prompt-card__actions">
        <button type="button" class="button" data-action="copy-url">${t("prompts.copyUrlOnly")}</button>
        <button type="button" class="button button--primary" data-action="copy-full">${t("prompts.copyWithData")}</button>
      </div>
    `;
    const pre = card.querySelector(".prompt-card__preview");
    const btnUrl = card.querySelector('[data-action="copy-url"]');
    const btnFull = card.querySelector('[data-action="copy-full"]');

    // Preview = full variant (including inline JSON) so the user sees the heaviest case.
    pre.textContent = substitute(tpl.body, { includeData: hasParty });

    btnUrl.addEventListener("click", () => {
      copyToClipboard(substitute(tpl.body, { includeData: false }), btnUrl);
    });
    btnFull.addEventListener("click", () => {
      if (!hasParty) {
        alert(t("prompts.emptyCantCopy"));
        return;
      }
      copyToClipboard(substitute(tpl.body, { includeData: true }), btnFull);
    });

    els.cards.appendChild(card);
  }
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = t("prompts.copied");
    setTimeout(() => (btn.textContent = original), 1500);
  } catch {
    prompt(t("prompts.copyFallbackHint"), text);
  }
}

init();

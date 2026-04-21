import {
  loadPokemon,
  loadAbilities,
  loadItems,
  loadMoves,
  findForm,
  formDisplayName,
  t,
  getLang,
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
  mode: localStorage.getItem("battleMode") === "double" ? "double" : "single",
};

const els = {
  summary: document.getElementById("party-summary"),
  cards: document.getElementById("prompt-cards"),
  backToParty: document.getElementById("back-to-party"),
  dataBundleButton: document.getElementById("data-bundle-download"),
  modeToggle: document.getElementById("mode-toggle"),
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
    showFatal(`${t("prompts.loadError")}: ${err.message}`);
    return;
  }

  try {
    const params = new URLSearchParams(location.search);
    const encoded = params.get("p") || "";
    state.party = decodeParty(encoded, { pokemonMap: state.pokemonMap, items: state.items });

    const backQuery = encoded ? `?p=${encoded}` : "";
    if (els.backToParty) els.backToParty.href = `./party.html${backQuery}`;

    renderSummary();
    renderCards();
    wireDataBundleButton();
    wireModeToggle();
  } catch (err) {
    console.error("prompts render failed:", err);
    showFatal(`렌더링 오류: ${err.message}\n${err.stack || ""}`);
  }
}

function showFatal(msg) {
  const host = els.cards || document.getElementById("main") || document.body;
  const div = document.createElement("pre");
  div.style.cssText = "background:#400;color:#fff;padding:1rem;border-radius:6px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:.85rem;";
  div.textContent = msg;
  host.innerHTML = "";
  host.appendChild(div);
}

// ── data extraction ──────────────────────────────────────────

function extractSlot(slot) {
  if (!slot) return null;
  const p = state.pokemonMap.get(slot.slug);
  if (!p) return null;
  const form = findForm(p, slot.formName) || p.forms[0];
  const ability = state.abilityMap.get(slot.abilitySlug) || null;
  const item = slot.itemSlug ? state.itemMap.get(slot.itemSlug) || null : null;

  // Emit only the current UI language's display fields so the inline JSON
  // matches the language-filtered data bundle. Without this the AI tends to
  // anchor on English names even in Korean prompts. `form.name` stays — it's
  // an English functional identifier, not a display name.
  const isKo = getLang() === "ko";
  const pickName = (koVal, enVal) =>
    isKo ? { nameKo: koVal || enVal } : { nameEn: enVal || koVal };

  // Only the 4 configured moves are expanded inline. The full learnable pool
  // is intentionally omitted — any template that needs it tells the AI to
  // fetch pokemon.json + moves.json instead. Without this change the inline
  // JSON ballooned to ~60KB for a 6-slot party.
  const configuredMoves = (Array.isArray(slot.moves) ? slot.moves : [])
    .map((s) => {
      const m = state.moveMap.get(s);
      if (!m) return { slug: s };
      const out = {
        slug: m.slug,
        ...pickName(m.nameKo, m.nameEn),
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
    ...pickName(p.nameKo, p.nameEn),
    form: {
      name: form.name, // English functional id — required to distinguish forms
      ...(isKo && form.nameKo ? { nameKo: form.nameKo } : {}),
      types: form.types,
      baseStats: form.baseStats,
      abilities: form.abilities,
    },
    ability: ability
      ? {
          slug: ability.slug,
          ...pickName(ability.nameKo, ability.nameEn),
          ...(isKo
            ? { gameTextKo: ability.gameTextKo || ability.gameText || ability.description || "" }
            : { gameText: ability.gameText || ability.description || "" }),
          ...(ability.isNewInChampions ? { isNewInChampions: true } : {}),
        }
      : null,
    item: item
      ? {
          slug: item.slug,
          ...pickName(item.nameKo, item.nameEn),
          ...(isKo
            ? { effectKo: item.effectKo || item.effect || "" }
            : { effect: item.effect || "" }),
        }
      : null,
    moves: configuredMoves,
    sps: Array.isArray(slot.sps) ? slot.sps : [0, 0, 0, 0, 0, 0],
    nature: slot.nature || null,
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
    movesJsonUrl: new URL("./data/moves.json", location.href).href,
    itemsJsonUrl: new URL("./data/items.json", location.href).href,
    abilitiesJsonUrl: new URL("./data/abilities.json", location.href).href,
    pokemonRefUrl: new URL("./reference/pokemon.html", location.href).href,
    movesRefUrl: new URL("./reference/moves.html", location.href).href,
    abilitiesRefUrl: new URL("./reference/abilities.html", location.href).href,
    itemsRefUrl: new URL("./reference/items.html", location.href).href,
    dataBundlePageUrl: new URL("./prompts.html", location.href).href,
  };
}

// Template bodies are keyed by language — pick the one that matches the
// current UI toggle so AI conversations happen in the user's language.
// Battle mode adds a "Double" suffix — falls back to the single-mode body
// if a template doesn't define a double-mode variant.
function resolveBody(bodySpec) {
  if (typeof bodySpec === "string") return bodySpec; // legacy single-string fallback
  const lang = getLang();
  const suffix = state.mode === "double" ? "Double" : "";
  const modeKey = `${lang}${suffix}`;
  return bodySpec[modeKey] || bodySpec[lang] || bodySpec.ko || bodySpec.en || "";
}

function substitute(bodySpec, { includeData }) {
  const body = resolveBody(bodySpec);
  const u = currentUrls();
  const inline = includeData ? buildInlineJson() : t("prompts.urlOnlyHint");
  const filled = state.party.filter(Boolean).length;
  const empty = state.party.length - filled;
  return body
    .replaceAll("{{PARTY_URL}}", u.partyUrl)
    .replaceAll("{{LLMS_TXT_URL}}", u.llmsUrl)
    .replaceAll("{{POKEMON_JSON_URL}}", u.pokemonJsonUrl)
    .replaceAll("{{MOVES_JSON_URL}}", u.movesJsonUrl)
    .replaceAll("{{ITEMS_JSON_URL}}", u.itemsJsonUrl)
    .replaceAll("{{ABILITIES_JSON_URL}}", u.abilitiesJsonUrl)
    .replaceAll("{{POKEMON_REF_URL}}", u.pokemonRefUrl)
    .replaceAll("{{MOVES_REF_URL}}", u.movesRefUrl)
    .replaceAll("{{ABILITIES_REF_URL}}", u.abilitiesRefUrl)
    .replaceAll("{{ITEMS_REF_URL}}", u.itemsRefUrl)
    .replaceAll("{{DATA_BUNDLE_PAGE_URL}}", u.dataBundlePageUrl)
    .replaceAll("{{PARTY_INLINE_JSON}}", inline)
    .replaceAll("{{FILLED_COUNT}}", String(filled))
    .replaceAll("{{EMPTY_COUNT}}", String(empty));
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
  // Templates with `mode: "double"` only show in double mode. Anything else
  // (undefined / "both") shows in both modes — the body itself branches via
  // resolveBody above.
  const visible = TEMPLATES.filter(
    (t) => t.mode !== "double" || state.mode === "double",
  );
  for (const tpl of visible) {
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
      <div class="prompt-card__actions">
        <button type="button" class="button button--primary" data-action="copy-full">${t("prompts.copyWithData")}</button>
        <button type="button" class="button" data-action="copy-url">${t("prompts.copyUrlOnly")}</button>
      </div>
      <details class="prompt-card__preview-wrap">
        <summary class="prompt-card__toggle">${t("prompts.previewToggle")}</summary>
        <p class="prompt-card__hint">${t("prompts.previewHint")}</p>
        <pre class="prompt-card__preview" aria-label="${t("prompts.previewAria")}"></pre>
      </details>
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

// ── data bundle download ─────────────────────────────────────
// The bundle is a wrapped copy of /data/corpus.json with a short _readme
// header so AI agents that receive the file immediately know what it is.

function wireDataBundleButton() {
  if (!els.dataBundleButton) return;
  els.dataBundleButton.addEventListener("click", downloadDataBundle);
}

// ── battle mode toggle ──────────────────────────────────────
// Single ↔ double changes which body variant resolveBody picks and whether
// double-only templates render. Persist in localStorage so the choice sticks
// across reloads and shared party-URL trips.

function wireModeToggle() {
  if (!els.modeToggle) return;
  syncModeToggleUI();
  els.modeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    const next = btn.dataset.mode === "double" ? "double" : "single";
    if (next === state.mode) return;
    state.mode = next;
    localStorage.setItem("battleMode", next);
    syncModeToggleUI();
    renderCards();
  });
}

function syncModeToggleUI() {
  if (!els.modeToggle) return;
  for (const btn of els.modeToggle.querySelectorAll("[data-mode]")) {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle("mode-toggle__opt--active", active);
    btn.setAttribute("aria-checked", active ? "true" : "false");
  }
}

// Fields to drop based on current UI language. Slugs and functional
// identifiers (e.g. form.name, which the URL encoder relies on) are
// never dropped — only the "human-readable name/text" fields for the
// language the user didn't pick.
const LANG_DROP_FIELDS = {
  ko: ["nameEn", "gameText", "description", "flavorText", "effect"],
  en: ["nameKo", "gameTextKo", "descriptionKo", "flavorTextKo", "effectKo"],
};
const FORM_DROP_FIELDS = {
  ko: [], // keep form.name (English functional id) + form.nameKo (Korean)
  en: ["nameKo"], // drop Korean form name
};

function stripFields(obj, fields) {
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (fields.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

function filterCorpusByLang(corpus, lang) {
  const drop = LANG_DROP_FIELDS[lang] || [];
  const formDrop = FORM_DROP_FIELDS[lang] || [];

  const stripPokemon = (p) => {
    const q = stripFields(p, drop);
    if (Array.isArray(q.forms)) q.forms = q.forms.map((f) => stripFields(f, formDrop));
    return q;
  };

  return {
    ...corpus,
    pokemon: (corpus.pokemon || []).map(stripPokemon),
    moves: (corpus.moves || []).map((m) => stripFields(m, drop)),
    abilities: (corpus.abilities || []).map((a) => stripFields(a, drop)),
    items: (corpus.items || []).map((i) => stripFields(i, drop)),
    natures: (corpus.natures || []).map((n) => stripFields(n, drop)),
  };
}

function bundleReadme(lang) {
  if (lang === "en") {
    return [
      "Pokémon Champions full dataset (ground truth).",
      "Any Pokémon/ability/item/move whose slug is not in this file does not exist in Champions.",
      "AI agents: use this JSON as the source of truth instead of prior knowledge.",
      "Keys: pokemon(186), moves(481), abilities(192), items(117), natures(25), type_chart(18x18).",
      "Language: English fields only (name/gameText/description/flavorText/effect). slugs remain English identifiers.",
    ].join(" ");
  }
  return [
    "Pokémon Champions 전체 데이터 (ground truth).",
    "이 파일의 slug 바깥에 있는 포켓몬·특성·도구·기술은 Champions 에 존재하지 않습니다.",
    "AI 에이전트: 사전 지식 대신 이 JSON 을 진실의 소스로 사용하세요.",
    "키: pokemon(186), moves(481), abilities(192), items(117), natures(25), type_chart(18x18 상성).",
    "언어: 한국어 필드만 포함 (nameKo/gameTextKo/descriptionKo/flavorTextKo/effectKo). slug 은 영어 식별자 그대로.",
  ].join(" ");
}

async function downloadDataBundle() {
  const btn = els.dataBundleButton;
  const original = btn.textContent;
  const lang = getLang();
  try {
    const res = await fetch(new URL("./data/corpus.json", location.href), { cache: "no-cache" });
    if (!res.ok) throw new Error(`corpus.json ${res.status}`);
    const corpus = await res.json();

    const filtered = filterCorpusByLang(corpus, lang);
    const wrapper = {
      _readme: bundleReadme(lang),
      _language: lang,
      _generatedAt: corpus?.manifest?.generatedAt || null,
      _source: "https://jyanny14.github.io/pocketmon_settings/data/corpus.json",
      ...filtered,
    };

    const blob = new Blob([JSON.stringify(wrapper, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `champions-data-${lang}-${isoDate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    btn.textContent = t("prompts.dataBundleReady");
    setTimeout(() => (btn.textContent = original), 1800);
  } catch (err) {
    console.error("data bundle download failed:", err);
    btn.textContent = t("prompts.dataBundleError");
    setTimeout(() => (btn.textContent = original), 2500);
  }
}

function isoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
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

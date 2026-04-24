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
import {
  TEMPLATES,
  DETAILED_RULES_KO,
  DETAILED_RULES_EN,
  DETAILED_RULES_JA,
  DETAILED_RULES_ZH,
  FOOTER_FALLBACK_KO,
  FOOTER_FALLBACK_EN,
  FOOTER_FALLBACK_JA,
  FOOTER_FALLBACK_ZH,
} from "./prompts-templates.js";

const DETAILED_RULES_BY_LANG = {
  ko: DETAILED_RULES_KO,
  en: DETAILED_RULES_EN,
  ja: DETAILED_RULES_JA,
  zh: DETAILED_RULES_ZH,
};

const FOOTER_FALLBACK_BY_LANG = {
  ko: FOOTER_FALLBACK_KO,
  en: FOOTER_FALLBACK_EN,
  ja: FOOTER_FALLBACK_JA,
  zh: FOOTER_FALLBACK_ZH,
};

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

// Identifier + display-name pairs. Stats, effect text, and per-move
// numerics still live in the attached champions-data JSON — the party
// JSON only carries what the AI needs to mirror in its reply. Without
// the localized names inline the AI tends to output raw English slugs
// even when the user asked in Korean/Japanese/Chinese.
function extractSlot(slot) {
  if (!slot) return null;
  const p = state.pokemonMap.get(slot.slug);
  if (!p) return null;
  const form = findForm(p, slot.formName) || p.forms[0];
  const lang = getLang();
  const nameKey =
    lang === "ja" ? "nameJa"
    : lang === "zh" ? "nameZh"
    : lang === "en" ? "nameEn"
    : "nameKo";
  const pickName = (obj) => {
    if (!obj) return undefined;
    switch (lang) {
      case "ja": return obj.nameJa || obj.nameEn;
      case "zh": return obj.nameZh || obj.nameEn;
      case "en": return obj.nameEn;
      default:   return obj.nameKo || obj.nameEn;
    }
  };

  const ability = slot.abilitySlug ? state.abilityMap.get(slot.abilitySlug) : null;
  const item = slot.itemSlug ? state.itemMap.get(slot.itemSlug) : null;
  const moves = (Array.isArray(slot.moves) ? slot.moves : [])
    .filter(Boolean)
    .map((s) => {
      const m = state.moveMap.get(s);
      return m ? { slug: s, [nameKey]: pickName(m) } : { slug: s };
    });

  return {
    slug: slot.slug,
    [nameKey]: pickName(p),
    formName: form.name, // English functional id — required to distinguish forms
    ability: ability ? { slug: slot.abilitySlug, [nameKey]: pickName(ability) } : null,
    item: item ? { slug: slot.itemSlug, [nameKey]: pickName(item) } : null,
    moves,
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
//
// Phase 1 M2: ja/zh 바디는 아직 없음 (Phase 3 에서 추가). 그 모드에서는
// en 바디로 폴백 — AI 가 영어로 답하지만 데이터는 ja/zh 필드로 실려 있어
// Champions 정확성은 유지. 향후 ja/zh 본문 추가 시 이 함수 자동 매칭.
function resolveBody(bodySpec) {
  if (typeof bodySpec === "string") return bodySpec; // legacy single-string fallback
  const lang = getLang();
  const suffix = state.mode === "double" ? "Double" : "";
  const modeKey = `${lang}${suffix}`;
  return (
    bodySpec[modeKey]
    || bodySpec[lang]
    || bodySpec[`en${suffix}`]
    || bodySpec.en
    || bodySpec.ko
    || ""
  );
}

function substitute(bodySpec) {
  const body = resolveBody(bodySpec).trim();
  const u = currentUrls();
  const lang = getLang();
  const inline = buildInlineJson();
  const footer = FOOTER_FALLBACK_BY_LANG[lang] || FOOTER_FALLBACK_EN;
  const filled = state.party.filter(Boolean).length;
  const empty = state.party.length - filled;
  // With the data bundle attached, any body line that points the AI at a
  // fetch URL for the champions data (pokemon/moves/abilities/items JSON
  // or reference HTML, or the site guide llms.txt) is dead weight — the
  // attachment already carries every row in those files. Strip those
  // lines regardless of the language-specific label prefix. PARTY_URL
  // (user reference) and DATA_BUNDLE_PAGE_URL (used by the footer) stay.
  const stripped = `${body}\n\n${footer}`.replace(
    /^.*\{\{(LLMS_TXT_URL|POKEMON_JSON_URL|MOVES_JSON_URL|ITEMS_JSON_URL|ABILITIES_JSON_URL|POKEMON_REF_URL|MOVES_REF_URL|ABILITIES_REF_URL|ITEMS_REF_URL)\}\}.*\r?\n?/gm,
    "",
  );
  return stripped
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
      <h2 class="card__title">${title}</h2>
      <p class="card__desc">${desc}</p>
      <div class="prompt-card__actions">
        <button type="button" class="button button--primary" data-action="copy">${t("prompts.copy")}</button>
      </div>
      <details class="prompt-card__preview-wrap">
        <summary class="prompt-card__toggle">${t("prompts.previewToggle")}</summary>
        <p class="prompt-card__hint">${t("prompts.previewHint")}</p>
        <pre class="prompt-card__preview" aria-label="${t("prompts.previewAria")}"></pre>
      </details>
    `;
    const pre = card.querySelector(".prompt-card__preview");
    const btnCopy = card.querySelector('[data-action="copy"]');

    pre.textContent = substitute(tpl.body);

    btnCopy.addEventListener("click", () => {
      if (!hasParty) {
        alert(t("prompts.emptyCantCopy"));
        return;
      }
      copyToClipboard(substitute(tpl.body), btnCopy);
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
// Coverage as of 2026-04-23: ability gameText/description and item
// effect and move flavorText are all fully localized in ko/en/ja/zh,
// so ja/zh bundles drop the English originals too (no fallback needed).
const LANG_DROP_FIELDS = {
  ko: [
    "nameEn", "nameJa", "nameZh",
    "gameText", "gameTextJa", "gameTextZh",
    "description", "descriptionJa", "descriptionZh",
    "flavorText", "flavorTextEn", "flavorTextJa", "flavorTextZh",
    "effect", "effectJa", "effectZh",
  ],
  en: [
    "nameKo", "nameJa", "nameZh",
    "gameTextKo", "gameTextJa", "gameTextZh",
    "descriptionKo", "descriptionJa", "descriptionZh",
    "flavorTextKo", "flavorTextJa", "flavorTextZh",
    "effectKo", "effectJa", "effectZh",
  ],
  ja: [
    "nameKo", "nameEn", "nameZh",
    "gameText", "gameTextKo", "gameTextZh",
    "description", "descriptionKo", "descriptionZh",
    "flavorText", "flavorTextEn", "flavorTextKo", "flavorTextZh",
    "effect", "effectKo", "effectZh",
  ],
  zh: [
    "nameKo", "nameEn", "nameJa",
    "gameText", "gameTextKo", "gameTextJa",
    "description", "descriptionKo", "descriptionJa",
    "flavorText", "flavorTextEn", "flavorTextKo", "flavorTextJa",
    "effect", "effectKo", "effectJa",
  ],
};
const FORM_DROP_FIELDS = {
  ko: ["nameJa", "nameZh"],
  en: ["nameKo", "nameJa", "nameZh"],
  ja: ["nameKo", "nameZh"],
  zh: ["nameKo", "nameJa"],
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
  if (lang === "ja") {
    return [
      "Pokémon Champions 完全データセット (ground truth).",
      "このファイルの slug に無いポケモン/とくせい/どうぐ/わざは Champions に存在しません.",
      "AI エージェント: 事前知識の代わりにこの JSON を真実のソースとして使用してください.",
      "キー: pokemon(186), moves(481), abilities(192), items(117), natures(25), type_chart(18x18).",
      "言語: 日本語の名前フィールド (nameJa) のみ含む. 説明・効果フィールドは英語のまま (Phase 2 で翻訳予定). slug は英語識別子.",
    ].join(" ");
  }
  if (lang === "zh") {
    return [
      "Pokémon Champions 完整数据集 (ground truth).",
      "此文件 slug 中不存在的宝可梦/特性/道具/招式在 Champions 中不存在.",
      "AI 代理: 请使用此 JSON 作为真实来源, 而非先验知识.",
      "键: pokemon(186), moves(481), abilities(192), items(117), natures(25), type_chart(18x18).",
      "语言: 仅含中文简体名称字段 (nameZh). 说明和效果字段仍为英语 (Phase 2 计划翻译). slug 保持英语标识.",
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
      _rules: DETAILED_RULES_BY_LANG[lang] || DETAILED_RULES_EN,
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

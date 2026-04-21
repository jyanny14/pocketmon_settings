// Prompts are emitted in the user's current UI language. Each template
// carries both a Korean and an English body; prompts.js picks the right
// one via getLang() at substitute() time. Rule blocks and the shared
// disclaimer are likewise split into ko/en variants and baked into the
// bodies at module-load time.

// ── Shared header — disclaimer about Champions vs main series ───

export const SHARED_DISCLAIMER_KO =
  "이 데이터는 **Pokémon Champions** 기준입니다. 본편 시리즈(Scarlet/Violet 등)와 일부 밸런스·특성·아이템이 다릅니다. 제공된 JSON/URL 을 진실의 소스로 삼고, 사전지식과 충돌하면 제공된 데이터를 따라주세요. Champions 고유 변경점 플래그: `abilities.json[].isNewInChampions`, `moves.json[].updatedInChampions`.";

export const SHARED_DISCLAIMER_EN =
  "This data is based on **Pokémon Champions**. Balance, abilities, and items differ in places from the main series (Scarlet/Violet etc.). Treat the provided JSON/URLs as the source of truth; if your prior knowledge conflicts with the data, follow the data. Champions-specific change flags: `abilities.json[].isNewInChampions`, `moves.json[].updatedInChampions`.";

// ── Strict pool constraint (ko) ──────────────────────────────────

export const STRICT_POOL_RULES_KO = `**데이터 제약 (엄격 · 반드시 준수 · 위반 시 답변 무효)**

1. **진실의 소스 우선순위**: **(a-0) 사용자가 챗에 첨부한 데이터 파일 (\`champions-data*.json\` 또는 유사) > ** (a) fetched JSON > (b) fetched HTML 레퍼런스 > (c) 인라인 JSON > (d) 그 외 어떤 것도 금지. **첨부 파일이 보이면 그것을 최우선으로 사용하고 URL fetch 는 건너뛰어도 됩니다.** 첨부가 없고 fetch 가능하다면 아래 URL 들을 시도하세요.
   원본 JSON (가장 정확 · 구조화):
   - 포켓몬: {{POKEMON_JSON_URL}}  (186 species / 267 forms)
   - 특성: {{ABILITIES_JSON_URL}}  (192종, \`isNewInChampions\` 플래그)
   - 도구: {{ITEMS_JSON_URL}}  (117종)
   - 기술: {{MOVES_JSON_URL}}  (481종, \`updatedInChampions\` 수치)
   JSON fetch 가 안 되는 경우 (AI 도구가 JSON 을 못 다루거나 CORS 차단 등) 정적 HTML 버전으로 대체 가능:
   - 포켓몬: {{POKEMON_REF_URL}}
   - 기술: {{MOVES_REF_URL}}
   - 특성: {{ABILITIES_REF_URL}}
   - 도구: {{ITEMS_REF_URL}}
2. **Fetch 가 모두 불가능하면**: 답변을 거부하지 말고, 우선 인라인 JSON 을 진실의 소스로 쓰세요. 인라인만으로 부족하면 유저에게 이렇게 요청하세요: **"{{DATA_BUNDLE_PAGE_URL}} 에 접속해 '[Champions 데이터 파일 다운로드]' 버튼으로 전체 데이터 파일을 받아 이 챗에 첨부해주세요. 그 파일을 보고 정확히 답해드리겠습니다."** 절대 사전 지식으로 때우지 마세요.
3. **Pokémon Champions 에 존재하는 전부**는 위 소스들에 담긴 항목입니다. **당신의 사전 지식은 이 상황에서 틀릴 확률이 매우 높습니다.** Champions 는 본편(Scarlet/Violet, Legends: Z-A 등)과 **다른 라인업**입니다. 본편엔 있지만 Champions 엔 없는 포켓몬/특성/도구/기술이 많으며, 본편과 수치가 다른 기술도 16개 있습니다. 위 소스에 없으면 Champions 에 없다고 간주하세요. **실제 부재 예시 (items.json 에 없음)**: \`assault-vest (돌격조끼)\` · \`life-orb (생명의구슬)\` · \`choice-band (구애머리띠)\` · \`choice-specs (구애안경)\` · \`rocky-helmet (울퉁불퉁멧)\` · \`heavy-duty-boots (두꺼운장화)\` · \`eviolite (진화의휘석)\`. 본편에서 아무리 인기 있어도 Champions items.json 에 slug 이 없으면 **제안 금지**. (반대로 \`leftovers\`·\`focus-sash\`·\`choice-scarf\` 등은 Champions 에 존재하니 확인 후 사용 가능.)
4. **모든 추천 항목에 slug 병기 + 출처 명시**: \`아머까오 (slug: corviknight, 출처: pokemon.json)\` · \`지진 (slug: earthquake, 출처: moves.json)\` 형식. slug 가 없거나 틀리거나 출처 명시가 없으면 규칙 위반.
5. 특성·기술을 특정 포켓몬에 붙일 때는 해당 폼의 \`abilities\` / \`moves\` 배열에 **실제로 존재해야** 합니다. (폼 외 특성·비배움 기술 제안 금지.)
6. **불확실하면 제안하지 말고, 유저에게 데이터 파일을 요청하세요.** 어떤 포켓몬/기술/특성/도구가 Champions 에 있는지 **확신할 수 없다면** (= 위 소스에서 slug 로 직접 확인할 수 없다면):
   - (a) 제공된 소스 안에서 **기능이 유사한 대체 항목**이 있으면 그것으로 답하세요 (예: 돌격조끼 대신 items.json 내 유사 효과 아이템).
   - (b) 대체가 어렵거나 유저 질문의 상당 부분이 소스에 없어 보이면, **절대 사전 지식으로 메우지 말고** 이렇게 응답하세요: **"Champions 데이터에서 '{항목명}' 을(를) 찾지 못했습니다. {{DATA_BUNDLE_PAGE_URL}} 에서 'Champions 데이터 파일 다운로드' 버튼으로 전체 데이터 파일을 받아 이 챗에 첨부해주시면 정확히 답해드리겠습니다."**
   **"본편에 있으니 Champions 에도 있을 것" / "유명한 아이템이니 있겠지" 식 추측은 절대 금지.** 본편 시리즈 인기 여부는 Champions 포함 여부의 증거가 아닙니다.
7. **자기 검증 (최종 단계)**: 답변 작성 직후 전송 직전에, 본인이 언급한 **모든 포켓몬·특성·도구·기술 이름** 을 하나씩 체크리스트로 돌려보세요. 각각에 대해 "이 slug 가 위 소스에 실제로 있는가?" 답이 "yes" 인 것만 유지. "잘 모르겠다" 는 제거 + 규칙 6 에 따라 데이터 파일 다운로드 요청으로 대체. 제거 후 답변이 완전히 비어버리면 **"Champions 데이터 내에서 조건을 만족하는 항목을 찾지 못했습니다. {{DATA_BUNDLE_PAGE_URL}} 에서 데이터 파일을 받아 첨부해주세요."** 로 답하세요.`;

// ── Strict pool constraint (en) ──────────────────────────────────

export const STRICT_POOL_RULES_EN = `**Data constraints (strict · must follow · violations invalidate the answer)**

1. **Source-of-truth priority**: **(a-0) A data file the user attached in chat (\`champions-data*.json\` or similar) > ** (a) fetched JSON > (b) fetched HTML reference > (c) inline JSON > (d) nothing else is allowed. **If you see an attached data file, use it first and skip URL fetching.** If there is no attachment and fetching is available, try the URLs below.
   Original JSON (most accurate · structured):
   - Pokémon: {{POKEMON_JSON_URL}}  (186 species / 267 forms)
   - Abilities: {{ABILITIES_JSON_URL}}  (192 entries, \`isNewInChampions\` flag)
   - Items: {{ITEMS_JSON_URL}}  (117 entries)
   - Moves: {{MOVES_JSON_URL}}  (481 entries, \`updatedInChampions\` values)
   If JSON fetch isn't possible (AI tool can't handle JSON, CORS blocks, etc.) the static HTML mirrors are fine substitutes:
   - Pokémon: {{POKEMON_REF_URL}}
   - Moves: {{MOVES_REF_URL}}
   - Abilities: {{ABILITIES_REF_URL}}
   - Items: {{ITEMS_REF_URL}}
2. **If fetching is entirely impossible**: don't refuse to answer — use the inline JSON as the source of truth first. If the inline data isn't enough, ask the user exactly this: **"Please open {{DATA_BUNDLE_PAGE_URL}}, click the '[Download Champions data file]' button, and attach the file to this chat. I'll answer precisely once I can see it."** Never fill the gap from prior knowledge.
3. **Everything that exists in Pokémon Champions** is contained in the sources above. **Your prior knowledge has a very high chance of being wrong here.** Champions has a **different lineup** from the main games (Scarlet/Violet, Legends: Z-A, etc.). Many Pokémon/abilities/items/moves from the main series are absent, and 16 moves have different numbers. If it's not in the sources above, treat it as not existing in Champions. **Items genuinely missing from items.json**: \`assault-vest\`, \`life-orb\`, \`choice-band\`, \`choice-specs\`, \`rocky-helmet\`, \`heavy-duty-boots\`, \`eviolite\`. No matter how popular they are in the main series, if a slug isn't in items.json, **do NOT recommend it**. (On the other hand, \`leftovers\`, \`focus-sash\`, \`choice-scarf\` etc. do exist in Champions — verify and use.)
4. **Every recommendation must carry a slug + source**: format like \`Corviknight (slug: corviknight, source: pokemon.json)\` · \`Earthquake (slug: earthquake, source: moves.json)\`. No slug, wrong slug, or missing source = violation.
5. When attaching an ability/move to a specific Pokémon, it must **actually exist** in that form's \`abilities\` / \`moves\` array. (No abilities outside the form, no moves the form can't learn.)
6. **If you're not sure, don't recommend — ask the user for the data file instead.** If you **cannot confirm** a Pokémon/move/ability/item exists in Champions (= can't verify it directly by slug in the sources above):
   - (a) If a **functionally similar alternative** exists inside the provided sources, use that (e.g. recommend a comparable item from items.json instead of assault-vest).
   - (b) If no alternative works, or a meaningful portion of the user's request isn't covered by the sources, **do NOT fill the gap from prior knowledge**. Respond: **"I couldn't find '{item}' in the Champions data. Please go to {{DATA_BUNDLE_PAGE_URL}}, click the 'Download Champions data file' button, and attach the file here — I'll answer precisely once I can see it."**
   **"It's in the main games so Champions probably has it" / "it's a popular item so it must be there" are strictly forbidden.** Main-series popularity is not evidence of Champions inclusion.
7. **Self-verification (final step)**: right before sending, run a checklist over **every Pokémon/ability/item/move name you mentioned**. For each: "Does this slug actually exist in the source above?" Keep only the "yes" items. Drop the "not sure" ones and replace them with a data-file request per rule 6. If nothing remains, reply: **"No matches found in the Champions data for this request. Please attach the full data file via {{DATA_BUNDLE_PAGE_URL}} so I can answer precisely."**`;

// ── Templates ────────────────────────────────────────────────────

export const TEMPLATES = [
  {
    id: "weakness",
    titleKey: "prompts.tmpl.weakness.title",
    descKey: "prompts.tmpl.weakness.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래 파티의 **방어적 약점**을 분석해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 6마리 전부에게 2배 이상 대미지를 주는 공격 타입이 있는지 (있다면 그 타입과 몇 마리가 약한지).
2. 파티 전체가 내성(0.5배 이하)을 공유하는 타입 / 그 반대로 누구도 내성이 없는 타입.
3. 위험한 약점을 가장 잘 메울 수 있는 **현 파티 내의 스위칭 전략** 제안.
4. 교체가 아니라 **도구/특성 조정**으로 완화할 수 있는 부분이 있다면 함께 (제안하는 도구·특성은 items.json / abilities.json 에 실존 + 해당 폼이 쓸 수 있는 것만).

파티 구성 (참고용 인라인 데이터):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please analyze the **defensive weaknesses** of the party below.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Analysis requests:
1. Any attacking type that deals 2× or more damage to all 6 members (if so: the type and how many members are weak).
2. Types the whole party resists (0.5× or less) / conversely, types no one resists.
3. The best **switching strategy inside the current party** to cover the most dangerous weaknesses.
4. Any gaps that can be mitigated with **item/ability tweaks** instead of swapping (only items/abilities that actually exist in items.json / abilities.json and are legal for the form).

Party (inline reference data):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "swap",
    titleKey: "prompts.tmpl.swap.title",
    descKey: "prompts.tmpl.swap.desc",
    requiresPokemonPool: true,
    body: {
      ko: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래 파티에서 **한 마리만 바꾼다면 누구를, 무엇으로** 바꾸는 게 좋을지 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)

분석 요청:
1. 현 파티에서 가장 약한 고리(역할 중복·약점 공유·속도 밀림 등)를 한 슬롯 지목.
2. 해당 슬롯을 대체할 **3후보** 제시. 각 후보에 대해:
   - \`종족명 (slug: …)\` · 폼 · 추천 특성 · 추천 도구 (전부 pokemon.json / items.json 에 실제 존재하는 것만).
   - 교체 이유(파티 전체 관점에서 어떤 구멍을 메우는지).
3. 세 후보 중 최선을 고르고 이유 한 줄.

현 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please recommend **which single member to swap, and what to swap in**. Change exactly one slot.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)

Analysis requests:
1. Point out the weakest link in the current party (role overlap, shared weakness, outsped, etc.) — pick one slot.
2. Propose **3 replacement candidates** for that slot. For each:
   - \`Name (slug: …)\` · form · recommended ability · recommended item (all must actually exist in pokemon.json / items.json).
   - Reason for the swap (what hole it patches from a whole-team view).
3. Pick the best of the three with a one-line rationale.

Current party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "moveset",
    titleKey: "prompts.tmpl.moveset.title",
    descKey: "prompts.tmpl.moveset.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래 파티 **각 포켓몬의 4기술 세팅**을 제안해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

규칙 (위 제약 1~5 와 중복되지만 재강조):
- 각 포켓몬의 추천 기술은 **pokemon.json 에서 해당 포켓몬의 \`moves\` 배열에 있는 slug** 만 쓸 수 있습니다. 없는 기술은 제안 불가.
- 각 기술의 수치는 **moves.json 에서 조회한 실제 값** 으로 표기 (사전 지식으로 지어내지 말 것).
- STAB(자속) 1–2 + 커버리지 + 보조/회복/상태이상 균형을 고려.
- 각 기술 옆에 타입·분류·위력·명중 을 괄호로 적어주세요 (예: \`Flamethrower (Fire / Special / 90 / 100)\`).
- Champions 에서 수치가 바뀐 기술(\`updatedInChampions: true\`)은 **그 수정된 수치** 기준으로 평가해주세요.

파티 인라인 데이터 (선택된 기술·특성·도구 포함. learnable 풀은 pokemon.json 참조):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

출력 형식:
- 포켓몬 1: 기술 네 줄 + 선택 이유 한 줄
- 포켓몬 2: …
- …
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please propose a **4-move set for each Pokémon** in the party below.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Rules (overlapping with constraints 1–5 but emphasized):
- Each Pokémon's suggested moves must come from **the slug list in that Pokémon's \`moves\` array in pokemon.json**. Moves outside that list are forbidden.
- Each move's numbers must be the **actual values looked up in moves.json** (don't fabricate from prior knowledge).
- Balance STAB (1–2) + coverage + support/recovery/status.
- Write type · category · power · accuracy in parentheses next to each move (e.g. \`Flamethrower (Fire / Special / 90 / 100)\`).
- Moves rebalanced in Champions (\`updatedInChampions: true\`) must be evaluated with **their updated numbers**.

Party inline data (selected moves/ability/item included; learnable pool is in pokemon.json):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

Output format:
- Pokémon 1: four move lines + one reason line
- Pokémon 2: …
- …
`,
    },
  },

  {
    id: "fill",
    titleKey: "prompts.tmpl.fill.title",
    descKey: "prompts.tmpl.fill.desc",
    requiresPokemonPool: true,
    body: {
      ko: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

현재 파티의 **남은 {{EMPTY_COUNT}}칸**을 채울 포켓몬을 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)
- 기술 상세(type / power / accuracy / pp): {{MOVES_JSON_URL}} — 추천할 4기술의 수치는 여기서 조회한 실제 값으로 표기하세요.

분석 요청:
1. 현재 파티({{FILLED_COUNT}}마리)의 약점·역할 공백을 한 줄로 진단.
2. 남은 {{EMPTY_COUNT}}칸 각각에 대해 아래 포맷으로 제안:
   - **슬롯 N**: \`종족명 (slug: …)\` (폼) — 역할 태그 (선봉 / 피봇 / 물리 어태커 / 특수 어태커 / 내구 벽 / 스위퍼 / 서포터 등 중 택1)
   - 추천 특성 · 도구 · 성격 (전부 fetched 데이터에 존재하는 것만)
   - 4기술 — 이름 옆에 (타입 / 분류 / 위력 / 명중) 괄호 표기. 해당 폼의 \`moves\` 배열에 있는 기술만.
   - Stat Points 배분 — \`hp/atk/def/spAtk/spDef/speed\` 형식. 각 스탯 0~32, 총합 ≤66.
   - 선택 이유 1~2문장 (현 파티 관점에서 어떤 구멍을 메우는지).
3. 마지막에 6마리 완성 시 **팀 컨셉 한 줄** 요약.

추가 제약:
- Champions 에서 수치가 바뀐 기술(\`updatedInChampions: true\`)은 수정된 수치 기준.
- 성격은 25종 표준 성격 중 하나.

현 파티 인라인 데이터 ({{FILLED_COUNT}}마리, 빈 슬롯 제외):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please recommend Pokémon to fill **the {{EMPTY_COUNT}} remaining slots** in the current party.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)
- Move details (type / power / accuracy / pp): {{MOVES_JSON_URL}} — report the 4 moves' numbers from the actual values here.

Analysis requests:
1. Diagnose the current party's ({{FILLED_COUNT}} members) weaknesses and role gaps in one line.
2. For each of the {{EMPTY_COUNT}} remaining slots, propose in this format:
   - **Slot N**: \`Name (slug: …)\` (form) — role tag (one of: lead / pivot / physical attacker / special attacker / defensive wall / sweeper / support / etc.)
   - Recommended ability · item · nature (all must exist in the fetched data).
   - 4 moves — with (type / category / power / accuracy) in parentheses. Only moves in the form's \`moves\` array.
   - Stat Points allocation — \`hp/atk/def/spAtk/spDef/speed\` format. Each stat 0–32, total ≤66.
   - 1–2 sentence reason (what gap it fills from the current party's perspective).
3. End with a **one-line team concept** summary for the completed 6-member team.

Extra constraints:
- Moves rebalanced in Champions (\`updatedInChampions: true\`) use the updated numbers.
- Natures must be one of the 25 standard natures.

Current party inline data ({{FILLED_COUNT}} members, empty slots excluded):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "counter",
    titleKey: "prompts.tmpl.counter.title",
    descKey: "prompts.tmpl.counter.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

상대 파티에 맞춘 **대응 전략**을 짜주세요.

- 내 파티 URL: {{PARTY_URL}}
- 상대 파티 URL: (아래 "OPPONENT_URL" 자리에 붙여넣으세요)
  OPPONENT_URL =
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 상대 6마리 중 내 파티에 **가장 위험한 2마리**를 꼽고 이유.
2. 각 위험 대상을 상대할 내 **1순위·2순위 담당자**와 기술 (내 파티 인라인 데이터 안에서만, moves 배열에 있는 기술만).
3. 내 파티가 **먼저 내밀면 안 되는 포켓몬** 과 그 이유.
4. 선봉으로 추천하는 포켓몬 한 마리 + 첫 턴 플랜.

내 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(상대 파티 데이터가 필요하면 위 OPPONENT_URL 을 fetch 하거나, 내가 JSON 으로 같이 붙여드릴게요. 상대 포켓몬도 pokemon.json 에 존재하는 종만 언급하세요.)
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please draft a **counter plan** tailored to an opponent's party.

- My party URL: {{PARTY_URL}}
- Opponent party URL: (paste it in the "OPPONENT_URL" slot below)
  OPPONENT_URL =
- Site guide: {{LLMS_TXT_URL}}

Analysis requests:
1. Pick the **2 most dangerous opponents** out of their 6 against my party and explain why.
2. For each threat, name my **primary and secondary responder** and the move to use (only from my party's inline data, moves must be in each member's \`moves\` array).
3. Which of my Pokémon **must not be led with** and why.
4. One recommended lead + first-turn plan.

My party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(If you need the opponent's data, fetch the OPPONENT_URL above or I'll paste the JSON. Only mention opposing Pokémon that exist in pokemon.json.)
`,
    },
  },

  {
    id: "free",
    titleKey: "prompts.tmpl.free.title",
    descKey: "prompts.tmpl.free.desc",
    requiresPokemonPool: false,
    body: {
      ko: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래는 제 Pokémon Champions 파티입니다. 이 컨텍스트 위에서 질문드릴게요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

내 질문:
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Below is my Pokémon Champions party. I'll ask a question on top of this context.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

My question:
`,
    },
  },
];

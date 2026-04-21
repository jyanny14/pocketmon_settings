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

아래 파티의 **방어적 약점**을 분석해주세요. (배틀 모드: **싱글 1대1**)

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
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래 파티의 **방어적 약점**을 **더블 배틀(2대2)** 관점에서 분석해주세요. 동시에 2마리가 필드에 서 있는다는 전제로.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청 (더블 맥락):
1. 6마리 중 **3마리 이상이 같은 타입에 2배 이상** 취약한가? — 더블에서는 한 턴에 2마리가 동시에 노출되므로 3마리 공유 약점이 치명적.
2. 스프레드 공격(Earthquake / Surf / Heat Wave / Rock Slide / Muddy Water / Dazzling Gleam / Hyper Voice / Discharge 등) 에 **리드 조합 시너지로 취약한 페어** 가 있는지. 예: 지면 약점 2마리가 함께 리드 → 상대 Earthquake 한 방에 괴멸.
3. 아무도 저항 못 하는 공격 타입 / 파티 전체가 공유 내성을 가진 타입.
4. 리드 페어로 **가장 많이 세울 수 있는 2마리 조합** 이 약점 면에서 안전한가? — 리드 2마리의 방어 프로필이 서로를 보완해야 함.
5. 교체·도구·특성 조정으로 완화 제안 (items.json / abilities.json 실존 한정). 특히 Intimidate 같은 더블에서 유효한 특성 / Sitrus Berry 같이 pinch 서포트 도구 우선 고려.

파티 구성 (참고용 인라인 데이터):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please analyze the **defensive weaknesses** of the party below. (Battle mode: **Singles 1v1**)

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
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please analyze the **defensive weaknesses** of the party below from a **Doubles (2v2)** perspective. Assume two Pokémon are on the field at a time.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Analysis requests (doubles context):
1. Do **3+ members share a 2× weakness** to the same attacking type? — with two Pokémon exposed per turn, a 3-way shared weakness is critical.
2. Are there any **lead pairs that get blown up by spread moves** (Earthquake / Surf / Heat Wave / Rock Slide / Muddy Water / Dazzling Gleam / Hyper Voice / Discharge)? Example: two Ground-weak leads + opposing Earthquake = both KO'd.
3. Any attacking type no one resists / any type the whole team resists.
4. Is the **most natural lead pair** defensively safe? The two leads' defensive profiles should complement each other.
5. Mitigation via swaps, items, or abilities (must exist in items.json / abilities.json). Prioritise doubles-relevant abilities like Intimidate and pinch-support items like Sitrus Berry.

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

아래 파티에서 **한 마리만 바꾼다면 누구를, 무엇으로** 바꾸는 게 좋을지 추천해주세요. (배틀 모드: **싱글 1대1**)

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
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래 파티에서 **한 마리만 바꾼다면 누구를, 무엇으로** 바꾸는 게 좋을지 **더블 배틀(2대2)** 관점에서 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)

분석 요청 (더블 맥락):
1. 현 파티의 더블 약한 고리 한 슬롯 지목 — 기준:
   - 파트너 시너지가 떨어지는 슬롯 (아무와도 리드 페어로 잘 안 맞는지)
   - 스프레드 공격에 공유 취약한 슬롯
   - 더블에서 흔한 핵심 역할(redirect / 날씨 setter / TR setter / Tailwind / Intimidate / Fake Out 선제)이 비어 있는데 그 슬롯으로 메꿀 수 있는지
2. 해당 슬롯을 대체할 **3후보** 제시. 각 후보에 대해:
   - \`종족명 (slug: …)\` · 폼 · 추천 특성 · 추천 도구 (pokemon.json / items.json 실존 + 해당 폼이 쓸 수 있는 것만)
   - 이 후보가 **어떤 파트너와 리드 페어** 가 되는지 (예: "이 XX 와 Tailwind 시너지", "Follow Me 로 YY 를 보호" 등)
   - 더블 특화 기여 (스프레드 / 서포트 / 스피드 조절 / redirect / 날씨 / TR 등)
3. 세 후보 중 최선을 고르고 **리드 조합 예시 (이 후보 + 기존 멤버 1명)** 한 줄.

현 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please recommend **which single member to swap, and what to swap in**. Change exactly one slot. (Battle mode: **Singles 1v1**)

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
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please recommend **which single member to swap, and what to swap in** from a **Doubles (2v2)** perspective.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)

Analysis requests (doubles context):
1. Point out the weakest link for doubles. Criteria:
   - A slot with poor partner synergy (doesn't pair well with anyone as a lead)
   - A slot that shares spread-move vulnerabilities with too many teammates
   - A doubles-essential role the team is missing (redirect / weather setter / TR setter / Tailwind / Intimidate / Fake Out priority) that this slot could fill
2. Propose **3 replacement candidates**. For each:
   - \`Name (slug: …)\` · form · recommended ability · recommended item (must exist in pokemon.json / items.json and be legal for the form)
   - **Who on the team this candidate pairs with as a lead** (e.g. "pairs with XX for Tailwind synergy", "Follow Me to protect YY")
   - Doubles-specific contribution (spread / support / speed control / redirect / weather / TR, etc.)
3. Pick the best of the three with a **lead-pair example (this candidate + one existing member)** in one line.

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

아래 파티 **각 포켓몬의 4기술 세팅**을 제안해주세요. (배틀 모드: **싱글 1대1**)

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
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래 파티 **각 포켓몬의 4기술 세팅**을 **더블 배틀(2대2)** 관점에서 제안해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

더블 맥락에서 기술 선택 기준 (+ 위 제약 1~5 준수):
- **Protect / Detect 는 사실상 필수** 에 가까움 (한 슬롯 서포트 + 생존 + 상대 템포 파악). 대부분의 포켓몬에 포함 강추.
- **스프레드 공격** (target: all-opponents / all-other-pokemon) 는 보정 0.75배지만 상대 2마리 동시 타격이라 가치 높음 — 싱글 타깃 기술보다 우선도 고려 (단 아군 피해 체크).
- **아군 지원 기술** 적극 고려: Follow Me / Rage Powder (redirect) / Helping Hand / Fake Out / Wide Guard / Quick Guard / Tailwind / Trick Room 등. 해당 포켓몬의 \`moves\` 배열에 있을 때만.
- STAB 2개는 과함 — **STAB 1 + 스프레드 1 + 서포트/Protect 1 + 커버리지 1** 이 표준 배분.
- 각 기술 옆에 **타입 · 분류 · 위력 · 명중 · (단일/스프레드/아군/자신) 타깃** 표기. 예: \`Heat Wave (Fire / Special / 95 / 90 / 스프레드)\` · \`Protect (Normal / Status / — / — / 자신)\`.
- Champions 에서 수치가 바뀐 기술(\`updatedInChampions: true\`)은 **수정된 수치** 기준.

파티 인라인 데이터 (선택된 기술·특성·도구 포함. learnable 풀은 pokemon.json 참조):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

출력 형식:
- 포켓몬 1: 기술 네 줄 (타깃 표기) + 선택 이유 한 줄 (**어떤 파트너와 시너지** 인지 명시)
- 포켓몬 2: …
- …
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please propose a **4-move set for each Pokémon** in the party below. (Battle mode: **Singles 1v1**)

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
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please propose a **4-move set for each Pokémon** from a **Doubles (2v2)** perspective.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Doubles-specific move-selection criteria (+ constraints 1–5):
- **Protect / Detect is nearly mandatory** (one-slot support + survival + reads opponent's tempo). Include on most Pokémon by default.
- **Spread moves** (target: all-opponents / all-other-pokemon) are at 0.75× but hit both enemies — often outvalue single-target moves (watch for ally damage).
- Actively consider **ally-support moves**: Follow Me / Rage Powder (redirect) / Helping Hand / Fake Out / Wide Guard / Quick Guard / Tailwind / Trick Room. Only if present in the Pokémon's \`moves\` array.
- Two STAB moves is often overkill — standard split is **1 STAB + 1 spread + 1 Protect/support + 1 coverage**.
- Next to each move include **type · category · power · accuracy · (single/spread/ally/self) target**. Example: \`Heat Wave (Fire / Special / 95 / 90 / spread)\` · \`Protect (Normal / Status / — / — / self)\`.
- Moves rebalanced in Champions (\`updatedInChampions: true\`) use the updated numbers.

Party inline data (selected moves/ability/item included; learnable pool is in pokemon.json):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

Output format:
- Pokémon 1: four move lines (with target tag) + one reason line (**name the partner synergy** this set enables)
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

현재 파티의 **남은 {{EMPTY_COUNT}}칸**을 채울 포켓몬을 추천해주세요. (배틀 모드: **싱글 1대1**)

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
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

현재 파티의 **남은 {{EMPTY_COUNT}}칸**을 **더블 배틀(2대2)** 기준으로 채울 포켓몬을 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 후보 풀: {{POKEMON_JSON_URL}} (위 제약 1~5 참고)
- 기술 상세: {{MOVES_JSON_URL}}

분석 요청 (더블 맥락):
1. 현재 파티({{FILLED_COUNT}}마리)의 **더블 관점** 약점·역할 공백 진단 (한 줄). 특히 아래 역할 중 누락된 것 지목:
   - **Fake Out** 선제 + 1턴차 방해
   - **Redirect** (Follow Me / Rage Powder)
   - **날씨 / TR / Tailwind** 세터
   - **Intimidate** 물공 약화
   - **스프레드 어태커** (Earthquake / Surf / Heat Wave 등 담당)
   - **Protect 없는 슬롯 채움** (대부분 포켓몬이 Protect 채용)
2. 남은 {{EMPTY_COUNT}}칸 각각에 대해:
   - **슬롯 N**: \`종족명 (slug: …)\` (폼) — **더블 역할 태그** (예: "리다이렉터" · "TR setter" · "Intimidate 서포트" · "스프레드 어태커" · "Fake Out 리드" 등)
   - 추천 특성 · 도구 · 성격
   - 4기술 — 타깃 표기(단일/스프레드/아군/자신). 해당 폼의 \`moves\` 에 있는 것만.
   - Stat Points 배분 (각 0~32, 총합 ≤66). 더블은 대체로 스피드보다 내구·화력 우선 (Tailwind / TR 에 의존 가능).
   - **기존 멤버 중 누구와 리드 페어를 이루는지 한 줄** (가장 중요).
3. 마지막에 완성 6마리의 **팀 아키타입** 한 줄 (예: "Tailwind 공세팟", "Trick Room 저속팟", "날씨 (일) 팟", "스탠다드 밸런스" 등).

추가 제약: Champions 재밸런스 기술은 updated 수치. 성격 25종 중 하나.

현 파티 인라인 데이터 ({{FILLED_COUNT}}마리, 빈 슬롯 제외):
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please recommend Pokémon to fill **the {{EMPTY_COUNT}} remaining slots** in the current party. (Battle mode: **Singles 1v1**)

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
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please recommend Pokémon to fill **the {{EMPTY_COUNT}} remaining slots** from a **Doubles (2v2)** perspective.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Candidate pool: {{POKEMON_JSON_URL}} (see constraints 1–5 above)
- Move details: {{MOVES_JSON_URL}}

Analysis requests (doubles context):
1. Diagnose **doubles-specific** weaknesses/role gaps of the current {{FILLED_COUNT}}-member team in one line. Call out which of these roles is missing:
   - **Fake Out** priority + turn-1 disruption
   - **Redirect** (Follow Me / Rage Powder)
   - **Weather / Trick Room / Tailwind** setter
   - **Intimidate** physical dampener
   - **Spread attacker** (Earthquake / Surf / Heat Wave, etc.)
   - **Protect** coverage (most members should run Protect)
2. For each of the {{EMPTY_COUNT}} remaining slots:
   - **Slot N**: \`Name (slug: …)\` (form) — **doubles role tag** (e.g. "redirector", "TR setter", "Intimidate support", "spread attacker", "Fake Out lead")
   - Recommended ability · item · nature
   - 4 moves — with target tag (single/spread/ally/self). Only moves in the form's \`moves\` list.
   - Stat Points allocation (each 0–32, total ≤66). Doubles usually prioritises bulk/power over raw speed (you can depend on Tailwind / TR).
   - **Which existing member it pairs with as a lead** — one line (most important).
3. End with the completed team's **doubles archetype** in one line (e.g. "Tailwind offense", "Trick Room low-speed", "Sun weather", "Standard balance").

Extra constraints: rebalanced-in-Champions moves use the updated numbers; natures must be one of the 25 standard natures.

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

상대 파티에 맞춘 **대응 전략**을 짜주세요. (배틀 모드: **싱글 1대1**)

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
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

상대 파티에 맞춘 **대응 전략**을 **더블 배틀(2대2)** 로 짜주세요. 리드 2마리 동시 출전.

- 내 파티 URL: {{PARTY_URL}}
- 상대 파티 URL: (아래 "OPPONENT_URL" 자리에 붙여넣으세요)
  OPPONENT_URL =
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청 (더블 맥락):
1. 상대 6마리 중 **가장 위협적인 리드 페어 2개** 예상 (상대가 어떤 2마리를 함께 내밀 가능성이 높은가 + 그 조합이 왜 위협적인가).
2. 각 위협 리드 페어에 대해 내 **카운터 리드 페어** 제안 — 2마리 조합으로 답변. 예: "내 A + B 로 시작, A 는 Fake Out 으로 상대 C 막고 B 는 Protect 후 다음 턴 ...".
3. 각 상대 포켓몬에 대해 **내 담당자 + 기술 + 타깃** (스프레드로 한 번에 / 단일로 집중 공격 / redirect 로 보호 등).
4. 내 파티에서 **절대 같이 내밀면 안 되는 2마리** 조합 (스프레드 공유 취약 / 시너지 없음 등).
5. 추천 **리드 페어 1개 + 첫 턴 플랜** (내 두 마리 각각의 기술 + 타깃).

내 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(상대 파티 데이터가 필요하면 OPPONENT_URL 을 fetch 하거나 JSON 을 같이 붙여드릴게요. 상대 포켓몬도 pokemon.json 실존 종만.)
`,
      en: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please draft a **counter plan** tailored to an opponent's party. (Battle mode: **Singles 1v1**)

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
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Please draft a **counter plan** for **Doubles (2v2)** — two leads on the field at once.

- My party URL: {{PARTY_URL}}
- Opponent party URL: (paste it in the "OPPONENT_URL" slot below)
  OPPONENT_URL =
- Site guide: {{LLMS_TXT_URL}}

Analysis requests (doubles context):
1. Predict the opponent's **2 most threatening lead pairs** (which pair they're most likely to send out together + why it's threatening).
2. For each threatening lead pair, propose my **counter-lead pair** — answer as a 2-Pokémon combination. Example: "Lead my A + B, A uses Fake Out on their C while B Protects and sets up next turn...".
3. For each opposing Pokémon, identify my **responder + move + target** (spread to hit both / single-target focus / redirect protection, etc.).
4. Name the **two Pokémon I must not lead together** (shared spread weakness, zero synergy, etc.).
5. Recommend **one lead pair + a first-turn plan** — moves and targets for each of the two leads.

My party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(If you need the opponent's data, fetch OPPONENT_URL or I'll paste JSON. Opposing Pokémon must also exist in pokemon.json.)
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

아래는 제 Pokémon Champions 파티입니다. 이 컨텍스트 위에서 질문드릴게요. (배틀 모드: **싱글 1대1**)

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

내 질문:
`,
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

아래는 제 Pokémon Champions 파티입니다. **더블 배틀(2대2)** 을 전제로 답해주세요 — 리드 2마리 동시 출전, 스프레드·시너지·파트너 지원 기술 모두 고려.

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

Below is my Pokémon Champions party. I'll ask a question on top of this context. (Battle mode: **Singles 1v1**)

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

---

My question:
`,
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Below is my Pokémon Champions party. Please answer assuming **Doubles (2v2)** — two leads on the field at once, consider spread, partner synergy, and ally-support moves throughout.

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

  // ── Double-only templates ─────────────────────────────────────
  {
    id: "leads",
    mode: "double",
    titleKey: "prompts.tmpl.leads.title",
    descKey: "prompts.tmpl.leads.desc",
    requiresPokemonPool: false,
    body: {
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

**더블 배틀(2대2)** 에서 이 파티의 **리드 2마리 조합**을 추천해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 6마리 중에서 **유력한 리드 페어 2개**를 제안. 각 페어마다:
   - \`A (slug) + B (slug)\` 형식으로 조합 이름
   - **시너지 유형** — Fake Out 템포 · Redirect (Follow Me/Rage Powder) · 날씨 세팅·어뷰즈 · Trick Room · Tailwind · Intimidate + 물공 어태커 · 기타
   - 이 페어가 **어떤 상대에게 강한지** (한 줄)
   - 이 페어의 **약점** (스프레드 공유 취약 / 둘 다 느림 / 스피드 밀림 등, 한 줄)
2. 첫 턴 플랜 — 각 리드의 **기술 + 타깃** 명시. 예: "A 는 Fake Out → 상대 C 막기. B 는 Protect 로 상대 반응 파악." 기술은 해당 포켓몬의 \`moves\` 배열에 있는 것만.
3. 2번째 턴 전개 예상 (상대가 보수적으로 Protect / 공격적으로 스프레드 / 백 교체 3가지 시나리오 각 한 줄).
4. 리드 페어로 **절대 쓰지 말아야 할 2마리 조합** 1개 (공유 약점 · 시너지 전무 등).

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Recommend the best **lead pair (2 Pokémon)** for this party in **Doubles (2v2)**.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Analysis requests:
1. Propose **2 viable lead pairs** from the 6 members. For each pair:
   - \`A (slug) + B (slug)\` as the combo label
   - **Synergy type** — Fake Out tempo · Redirect (Follow Me/Rage Powder) · Weather setter+abuser · Trick Room · Tailwind · Intimidate + physical attacker · other
   - **Who this pair is strong against** (one line)
   - **Weaknesses** of this pair (shared spread weakness / both slow / outsped, etc. — one line)
2. First-turn plan — specify each lead's **move + target**. Example: "A uses Fake Out → opposing C to interrupt. B Protects to read their response." Moves must be in each Pokémon's \`moves\` array.
3. Turn-2 branches (opponent plays conservatively with Protect / aggressively with spread / swaps in backline — one line per scenario).
4. Name **one lead pair that should never be used together** (shared weakness, no synergy, etc.).

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "spread",
    mode: "double",
    titleKey: "prompts.tmpl.spread.title",
    descKey: "prompts.tmpl.spread.desc",
    requiresPokemonPool: false,
    body: {
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

**더블 배틀(2대2)** 관점에서 이 파티의 **스프레드 공격 효율**을 점검해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- 기술 상세: {{MOVES_JSON_URL}}

맥락: 더블에서 스프레드 공격(상대 2마리 동시 타격)은 0.75배 보정되지만, 누적 데미지와 템포 측면에서 핵심. 대신 **아군 피해 위험** 이 있어 파트너 조합을 신중히 골라야 함.

대표 스프레드 기술 (target: all-opponents / all-other-pokemon): Earthquake / Surf / Muddy Water / Heat Wave / Rock Slide / Dazzling Gleam / Hyper Voice / Discharge / Blizzard / Eruption / Water Spout / Icy Wind / Bulldoze / Razor Leaf 등.

분석 요청:
1. 파티원의 **실제 선택된 기술 중 스프레드 기술 목록** (moves.json 기준). 각 기술에 대해:
   - 누구의 기술인지 + \`기술명 (slug, 타입/위력/명중)\`
   - **아군 피해 위험**: 같은 필드에 나올 수 있는 아군이 이 기술에 취약한지 (예: Earthquake + 비행·부유 아군은 안전, 지면 아군은 위험)
   - 이 기술을 **안전하게 쓸 수 있는 파트너 조합** (기존 6마리 중)
2. **스프레드 커버리지 빵꾸** 진단 — 흔히 필요한 스프레드 타입(물/불/땅/바위/얼음/페어리) 중 이 파티에 없는 건 무엇? 기존 learnable 중 채워넣을 수 있는 후보가 있는지 제안 (해당 포켓몬의 \`moves\` 배열에 있을 때만).
3. **리드 페어 + 스프레드 조합 1가지 예시** — "A 리드 + B 리드, A 가 X 스프레드 쓸 때 B 는 Protect 로 회피" 같은 한 턴 콤보.

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Evaluate this party's **spread-move efficiency** in **Doubles (2v2)**.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}
- Move details: {{MOVES_JSON_URL}}

Context: in doubles, spread moves (hit both opponents) are at 0.75× but their cumulative damage and tempo are central to most strategies. The tradeoff is **ally damage risk** — partner pairings have to be chosen carefully.

Representative spread moves (target: all-opponents / all-other-pokemon): Earthquake / Surf / Muddy Water / Heat Wave / Rock Slide / Dazzling Gleam / Hyper Voice / Discharge / Blizzard / Eruption / Water Spout / Icy Wind / Bulldoze / Razor Leaf, etc.

Analysis requests:
1. **List the spread moves currently selected** across the party (from moves.json). For each:
   - Who owns it + \`Move name (slug, type/power/accuracy)\`
   - **Ally-damage risk**: is any teammate that can share the field with this user vulnerable to it? (e.g. Earthquake is safe with Flying/Levitate allies, lethal with Ground allies)
   - **Which partner pairings make this move safe** (from the existing 6)
2. Diagnose **spread-coverage gaps** — among the commonly needed spread types (Water/Fire/Ground/Rock/Ice/Fairy), which is missing? Suggest slugs the existing roster could add (only if present in that Pokémon's \`moves\` array).
3. Provide **one example lead pair + spread combo** — a single turn like "A leads + B leads; A fires X (spread) while B Protects to dodge its side-splash."

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },

  {
    id: "synergy",
    mode: "double",
    titleKey: "prompts.tmpl.synergy.title",
    descKey: "prompts.tmpl.synergy.desc",
    requiresPokemonPool: false,
    body: {
      koDouble: `${SHARED_DISCLAIMER_KO}

${STRICT_POOL_RULES_KO}

---

**더블 배틀(2대2)** 관점에서 이 파티의 **시너지·역할 구성** 을 점검해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

맥락: 더블의 주요 팀 아키타입 — **Fake Out 리드 / Redirect / 날씨 (일·비·모래·눈) / Trick Room / Tailwind / Intimidate + 물공 / Screens / 스탠다드 밸런스**. 좋은 팀은 보통 1~2개 코어 시너지 축이 뚜렷하고, 이를 지원·백업할 역할이 짜여 있음.

분석 요청:
1. 이 파티의 **아키타입 식별** 한 줄 — 가장 유력한 코어는? (예: "Tailwind 공세팟", "Trick Room 저속팟", "스탠다드 밸런스 (뚜렷한 축 없음)", "Intimidate 서포트 + 물리 어태커")
2. 파티에 실제 존재하는 **시너지 페어** 3개 이하로 짚어줘 (능력·특성·기술 기준으로 검증 — abilities.json / moves.json 실존 확인):
   - \`A + B\` — "A 의 XX 특성/기술 이 B 의 YY 를 지원" 한 줄
3. **빠진 더블 핵심 역할** (redirect / 속도 조절 / Fake Out / Protect 미보유 등) 나열.
4. **보완 제안** — 기존 6마리의 **특성·도구·기술만 조정해서** 채울 수 있는 시너지가 있는지 (추가 포켓몬 교체 없이). 예: "현재 A 의 특성을 XX 로 바꾸면 B 와 redirect 시너지 성립" (해당 포켓몬의 \`abilities\` / \`moves\` 에 있을 때만).
5. 교체까지 고려한 **최우선 보강 포인트** 1가지 (AI 의 교체 후보 제안은 이 프롬프트에서 강요하지 않음 — swap 템플릿 몫).

파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
      enDouble: `${SHARED_DISCLAIMER_EN}

${STRICT_POOL_RULES_EN}

---

Evaluate this party's **synergy and role composition** in **Doubles (2v2)**.

- Party URL: {{PARTY_URL}}
- Site guide: {{LLMS_TXT_URL}}

Context: common doubles archetypes — **Fake Out leads / Redirect / Weather (sun/rain/sand/snow) / Trick Room / Tailwind / Intimidate + physical / Screens / Standard balance**. Good teams usually have 1–2 clear synergy cores plus backing roles.

Analysis requests:
1. **Archetype call** in one line — what's the most likely core? (e.g. "Tailwind offense", "Trick Room low-speed", "Standard balance (no strong axis)", "Intimidate support + physical attackers")
2. Name up to **3 actual synergy pairs** in this party (verified against abilities.json / moves.json):
   - \`A + B\` — "A's XX ability/move supports B's YY" (one line each)
3. List **missing doubles-core roles** (redirect / speed control / Fake Out / no Protect, etc.).
4. **Adjustment suggestions** — any synergy that can be unlocked by only **changing abilities/items/moves of the existing 6** (no swaps). Example: "If A switches ability to XX, it pairs with B for redirect" (only if that ability/move is actually in A's \`abilities\` / \`moves\`).
5. Name the **single highest-priority reinforcement point** (this template does not require suggesting a swap candidate — that's the swap template's job).

Party inline data:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`
`,
    },
  },
];

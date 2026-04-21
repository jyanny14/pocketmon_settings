export const SHARED_DISCLAIMER =
  "이 데이터는 **Pokémon Champions** 기준입니다. 본편 시리즈(Scarlet/Violet 등)와 일부 밸런스·특성·아이템이 다릅니다. 제공된 JSON/URL 을 진실의 소스로 삼고, 사전지식과 충돌하면 제공된 데이터를 따라주세요. Champions 고유 변경점 플래그: `abilities.json[].isNewInChampions`, `moves.json[].updatedInChampions`.";

// Strict pool constraint — prepended to every template. The wording is
// intentionally blunt and redundant because models keep hallucinating SV/Z-A
// species, fake abilities, and non-existent items. This applies broadly:
// any recommendation (Pokémon / ability / item / move) must trace back to a
// slug in the fetched JSON.
export const STRICT_POOL_RULES = `**데이터 제약 (엄격 · 반드시 준수 · 위반 시 답변 무효)**

1. **진실의 소스 우선순위**: (a) fetched JSON > (b) fetched HTML 레퍼런스 > (c) 인라인 JSON > (d) 그 외 어떤 것도 금지. 아래 URL 들 중 fetch 가능한 것을 반드시 시도하세요.
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
2. **Fetch 가 모두 불가능하면**: 답변을 거부하지 말고, 인라인 JSON 만 진실의 소스로 사용하세요. 인라인만으로 부족하면 "어느 파일의 내용을 붙여 주세요" 라고 유저에게 요청하세요.
3. **Pokémon Champions 에 존재하는 전부**는 위 소스들에 담긴 항목입니다. **당신의 사전 지식은 이 상황에서 틀릴 확률이 매우 높습니다.** Champions 는 본편(Scarlet/Violet, Legends: Z-A 등)과 **다른 라인업**입니다. 본편엔 있지만 Champions 엔 없는 포켓몬/특성/도구/기술이 많으며, 본편과 수치가 다른 기술도 16개 있습니다. 위 소스에 없으면 Champions 에 없다고 간주하세요.
4. **모든 추천 항목에 slug 병기 + 출처 명시**: \`아머까오 (slug: corviknight, 출처: pokemon.json)\` · \`지진 (slug: earthquake, 출처: moves.json)\` 형식. slug 가 없거나 틀리거나 출처 명시가 없으면 규칙 위반.
5. 특성·기술을 특정 포켓몬에 붙일 때는 해당 폼의 \`abilities\` / \`moves\` 배열에 **실제로 존재해야** 합니다. (폼 외 특성·비배움 기술 제안 금지.)
6. **불확실하면 제안하지 마세요.** 어떤 포켓몬/기술/특성/도구가 Champions 에 있는지 **확신할 수 없다면** (= 위 소스에서 직접 확인할 수 없다면) 그것을 포함하지 말고 "확인 가능한 범위 안에서" 다른 것으로 대체하거나 "해당 조건에 맞는 항목을 찾지 못함" 이라고 명시하세요. **사전 지식에 의존한 '아마도 있을 것' 은 금지.**
7. **자기 검증 (최종 단계)**: 답변 작성 직후 전송 직전에, 본인이 언급한 **모든 포켓몬·특성·도구·기술 이름** 을 하나씩 체크리스트로 돌려보세요. 각각에 대해 "이 slug 가 위 소스에 실제로 있는가?" 답이 "yes" 인 것만 유지. "잘 모르겠다" 는 제거. 제거 후 답변이 비어버리면 "Champions 데이터 내에서 조건을 만족하는 항목을 찾지 못함" 이라고 답하세요.`;

export const TEMPLATES = [
  {
    id: "weakness",
    titleKey: "prompts.tmpl.weakness.title",
    descKey: "prompts.tmpl.weakness.desc",
    requiresPokemonPool: false,
    body: `${SHARED_DISCLAIMER}

${STRICT_POOL_RULES}

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
  },

  {
    id: "swap",
    titleKey: "prompts.tmpl.swap.title",
    descKey: "prompts.tmpl.swap.desc",
    requiresPokemonPool: true,
    body: `${SHARED_DISCLAIMER}

${STRICT_POOL_RULES}

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
  },

  {
    id: "moveset",
    titleKey: "prompts.tmpl.moveset.title",
    descKey: "prompts.tmpl.moveset.desc",
    requiresPokemonPool: false,
    body: `${SHARED_DISCLAIMER}

${STRICT_POOL_RULES}

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
  },

  {
    id: "fill",
    titleKey: "prompts.tmpl.fill.title",
    descKey: "prompts.tmpl.fill.desc",
    requiresPokemonPool: true,
    body: `${SHARED_DISCLAIMER}

${STRICT_POOL_RULES}

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
  },

  {
    id: "counter",
    titleKey: "prompts.tmpl.counter.title",
    descKey: "prompts.tmpl.counter.desc",
    requiresPokemonPool: false,
    body: `${SHARED_DISCLAIMER}

${STRICT_POOL_RULES}

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
  },

  {
    id: "free",
    titleKey: "prompts.tmpl.free.title",
    descKey: "prompts.tmpl.free.desc",
    requiresPokemonPool: false,
    body: `${SHARED_DISCLAIMER}

${STRICT_POOL_RULES}

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
  },
];

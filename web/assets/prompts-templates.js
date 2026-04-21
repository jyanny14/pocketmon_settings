export const SHARED_DISCLAIMER =
  "이 데이터는 **Pokémon Champions** 기준입니다. 본편 시리즈(Scarlet/Violet 등)와 일부 밸런스·특성·아이템이 다릅니다. 제공된 JSON/URL 을 진실의 소스로 삼고, 사전지식과 충돌하면 제공된 데이터를 따라주세요. Champions 고유 변경점 플래그: `abilities.json[].isNewInChampions`, `moves.json[].updatedInChampions`.";

// Strict pool constraint — prepended to templates that ask AI to recommend
// Pokémon (swap/fill). The wording is intentionally blunt and redundant
// because models keep hallucinating SV/Z-A species that Champions does not
// contain.
export const STRICT_POOL_RULES = `**데이터 제약 (엄격 · 반드시 준수)**

1. 답변 전에 먼저 {{POKEMON_JSON_URL}} 을 fetch 하세요. fetch 에 실패하면 답변하지 말고 "pokemon.json fetch 실패로 답변 불가" 라고만 응답하세요. **사전 지식으로 답을 만들지 마세요.**
2. Pokémon Champions 에 존재하는 포켓몬은 **pokemon.json 배열의 186 species / 267 forms 가 전부입니다.** SV 후반부 미추가 종, Legends: Z-A 신규 종 일부, 그 외 어떤 포켓몬도 이 목록에 없으면 Champions 에 존재하지 않습니다. 제안 금지.
3. 추천하는 모든 포켓몬은 \`종족명 (slug: {pokemon.json 의 정확한 slug})\` 형식으로 표기하세요. 예: \`아머까오 (slug: corviknight)\`. 이 형식이 없거나 slug 가 틀리면 규칙 위반입니다.
4. 특성·도구·기술도 동일: 추천 특성은 해당 포켓몬 폼의 \`abilities\` 배열, 추천 도구는 items.json, 추천 기술은 해당 포켓몬의 \`moves\` 배열에 **실제로 존재해야** 합니다. 존재하지 않으면 제안 불가.
5. **자기 검증**: 최종 답변 직전, 본인이 제안한 모든 slug(포켓몬·특성·도구·기술)가 fetch 한 데이터에 실제로 있는지 한 번 더 확인하세요. 없는 항목은 조용히 대체하지 말고 **"해당 조건을 만족하는 Champions 포켓몬을 찾지 못했다"** 라고 명시하세요.`;

export const TEMPLATES = [
  {
    id: "weakness",
    titleKey: "prompts.tmpl.weakness.title",
    descKey: "prompts.tmpl.weakness.desc",
    requiresPokemonPool: false,
    body: `${SHARED_DISCLAIMER}

아래 파티의 **방어적 약점**을 분석해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 6마리 전부에게 2배 이상 대미지를 주는 공격 타입이 있는지 (있다면 그 타입과 몇 마리가 약한지).
2. 파티 전체가 내성(0.5배 이하)을 공유하는 타입 / 그 반대로 누구도 내성이 없는 타입.
3. 위험한 약점을 가장 잘 메울 수 있는 **현 파티 내의 스위칭 전략** 제안.
4. 교체가 아니라 **도구/특성 조정**으로 완화할 수 있는 부분이 있다면 함께.

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

아래 파티 **각 포켓몬의 4기술 세팅**을 제안해주세요.

- 파티 URL: {{PARTY_URL}}
- 사이트 가이드: {{LLMS_TXT_URL}}
- **반드시 fetch**: {{POKEMON_JSON_URL}} (각 포켓몬의 learnable \`moves\` 배열), {{MOVES_JSON_URL}} (기술별 type / category / power / accuracy / pp / \`updatedInChampions\`).

규칙:
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

상대 파티에 맞춘 **대응 전략**을 짜주세요.

- 내 파티 URL: {{PARTY_URL}}
- 상대 파티 URL: (아래 "OPPONENT_URL" 자리에 붙여넣으세요)
  OPPONENT_URL =
- 사이트 가이드: {{LLMS_TXT_URL}}

분석 요청:
1. 상대 6마리 중 내 파티에 **가장 위험한 2마리**를 꼽고 이유.
2. 각 위험 대상을 상대할 내 **1순위·2순위 담당자**와 기술.
3. 내 파티가 **먼저 내밀면 안 되는 포켓몬** 과 그 이유.
4. 선봉으로 추천하는 포켓몬 한 마리 + 첫 턴 플랜.

내 파티 인라인 데이터:
\`\`\`json
{{PARTY_INLINE_JSON}}
\`\`\`

(상대 파티 데이터가 필요하면 위 OPPONENT_URL 을 fetch 하거나, 내가 JSON 으로 같이 붙여드릴게요.)
`,
  },

  {
    id: "free",
    titleKey: "prompts.tmpl.free.title",
    descKey: "prompts.tmpl.free.desc",
    requiresPokemonPool: false,
    body: `${SHARED_DISCLAIMER}

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

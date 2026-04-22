# AI 프롬프트 템플릿

`web/prompts.html` 이 렌더하는 5종 프롬프트의 개요. **실제 원문(소스 오브 트루스)은
`web/assets/prompts-templates.js`** 이며, 이 파일은 읽기 편한 요약본입니다. 수정은
JS 쪽에서 하고 여기는 동기화만 합니다.

## 공용 디스클레이머

모든 템플릿 상단에 붙는 한 블록. 목적: AI가 본편(SV 등) 지식으로 답하지 않도록 Pokémon Champions 기준임을 못 박고, 우리가 주는 JSON/URL 을 진실의 소스로 지정.

## 진실의 소스 — Step 0 / Step 1 구조

`STRICT_POOL_RULES_KO` / `STRICT_POOL_RULES_EN` 규칙 1 은 **두 단계**로 나뉘어 있음. (1) **Step 0**: 챗에 `champions-data*.json` 첨부가 있으면 그것만 써라 — URL fetch 금지, 재-첨부 요청 금지, 이전 턴 요약 재사용 금지. (2) **Step 1**: 첨부가 전혀 없을 때에만 기존 폴백 (fetched JSON → HTML → 인라인 JSON) 시도. 이 구조는 fetch 결과가 긴 대화에서 요약·압축되며 손실되는 반면 첨부 파일은 재조회 가능하다는 전제 위에 설계됨.

## 플레이스홀더

- `{{PARTY_URL}}` — 현재 브라우저의 파티 URL (절대 URL).
- `{{LLMS_TXT_URL}}` — 배포 도메인의 `/llms.txt`.
- `{{POKEMON_JSON_URL}}` — 배포 도메인의 `/data/pokemon.json` (교체 추천에서만 사용).
- `{{PARTY_INLINE_JSON}}` — 현재 파티 6마리의 **필요 최소치** 발췌 JSON.

## 인라인 JSON 발췌 규칙

corpus.json 전체(~924KB)는 프롬프트에 넣기 부적절. 각 슬롯마다:

- pokemon: `slug`, `nameKo`, `nameEn`, `dex`, 선택된 form 의 `name`·`types`·`stats`·`abilities`.
- 선택된 ability 1건: `slug`, `nameKo`, `nameEn`, `description`, `isNewInChampions`.
- 선택된 item 1건: `slug`, `nameKo`, `nameEn`, `effect`.
- 해당 form 의 `learnableMoves` 전체(있으면) 또는 최대 40건, 각 기술의 `type/category/power/accuracy/pp/updatedInChampions`.

type_chart 는 포함하지 않음 (AI 가 이미 안다고 전제).

## 5종 템플릿

| id | 제목 | 요약 | `pokemon.json` fetch 필요? |
|---|---|---|---|
| `weakness` | 약점 분석 | 파티 공통 약점·내성 · 방어 빈구멍 · 스위칭/도구 완화 | 아니오 |
| `swap` | 교체 추천 | 약한 고리 슬롯 한 자리를 바꿀 3후보 제시 | **예** — 후보 풀 필요 |
| `moveset` | 기술 조합 | 각 포켓몬 4기술 세팅 (learnableMoves 범위 안에서) | 아니오 |
| `counter` | 상대 파티 카운터 | 상대 URL 붙이면 위험 대상·선봉·대응 루트 | 아니오 (상대 URL 제공 시 fetch 선택) |
| `free` | 자유 질문 | 파티 컨텍스트만 주입하고 사용자 질문 이어 붙이는 빈 틀 | 아니오 |

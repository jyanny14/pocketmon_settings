# 일본어 / 중국어 지원 계획 (i18n 확장)

## 배경

현재 사이트는 **한국어 / 영어** 두 언어만 지원한다. 언어 전환은
`web/assets/i18n.js` 의 `STRINGS.ko` / `STRINGS.en` 사전 + `getLang()` /
`setLang()` 토글로 이뤄지고, 데이터(JSON) 는 `nameKo` + `nameEn` · `gameText` +
`gameTextKo` 같은 **필드 접미사** 패턴으로 양 언어를 함께 저장한다.

일본어(`ja`) · 중국어 간체(`zh-Hans`) 지원을 추가한다. 번체(`zh-Hant`) 는
1단계 범위 밖. 최종 목표 언어셋: **ko / en / ja / zh-Hans (4개)**.

대전 초보가 AI 에게 파티 상담하는 구조를 일어·중어권 플레이어에게도 제공 — 이게
프로젝트 취지와 직결되는 우선순위.

## ⚠️ 핵심 원칙 — 이름은 반드시 API 공식 지역화를 따른다

**포켓몬 · 도구 · 기술 · 특성의 "이름(name)" 은 PokeAPI 의 공식 지역화된 값을
그대로 가져와야 하며, LLM 번역 · 사람 임의 번역 · 음차 생성 모두 금지한다.**

이유:
- 각 언어의 포켓몬 이름은 **게임 내에서 실제로 그렇게 표기되는 고유 번역** 이다
  (예: `bulbasaur` → en `Bulbasaur` · ko `이상해씨` · ja `フシギダネ` · zh `妙蛙种子`).
  번역이 어긋나면 **유저가 자기 게임 화면에서 본 이름으로 검색했을 때 결과가
  안 나오는 로컬라이징 버그** 가 된다 — 프로젝트 목적 자체가 무너짐.
- 도구·기술·특성도 동일. 일·중·한 각각 공식 명칭이 정해져 있고, 임의 번역은
  "기합의띠" / "気合のハチマキ" / "气势头带" 같은 공식 표기에서 벗어날 위험.

### 이름 필드의 데이터 소스 규칙 (엄격)

| 소스 | 허용 용도 |
| --- | --- |
| ✅ PokeAPI `/pokemon-species/` · `/ability/` · `/item/` · `/move/` 의 `names[].language.name` | 정식 경로. 가능한 한 이걸로만. |
| ✅ 수동 override (`data/manual/*_names_{lang}.json`) | **PokeAPI 에 존재하지 않는 항목만**. Champions 신규 포켓몬·메가스톤·신규 특성처럼 본편 API 에 없는 경우. 반드시 **공식 출처(공식 게임 스크린샷·Bulbapedia·포켓몬 공식 위키 일·중 판)** 에서 크로스체크한 값을 넣고, 파일 최상단 `_comment` 에 검증 출처를 남긴다. |
| ❌ LLM 번역 | **이름에 대해서는 전면 금지.** 한자 음차·유사 번역·음역으로 비슷해 보여도 공식 명칭과 **한 글자라도 다르면** 로컬라이징 실패. |
| ❌ 사람 임의 번역 | 동일 금지. 역자의 "이게 자연스럽지 않나" 판단 금지. |

### 설명/효과 필드는 별도 규칙 (Phase 2)

`gameText*` · `description*` · `effect*` · `flavorText*` 같은 **설명** 텍스트는
PokeAPI 우선이되, 없으면 LLM 번역 허용 (단 `"translated_by_llm": true` 플래그 +
원본 영어 병기 + 사후 검수). 이건 "고유명사" 가 아닌 "설명문" 이라 의역의 여지가 있음.
설명과 이름은 **반드시 구분해 처리**.

### 검증 단계 의무화

Phase 1 빌드 후 다음을 수행해 누락·오염을 잡는다.

1. 각 `web/data/*.json` 에서 `nameJa` · `nameZh` 가 **null · 빈 문자열 · 영어 원문
   그대로** 인 항목을 리스트업 (`scripts/validate_names_i18n.py` 신규).
2. 해당 항목이 Champions 신규가 아니면 PokeAPI 재-fetch 로 원인 확인 (쿼터 제한·
   언어 코드 오타·슬러그 매핑 실패 등).
3. Champions 신규로 PokeAPI 미수록인 경우만 `data/manual/*_names_{lang}.json` 에
   **출처를 명시한** 수동 값 추가. 그 외는 출력 실패로 취급하고 빌드 블록.

---

## 범위 — 3 Phase 로 나눔

| Phase | 내용 | 예상 노력 |
| --- | --- | --- |
| **Phase 1 — 이름·UI** | UI 문자열 + 포켓몬/특성/도구/기술 이름만 ja·zh 추가. 설명/효과 텍스트는 폴백(en) 유지. | 中 (PokeAPI 자동 수집 가능) |
| **Phase 2 — 설명·효과** | `gameText*` / `description*` / `effect*` / `flavorText*` ja·zh 채움. PokeAPI 미제공 필드는 수동 override. | 大 (아이템 효과는 100% 수동, 인공 번역 + 검수 필요) |
| **Phase 3 — AI 프롬프트 + HTML 레퍼런스** | `prompts-templates.js` 39 템플릿 × ja·zh 바디 추가. `web/reference/*.html` 을 언어별 분리 페이지로 재설계. | 大 (39 템플릿 번역은 LLM 보조 + 사람 검수 필요, 검증 부담 큼) |

각 Phase 는 독립 배포 가능 — Phase 1 만 배포해도 이름/UI 까지는 다국어.
Phase 2·3 은 시장 반응 / 수요 확인 뒤 결정.

---

## Phase 1 — 이름 · UI (1차 범위)

### 1.1 목표

- 사이트 언어 토글에 `日本語` · `简体中文` 선택지 추가 (총 4 언어).
- 포켓몬·특성·도구·기술 **이름** 이 선택 언어로 표시 (설명/효과는 영어로 폴백).
- 파티 빌더·검색·필터 등 **UI 텍스트** 전체가 선택 언어로 표시.

### 1.2 데이터 필드 확장

`name*` 필드 패턴을 유지하되 언어만 추가:

| 현재 | 추가 |
| --- | --- |
| `nameKo` + `nameEn` | `nameJa` + `nameZh` |
| `forms[].nameKo` | `forms[].nameJa` · `forms[].nameZh` |
| (이름만 범위 — 설명 필드는 Phase 2) | — |

**대안 고려** (채택 안 함): `name: { ko, en, ja, zh }` 객체 구조.
깔끔하지만 `abilityDisplayName()` · `itemDisplayName()` · `moveDisplayName()` 과
39 템플릿 · `extractSlot()` 등 **20+ 헬퍼 함수를 전부 재작성** 해야 해서
범위 대비 위험. 접미사 유지가 최소 변경.

### 1.3 PokeAPI 수집 스크립트 신규

| 신규 스크립트 | 출력 | 기반 |
| --- | --- | --- |
| `scripts/fetch_pokemon_names_i18n.py` | `data/processed/pokemon_names_{lang}.json` | `/api/v2/pokemon-species/{id}/` `names[].language.name == "ja"|"zh-Hans"` |
| `scripts/fetch_ability_names_ja.py` · `_zh.py` | `data/processed/ability_names_{lang}.json` | `/api/v2/ability/{slug}/` |
| `scripts/fetch_item_names_ja.py` · `_zh.py` | `data/processed/item_names_{lang}.json` | `/api/v2/item/{slug}/` |
| `scripts/fetch_move_names_ja.py` · `_zh.py` | `data/processed/move_names_{lang}.json` | `/api/v2/move/{slug}/` |

**구현 전략**: 현재 `fetch_ability_names_ko.py` 를 템플릿으로 복제 후 언어 코드
파라미터화. 공통 로직을 `scripts/fetch_names_i18n.py` 1개 파일로 통합
(`--lang ja --target ability` 형식) 하는 것이 유지보수에 유리.

**PokeAPI 언어 코드 확인 필요**: `ja` (표준) vs `ja-Hrkt` (히라가나),
`zh-Hans` vs `zh` — 실제 데이터 존재 여부를 먼저 샘플 1개로 확인 후 확정.

### 1.4 수동 override (Champions 신규 항목 대응)

Champions 신규 포켓몬·메가스톤·신규 특성은 PokeAPI 에 ko 조차 없어
`data/manual/*_ko.json` 에서 보완 중. ja·zh 도 동일 구조 반복:

- `data/manual/ability_names_ja.json` · `ability_names_zh.json`
- `data/manual/item_names_ja.json` · `item_names_zh.json`
- (이름 범위라 `item_effects_*` / `ability_descriptions_*` 은 Phase 2)

빈 stub 파일부터 만들어 놓고 필요 시 채움 (현재 `_ko` 도 14~24 건 수준).

**🚨 override 작성 시 반드시 지킬 것 (위 "핵심 원칙" 절 참고)**:
- **PokeAPI 에 없는 항목에만** 수동 값 추가. "있는데 귀찮아서 직접 적음" 금지.
- 값은 **공식 출처 크로스체크 필수** — 포켓몬 공식 사이트 일·중 판, Bulbapedia
  ja·zh 미러, 공식 트레일러·스크린샷 등. LLM 번역 절대 금지.
- 파일 최상단 `_comment` 에 검증 출처 + 검증 일자 기록 (예:
  `"검증: bulbapedia ja 2026-04, 공식 트레일러 2026-03"`).
- 검증 불가 항목은 **빈 값** 으로 두고 빌드 시 경고. 추측 금지.

### 1.5 `scripts/build.py` 수정

- `_load_string_map()` 가 `ko` 말고도 `ja` · `zh` 를 각각 읽도록 확장.
- `build_pokemon()` · `build_abilities()` · `build_items()` · `build_moves()` 내부에서
  `nameJa` · `nameZh` 필드를 붙이도록 수정 (로직은 `nameKo` 와 대칭).

### 1.6 UI i18n 사전 확장

`web/assets/i18n.js`:

- `STRINGS.ja` · `STRINGS.zh` 키 추가 (현재 ko 300+ 키 그대로 복제 후 번역).
- `getLang()` 반환값에 `"ja"` · `"zh"` 추가.
- `setLang()` 에서 허용 값 확장 (`["ko", "en", "ja", "zh"]`).
- `STRINGS[_lang][key] → STRINGS.en[key] → STRINGS.ko[key] → key` 3단 폴백.
  (영어를 1차 폴백으로 끌어올려 일·중 누락 시 자연스러움.)

### 1.7 언어 토글 UI

현재 `#lang-toggle` 이 2-way 버튼. 4 언어로 늘어나면:

- **옵션 A**: 세그먼트 `[한][EN][日][中]` — 모바일에서 꽤 좁음.
- **옵션 B**: 드롭다운 `<select>` (추천). 기존 버튼 자리를 그대로 차지하면서 확장성 확보.
- **옵션 C**: 아이콘 버튼 + 팝오버 리스트.

**추천**: B 드롭다운. `#lang-toggle` 의 버튼을 `<select id="lang-select">` 으로
교체. 모든 8 HTML 페이지 (`index.html`, `pokemon.html`, ...) 동시 수정.
CSS `.lang-toggle` 셀렉터 범위 조정.

### 1.8 표시 헬퍼 함수 수정

`web/assets/app.js` (110–156 줄 일대):

- `abilityDisplayName(a)`, `itemDisplayName(i)`, `moveDisplayName(m)` 등을
  `switch (getLang()) { case "ja": return a.nameJa ?? a.nameEn; ... }` 패턴으로 확장.
- `gameTextKo` / `descriptionKo` / `effectKo` / `flavorTextKo` 헬퍼들은 **Phase 1
  에서는 건드리지 않음** — ja·zh 모드에서도 en 폴백으로 동작.

### 1.9 AI 프롬프트 — Phase 1 에서는 en 고정

`prompts.js` `resolveBody()` 가 `ja` / `zh` 모드에서도 **en 바디** 를 돌려주도록
임시 처리. 파티 인라인 JSON 만 ja/zh 필드를 담도록 `LANG_DROP_FIELDS` 확장.
프롬프트 본문 번역은 Phase 3.

### 1.10 Phase 1 작업 체크리스트

1. PokeAPI 언어 코드 샘플 확인 (`/api/v2/pokemon-species/1/` 로 `japanese`/`chinese` 실제 키 확정).
2. `scripts/fetch_names_i18n.py` 통합 스크립트 작성 (ability/item/move/pokemon × lang 파라미터).
3. `data/processed/*_names_ja.json` · `*_names_zh.json` 생성 실행.
4. `data/manual/*_names_ja.json` · `_zh.json` 빈 stub (실제 값 채우기는 검증 단계 후).
5. `scripts/build.py` 확장 → `web/data/*.json` 에 `nameJa`, `nameZh` 필드 추가.
6. **`scripts/validate_names_i18n.py` 신규** — 각 `web/data/*.json` 에서 `nameJa` / `nameZh` 가 비거나 영어 폴백인 항목 리스트업. 결과를 `data/processed/missing_names_{lang}.txt` 로 출력. **누락이 "Champions 신규" 이외에 존재하면 빌드 실패** 로 처리 (config 플래그로 완화 가능).
7. 검증 누락 항목 중 Champions 신규만 `data/manual/*_names_{lang}.json` 에 **공식 출처 크로스체크** 값 기입 (LLM · 추측 금지). 출처는 파일 `_comment` 에 기록.
8. `web/assets/i18n.js` `STRINGS.ja` · `STRINGS.zh` 번역 키 추가 (UI 텍스트는 LLM 초벌 허용 — 이름이 아니라 "다음" / "검색" 같은 일반 문구).
9. `web/assets/app.js` 표시 헬퍼 함수 언어 분기.
10. 8 HTML 페이지 언어 토글 UI 를 `<select>` 로 교체.
11. `web/assets/prompts.js` `LANG_DROP_FIELDS` 에 `ja` / `zh` 케이스 추가.
12. 로컬 확인 → GitHub Pages 배포.

---

## Phase 2 — 설명 · 효과 텍스트 (2차 범위)

### 2.1 목표

- 특성 게임 설명 (`gameTextJa` · `gameTextZh`).
- 특성 확장 설명 (`descriptionJa` · `descriptionZh`).
- 도구 효과 (`effectJa` · `effectZh`).
- 기술 플레이버 (`flavorTextJa` · `flavorTextZh`).

### 2.2 데이터 소스

| 필드 | 소스 | 수동 여부 |
| --- | --- | --- |
| `gameText*Ja` | PokeAPI `/ability/{slug}/` `flavor_text_entries[]` lang=ja | 대부분 자동 |
| `gameText*Zh` | 동 lang=zh-Hans | 대부분 자동 |
| `description*` (확장) | 없음 — Bulbapedia (jp/zh 미러) 에서 긁거나 수동 번역 | 수동 |
| `effect*Ja` / `effect*Zh` | PokeAPI 일부 있음, 부족분 수동 | 반자동 |
| `flavorText*Ja` / `flavorText*Zh` | PokeAPI `/move/{slug}/` lang=ja|zh-Hans | 자동 |

**현실**: 한국어 `item_effects_ko.json` 이 **100% 수동 14 KB** 인 상황에서,
ja·zh 아이템 효과 × 117건 × 2 언어 = 234 건을 사람이 번역하는 건 과중.

**완화책**:
- LLM 번역 초벌 + 원본 영어 병기 + 주의 플래그 (`"translated_by_llm": true`).
- 커뮤니티 PR 허용 (GitHub Issues 템플릿).
- 우선순위: 메가스톤 > 일반 도구 > 나무열매.

### 2.3 표시 헬퍼 확장

`abilityGameText()` · `itemEffect()` 등에 언어 분기 4-way 스위치.

### 2.4 Phase 2 체크리스트

1. PokeAPI flavor_text/effect_entries 로부터 ja·zh 자동 수집 스크립트.
2. 수동 번역 파일 구조 정의 (`data/manual/item_effects_ja.json` 등).
3. LLM 초벌 번역 파이프라인 (선택적 — `scripts/translate_with_llm.py`).
4. `build.py` 에서 ja·zh 설명 필드 병합.
5. 표시 헬퍼 4-way 확장.
6. 번역 검수 PR 워크플로.

---

## Phase 3 — AI 프롬프트 · 레퍼런스 HTML (3차 범위)

### 3.1 프롬프트 템플릿 번역

**도전 과제**: `prompts-templates.js` 39 템플릿 × `body.{ko, en, koDouble, enDouble}` =
현재 156 바디. ja·zh 추가 시 8 바디 × 39 = **312 바디**. 모두 `SHARED_DISCLAIMER` +
`STRICT_POOL_RULES` + 질문 본문을 포함해 각 바디 100~200줄 급.

**접근**:
- `SHARED_DISCLAIMER` · `STRICT_POOL_RULES` 를 언어별 상수로 분리 (`_JA` / `_ZH` 변수 신규).
- 각 템플릿 body 는 `${STRICT_POOL_RULES_JA}\n\n${질문_ja}` 형식으로 재조립.
- **질문 본문만** 39 × 2 = 78 건 번역하면 되므로 실제 번역 작업은 감소.
- LLM 초벌 번역 후 각 템플릿 샘플 출력을 실제 AI 에 붙여보며 환각 검증.

### 3.2 HTML 레퍼런스 페이지

현재 `web/reference/pokemon.html` 등이 **ko+en 병기** 단일 파일. 4 언어는 표가
너무 넓어짐. 재설계:

- **옵션 A**: 언어별 파일 분리 (`pokemon-ja.html`, `pokemon-zh.html`). 크롤러·AI
  검색이 각 언어로 정확히 인덱싱되므로 가장 깔끔.
- **옵션 B**: 언어 토글 탭 (JS 필요) — 정적 레퍼런스 취지와 어긋남.

**추천**: A. `build_reference_html.py` 을 언어 파라미터 받도록 수정해 4 세트 생성.
상호 링크는 상단 네비에 언어 스위처.

### 3.3 Phase 3 체크리스트

1. `prompts-templates.js` 공유 상수 언어별 분리.
2. 39 템플릿 질문 본문 ja·zh 초벌 번역.
3. `resolveBody()` 4-way 확장.
4. `build_reference_html.py` 언어 파라미터화.
5. `web/reference/pokemon-{lang}.html` 등 생성 + 네비 스위처.

---

## 공통 고려사항

### 폰트 / 조판

- 현재 CSS 폰트 스택 확인 필요. 한글 + 영문에 맞춰져 있을 가능성.
- 중국어 (특히 간체) · 일본어 한자 표시에 시스템 폰트 폴백 보강:
  `"Noto Sans JP", "Noto Sans SC", "Hiragino Sans", "Microsoft YaHei", ...`

### SEO / lang 속성

- 현재 `<html lang="ko">` 하드코드. 선택 언어에 따라 `lang` 속성 동적 갱신.
- `build_reference_html.py` 에서 파일별 `lang` 고정 (Phase 3).

### URL 파라미터

- 파티 URL (`?p=...`) 은 언어 무관. 언어 선택은 localStorage 만으로 OK.
- 공유 링크에 언어 정보를 넣고 싶다면 `?lang=ja` 추가 (선택).

### 테스트

- **자동**: `scripts/validate_i18n.py` (신규) — 각 언어 키 누락·중복 체크.
- **수동**: 각 언어로 토글해 파티 빌더 한 바퀴 + AI 프롬프트 복사/붙여넣기 확인.

---

## 비범위 (이번 계획에서 제외)

- **중국어 번체 (`zh-Hant`)**: Phase 1 범위 밖. 간체 안정 후 재검토.
- **기타 언어 (프랑스어·독일어·스페인어 등)**: 현 프로젝트 동기(한·일·중 아시아권) 범위 밖.
- **RTL (아랍어 등)**: 해당 없음.
- **자동 언어 감지** (브라우저 `navigator.language` 읽어 기본값 설정): Phase 1 끝나면
  선택적으로 추가 고려.

---

## 예상 일정 (참고)

| Phase | 개발 | 번역/검수 | 합계 |
| --- | --- | --- | --- |
| Phase 1 | 3~5일 | 2~3일 (UI 300 키 × 2 언어) | ~1주 |
| Phase 2 | 3일 | 2~3주 (LLM 보조 + 검수) | ~3주 |
| Phase 3 | 4~5일 | 1~2주 (프롬프트·레퍼런스) | ~2주 |

Phase 1 만으로도 "일·중 사용자에게 노출 가능한 이름·UI" 가 완성되므로
그 시점에 배포하고 사용자 반응 보며 Phase 2/3 결정 권장.

## 참고 파일

- `web/assets/i18n.js` — `STRINGS`, `getLang/setLang`, `t()`, `applyTranslations()`
- `web/assets/app.js` L110–156 — 언어 분기 표시 헬퍼 (`abilityDisplayName` 등)
- `web/assets/prompts.js` L189–209 — `substitute()`, `LANG_DROP_FIELDS`
- `web/assets/prompts-templates.js` — 39 템플릿 · 공유 상수
- `scripts/build.py` — 모든 `web/data/*.json` 생성
- `scripts/fetch_ability_names_ko.py` 등 — 언어별 이름 수집 템플릿
- `scripts/build_reference_html.py` — 정적 레퍼런스 생성
- `data/manual/*.json` — 수동 override 스키마 참고

# TODO — AI 친화 데이터 보강 (후속 과제)

최종 목표는 이 프로젝트의 데이터를 LLM에 투입해 **Pokemon Champions 파티 조합을 추천받는 것**.
지금은 Phase 2(정적 웹앱)를 우선 진행 중이고, 아래 항목은 파티 추천 단계 직전에 몰아서 작업한다.

## 배경

- 현재 `web/data/*.json`은 serebii 파싱 결과 그대로(영문 위주, 폼별 스탯/특성까지는 있음).
- LLM이 한국어로 파티를 추천하려면 한글명/설명, 타입 상성, 게임 소스 같은 부가 정보가 함께 있어야 판단 가능.
- serebii의 `transferonly.shtml`에는 게임 소스 컬럼이 없다(확인 완료 2026-04-15).
- **게임 소스 결정의 목적은 "유저가 포켓몬 HOME을 통해 Champions로 옮겨오기 위해 어느 게임을 플레이하면 되는가"를 AI가 알려주는 것.** 첫 등장 게임이나 지역 출신 같은 족보 정보는 불필요.

## 공통 원칙

1. **스키마 문서화** — `docs/schema.md`에 모든 JSON 파일의 필드·타입·의미를 명시. LLM context로 그대로 사용 가능.
2. **키 안정성** — 한 번 정한 키는 유지. 필드 추가는 non-breaking, 삭제/변경은 마이그레이션 동반.
3. **slug 참조** — 포켓몬/어빌리티/아이템/타입 모두 slug(kebab or alphanumeric)로 교차 참조.
4. **문자열 정규화** — 모든 자연어 필드를 NFC 정규화, zero-width/HTML 엔티티 제거, 공백 정돈.
5. **한국어 필드 필수** — 모든 명사에 `nameKo`. 현재 누락: 어빌리티, 아이템.
6. **결정론적 정렬** — 배열은 안정된 키로 정렬해서 diff 최소화.
7. **메타 매니페스트** — `web/data/manifest.json`이 생성 시각·스키마 버전·파일 목록·해시를 관리. 기존 JSON 파일 구조는 건드리지 않음.

## 작업 항목

### T1. 스키마 문서 작성 — `docs/schema.md` ✅ 완료 (2026-04-17)
- pokemon/items/abilities/type_chart JSON 필드 전부 정의 (타입, 선택/필수, 예시, 의미)
- 공통 타입 18종 한국어 라벨, ObtainSource 4종, HOME 직접 연동 게임 9종 테이블
- 메가/지역폼 sourceGames 규칙 요약, 이중 타입 데미지 계산 공식 포함
- manifest.json 은 T2 완료 시 섹션 보강

### T2. `web/data/manifest.json` 도입 ✅ 완료 (2026-04-17)
- `scripts/build.py` 마지막 단계에서 `manifest.json` 생성
- 필드: `generatedAt`(UTC ISO8601), `schemaVersion`, `sources`, `files[{name,path,count,sha256}]`
- 대상: pokemon/items/abilities/type_chart. corpus.json은 이들의 bundle 이라 manifest 에 포함하지 않음 (per-file 해시 단일 소스 유지)

### T3. 문자열 정규화 유틸 ✅ 완료 (2026-04-17)
- `scripts/normalize.py` — NFC + HTML 엔티티 디코드 + zero-width/BOM/soft-hyphen 제거 + NBSP → space + 연속 공백 축소 + strip
- `scripts/build.py` — pokemon/items/abilities 의 자연어 필드(이름/설명/효과/gameText/location)에 전부 적용
- 재빌드 결과: pokemon 필드 변화 0 (원본 깨끗), items 변화 0, abilities 12건 변화(모두 문장 중간 double-space → single-space). 부작용 없음

### T8b. 아이템 한글명 미매칭 24건 ✅ (2026-04-20)
- Bulbapedia "In other languages" 섹션에서 24건 전부 공식 한국어명이 등재된 것을 확인하고 `data/manual/item_names_ko.json` 에 반영. 패턴: `{포켓몬 한국어명}나이트` (메가스톤 23건) + fairy-feather 는 `요정의깃털`.
- `items.json[].nameKo` 117/117 커버. 상세 값 및 출처는 `docs/review-translations.md` §A.
- `scripts/fetch_item_names_ko.py --force` 로 PokeAPI 뒤늦게 반영 시 자동 흡수. manual 값은 fetched 가 비어 있을 때만 활성화되는 게 아니라 우선 덮어쓰는 구조이므로 PokeAPI 표기가 원치 않을 경우 manual 우선 유지.

### T4b. 어빌리티 한글명 미매칭 14건 ✅ (2026-04-20)
- Bulbapedia "In other languages" 섹션에서 14건 전부 공식 한국어명이 등재되어 있어 `data/manual/ability_names_ko.json` 에 반영. Champions 신규 4건(드래곤스킨·메가솔라·관통드릴·하바네로분출) 포함.
- `abilities.json[].nameKo` 192/192 커버. 상세 값은 `docs/review-translations.md` §A.
- 초기 추정 후 실제로 다른 것: `armortail`(무장꼬리→테일아머), `electromorphosis`(전기바뀜→전기로바꾸기), `supremeoverlord`(백전노장→총대장). 잘못 추정해서 반영하지 않고 비워두길 잘한 케이스 — **추정 대신 공식 확인 우선** 원칙 재확인.
- 주기적 `scripts/fetch_ability_names_ko.py --force` 재실행으로 PokeAPI 뒤늦은 반영 확인 가능.

### T4. 어빌리티 한글명 수집 — `scripts/fetch_ability_names_ko.py` ✅ 완료 (2026-04-17)
- PokeAPI `ability/{slug}/` → `names[language.name='ko'].name`
- 결과: 192개 중 **178개 한국어명 수집**(92.7%), 14개 미매칭
  - 미매칭은 전부 PokeAPI 한국어 데이터가 아직 없는 Gen 9/Champions 신규 특성: `armortail`, `cudchew`, `dragonize`, `eartheater`, `electromorphosis`, `megasol`, `opportunist`, `piercingdrill`, `purifyingsalt`, `sharpness`, `spicyspray`, `supremeoverlord`, `toxicdebris`, `zerotohero`
  - `data/manual/ability_names_ko.json` 에 빈 값 stub만 생성. 공식 번역명 확보되면 채우기만 하면 build에 반영됨
- 저장 경로: `data/processed/ability_names_ko.json` (자동), `data/manual/ability_names_ko.json` (수동 override)
- serebii slug → PokeAPI slug 변환: `nameEn.lower().replace(" ", "-")` 로 192건 중 191건 자동 매칭. 예외 1건(`compoundeyes` → `compound-eyes`)만 스크립트 내 `SLUG_OVERRIDES`로 처리

### T5. 포켓몬 게임 소스 수집 — `scripts/fetch_pokeapi_game_sources.py` ✅ 완료 (2026-04-17)
- **전략 변경 (2026-04-17)**: 원래 계획이었던 `pokemon/{slug}.game_indices`는 Gen 6+ 게임을 거의 채우지 않아(Sword/Shield/SV가 charizard 등에서 누락) 사용 불가임을 확인. `pokemon-species/{slug}.pokedex_numbers`의 지역 도감 엔트리를 역매핑하는 방식으로 전환.
- 도감 → HOME 직접 연동 게임 매핑:
  - `letsgo-kanto` → LGPE
  - `galar`/`isle-of-armor`/`crown-tundra` → Sword/Shield
  - `hisui` → Legends Arceus
  - `paldea`/`kitakami`/`blueberry` → Scarlet/Violet
  - `original-sinnoh`/`extended-sinnoh` → BDSP
- 폼별 규칙 (species 결과 가공):
  - Base / Mega / 특수폼(Blade/Midnight/Dusk/Hero/Female/Variety/Alternate) → species 결과 그대로
  - Alolan → `[]` (SM/USUM는 HOME 직접 연동 아님 → T12 Bank 경유로 분리)
  - Galarian → `[sword, shield]`
  - Hisuian → `[legends-arceus]`
  - Paldean → `[scarlet, violet]`
- 호출량: species만 186회 × 0.2s + 대역폭 ≈ 140초 (폼별 PokeAPI 호출 불필요 → 당초 267회에서 줄어듦)
- 결과: 186/186 species 성공, 267 폼 전부 sourceGames 생성, 의도된 빈 배열 8건 확인. spot-check: charizard [LGPE/SwSh/SV], Hisuian Typhlosion [LA only], Paldean Tauros [SV only]
- `scripts/pokeapi_form_map.py`는 초기 전략(game_indices)용으로 작성했으나 전략 변경으로 T5에서는 사용되지 않음. 향후 T10(기술 수집)처럼 form별 `pokemon/{slug}` 엔트리가 필요한 작업에서 재사용 가능하므로 유지

### T5a. PokeAPI 폼 slug 매핑 유틸 — `scripts/pokeapi_form_map.py` ✅ 완료 (2026-04-17) (T5에서는 미사용)
- 패턴 기반 자동 변환(prefix → suffix 재배치) + 실패 시 명시적 overrides
- 변환 규칙: `Mega {X|Y}` → `{base}-mega[-x|-y]`, `Alolan/Galarian/Hisuian/Paldean` → `{base}-{region}`, 특수폼(Blade/Midnight/Dusk/Hero/Female/Variety) 및 base 자체가 variant slug로만 존재하는 경우(aegislash-shield, lycanroc-midday 등)는 override 테이블
- 267 폼 전부 PokeAPI HEAD 요청 실존 확인
- **T5에서는 species 엔드포인트로 전략이 바뀌어 실제로 사용되지 않음.** T10(기술 수집), 폼별 스프라이트/상세 데이터 수집 등 향후 작업에서 재사용 가능하므로 유지

### T6. 수동 게임 소스 오버라이드 — `data/manual/game_sources_override.json` ✅ stub 생성 (2026-04-17)
- PokeAPI에 아직 반영되지 않은 **신작 게임** 처리용 수동 매핑
- 주 용도: **Legends: Z-A** 출시 직후 Champions에 도감 추가됐지만 PokeAPI가 업데이트되기 전 기간
- 구조:
  ```json
  {
    "charizard": {"add": ["legends-z-a"], "remove": []},
    "raichu-alola": {"add": [], "remove": ["sun"]}
  }
  ```
- 병합 우선순위: **수동 오버라이드 > PokeAPI `game_indices`**
- 파일이 비어있어도 build는 정상 동작

### T7. 타입 상성 매트릭스 — `web/data/type_chart.json` ✅ 완료 (2026-04-17)
- `scripts/build_type_chart.py` 신규 — 18×18 리터럴 매핑 (Gen 6+ Fairy 포함 현행 규칙)
- 324셀 분포: 무효 8 / 비효율 61 / 기본 204 / 효과뛰어남 51 (공식 표와 일치)
- 18개 샘플 스팟체크 전부 통과

### T8. 아이템 한글명 ✅ 완료 (2026-04-17)
- `scripts/fetch_item_names_ko.py` 신규 — PokeAPI `item/{slug}/` 에서 한국어 이름 수집
- 결과: **93/117 수집 (79.5%)**. 실패 24건은 전부 Gen 9/Champions 신규 (fairy-feather 1 + Champions 신규 메가스톤 23). PokeAPI 미반영
- `data/manual/item_names_ko.json` stub 24키 (빈 값). 수동 보강 후 재빌드만 하면 반영됨
- `build.py` `build_items` 에 nameKo 병합. UI(items-list.js): ko primary + en sub 2줄 카드, 검색에 nameKo 포함, `itemDisplayName()` 공용 헬퍼 추가

### T9. 통합 코퍼스 — `web/data/corpus.json` ✅ 완료 (2026-04-17)
- `scripts/build_corpus.py` 신규 — `web/data/{manifest,pokemon,items,abilities,type_chart}.json` 을 단일 오브젝트로 묶음
- 출력: `web/data/corpus.json` (442 KB, keys=manifest/pokemon/items/abilities/type_chart)
- 전제: `build.py` + `build_type_chart.py` 선행 실행

### T10. 기술 수집 ✅ 완료 (2026-04-17)
- `scripts/parser.py` 확장 — Standard Moves 테이블에서 `/attackdex-champions/{slug}.shtml` 링크 수집, 타입 인덱스 등 오염 링크는 헤더 `startswith("Standard Moves")` 로 범위 제한
- Floette (Eternal), Meowstic (Male/Female), Basculegion (Male/Female) 처럼 Standard Moves 가 variant 별로 쪼개진 케이스는 모든 매칭 테이블에서 합산
- 186/186 포켓몬 모두 moves 보유, 평균 60.4개, **총 unique 481 기술**
- `scripts/fetch_moves.py` 신규 — PokeAPI `/move?limit=2000` 인덱스 한 번 받아 정규화 키(`.replace('-','').replace("'",'').lower()`)로 serebii slug → PokeAPI slug 매핑. 481/481 매칭 완벽
- 각 기술 `/move/{slug}/` 호출해 type/damage_class/power/accuracy/pp/한국어 이름·설명 수집 (377초). 한국어 이름 446/481, 한국어 설명 437/481
- `scripts/build_moves.py` 신규 — `data/processed/moves.json` → `web/data/moves.json` 정규화·정렬
- `scripts/build.py` manifest 에 `moves.json` 포함, `scripts/build_corpus.py` FILES 에 moves 추가 (corpus 924KB)
- UI: `pokemon-detail.js` 기술 섹션 — 이름/타입/분류(물리·특수·변화)/위력/명중/PP 6컬럼 테이블 + 클라이언트 사이드 검색 필드. i18n `detail.move.*`, `move.cat.*` ko/en 추가
- `web/assets/app.js` — `loadMoves()`, `moveDisplayName()`, `moveCategoryLabel()` 공용 헬퍼 추가

### T11. 어빌리티 한국어 설명 ✅ 완료 (2026-04-17)
- `scripts/fetch_ability_descriptions_ko.py` 신규 — T4 가 이미 채운 PokeAPI `ability/{slug}/` 캐시 재사용(네트워크 호출 없음)
- `flavor_text_entries[lang=ko]` 최신 버전 선택 → `gameTextKo` (게임 내 짧은 문구)
- `effect_entries[lang=ko]` → `descriptionKo` (상세 효과) — PokeAPI 가 한국어 effect 를 제공하지 않아 현재 0건
- 결과: **gameTextKo 176/192 (91.7%)**, descriptionKo 0
- `build.py` `build_abilities` 에 병합. UI: `abilityGameText()` / `abilityDescription()` 공용 헬퍼 (ko → en 폴백), abilities-list 카드 gameText + description 이 현재 언어에 맞게 출력, 검색에 gameTextKo 포함, pokemon-detail 특성 리스트도 같은 헬퍼 사용

### T13. serebii Pokemon Champions 미수집 페이지 — 부분 완료 (2026-04-17)

2026-04-15 pokemon.shtml 사이드바 조사 시 발견. 진행 상태:

- `moves.shtml` — ✅ T10 에서 Standard Moves 로 전량 수집 (481 기술)
- `newabilities.shtml` — ✅ 완료. 4건(piercingdrill/dragonize/megasol/spicyspray) 수집. `abilities.json` 의 `isNewInChampions: bool` 플래그로 반영
- `megaabilities.shtml` — ❌ 보류. 현재 serebii 페이지에 실제 데이터 없음(플레이스홀더 텍스트만). serebii 쪽 업데이트 시 재확인
- `updatedattacks.shtml` — ✅ 완료. 42건 파싱, 그중 우리 Standard Moves 풀(481)에 포함된 16건에 대해 PP/위력/명중을 Champions 값으로 overlay. `moves.json[].updatedInChampions: bool` 플래그
- `achievements.shtml` — ⏸️ 후순위 (리크루트 티켓 컨텍스트)
- `depositbonuses.shtml` — ⏸️ 후순위 (HOME 연동 상세)
- `training.shtml` — ⏸️ 후순위
- `statusconditions.shtml` — ⏸️ 후순위

후속 가치가 높은 미수집 항목은 상태이상 변경 (전략 구성 시 필요)과 achievements (리크루트 티켓 입수처 설명).

### T15. 폼 한글명 표시 ✅ 완료 (2026-04-17)
- 현재 `pokemon.json`의 `forms[].name`은 영문만 (`Mega Charizard X`, `Alolan Raichu`, `Hisuian Zoroark` 등). UI 한국어 모드에서도 영문 노출.
- 형식 결정: **base nameKo + 한글 접두사 패턴** (띄어쓰기 통일). 예: `메가 리자몽 X`, `알로라 라이츄`, `히스이 조로아크`.
- PokeAPI `pokemon-form/{slug}` 한글 데이터는 불완전함을 확인 (히스이/갈라르/팔데아/Hero/Female 등 다수 누락, 메가는 붙여쓰기 형식 `메가리자몽X`). 따라서 PokeAPI 의존 없이 **순수 패턴 합성** 으로 진행.
- 신규 모듈 `scripts/form_ko.py`:
  - `form_name_to_ko(form_name_en, base_name_ko) -> str`
  - 접두사 매핑: `Mega ` → `메가 `, `Alolan ` → `알로라 `, `Galarian ` → `가라르 `, `Hisuian ` → `히스이 `, `Paldean ` → `팔데아 `
  - 접미사/특수폼 매핑: `Blade Forme` → `{nameKo} 블레이드폼`, `Midnight Form` → `{nameKo} 한밤중의 모습`, `Dusk Form` → `{nameKo} 황혼의 모습`, `Hero Form` → `{nameKo} 영웅의 모습`, `Female` → `{nameKo} (암컷)`, `Small/Large/Jumbo Variety` → `{nameKo} (S/L/특대 사이즈)`, `Mr. Rime` → 그대로 base 사용, `Alternate Forms`(Rotom 묶음) → `{nameKo} 다른 폼`
  - base form(`form.name == nameEn`) → `nameKo` 그대로
- `build.py`가 `forms[].nameKo`로 합성 결과 주입
- 후속 옵션(B+): 추후 PokeAPI 폼 한글 데이터가 보강되면 cross-check 용도로 사용

### T14. 리크루트 티켓/쿠폰 데이터 (후속)
- 현재 items.json에서 **제외**됨 (사용자 결정 2026-04-15: 도구가 아니라 리크루트 시스템 아이템)
- 필요해지면 `web/data/recruit_tickets.json`으로 분리해 별도 관리
- 소스: `items.shtml`의 "Miscellaneous Items" 섹션 (21개) 또는 `recruit.shtml`의 32개
- 사용 맥락: 업적 보상 연동, 리크루트 확률 계산 등

### T12. (후속 개선) Pokémon Bank 경유 레거시 지원
- 현재 `sourceGames`는 HOME 직접 연동 게임만 포함 (Gen 8+)
- Bank 경유로 접근 가능한 Gen 3~7 게임(ORAS, XY, Sun/Moon, USUM 등)을 별도 필드 `legacyGames: [...]`로 추가 검토
- 구독 기반 접근이라 유저 경험 상 "직접 연동"과 구분 필요
- 출시 후 사용자 피드백 받아서 결정

## 한국어 커버리지 보강 (2026-04-20 완료 · 보존용)

> ✅ **모든 한국어 필드 100% 커버리지 완료**. 어빌리티 이름·gameText·도구 이름·도구 효과·기술 이름·기술 flavor 전부 채워짐. 이력과 출처는 [`docs/review-translations.md`](./review-translations.md) 에 남겨둠.

KO 모드에서 영문으로 노출되는 것들을 해소. 실측 기준(`data/audit` 참조):

| # | 항목 | 미번역 건수 | 영향 |
|---|---|---|---|
| T16 | 도구 `effect` 전체 영어 | 117/117 | 가장 큼. 모든 도구 카드 효과 설명 |
| T17 | 어빌리티 `descriptionKo` 전체 비어 | 192/192 | 특성 카드 상세 설명 문단 |
| T18 | 어빌리티 `gameTextKo` 미매칭 | 16 | 특성 카드 게임 설명 |
| T19 | 기술 `nameKo` 미매칭 | 35 | 포켓몬 상세 기술 테이블 이름 |
| T20 | 기술 `flavorTextKo` 미매칭 | 44 | 기술 설명 텍스트 |
| T21 | `prompts` 페이지 i18n 미적용 | 3 파일 | EN 모드에서 한국어 고정(역방향) |

(이미 등록된 T4b 어빌리티 nameKo 14건 · T8b 도구 nameKo 24건 은 기존 항목 유지.)

### T16. 도구 `effect` 한국어 번역 추가 ✅ (2026-04-20 재검증 완료)
- 현재 `items.json` 에 `effectKo` 필드 자체가 **없음**. 모든 도구 카드가 영문 effect 를 그대로 표시.
- 관련 코드: `web/assets/items-list.js:182` — `effect.textContent = it.effect`.
- 작업:
  - `data/manual/item_effects_ko.json` 신설 (slug → effectKo). 117건 수동 번역(게임 내 한국어 UI / Pokémon Korea 공식 / 신뢰 가능한 한국 위키 순).
  - `scripts/build.py` `build_items` 에 병합 로직 추가.
  - `web/assets/app.js` 에 `itemEffect(item)` 공용 헬퍼 추가 (getLang ko → effectKo || effect, en → effect). items-list 와 party 빌더 도구 툴팁에 적용.
  - `docs/schema.md` items 섹션에 `effectKo` 반영.
- 난이도: 117건 수동 번역이라 큼. 일부는 기존 본편 번역 재활용 가능하나 Champions 신규 메가스톤 다수는 새로 필요.

### T17. 어빌리티 `descriptionKo` 수동 보강
- T11 에서 PokeAPI `effect_entries[ko]` 가 한국어를 제공하지 않아 현재 0/192.
- 진행 방식 후보:
  - A. ✅ **완료 (2026-04-20)** — `abilityDescription()` 을 KO 모드에서 `descriptionKo` 전용으로 바꾸고, `abilities-list.js` 가 빈 값이면 `.ability-card__desc` 단락 자체를 DOM 에서 생략. KO 모드는 상단의 `gameTextKo` 한 줄만 표시되어 더 이상 영문 덩어리가 붙지 않음. 176/192 카드는 실질적 한국어, 16장은 gameTextKo 도 비어 gameText 영문 한 줄만 노출 (T18 과 겹침).
  - B. (잔여) `data/manual/ability_descriptions_ko.json` 생성 후 192건 상세 번역. A 안으로 체감 이슈 해소돼 B 는 후순위. 공식 한국어 effect 가 존재하지 않아 직접 작문 필요 → 품질 보증 어려움. 필요해지면 착수.

### T18. 어빌리티 `gameTextKo` 미매칭 16건 수동 보강 ✅ (2026-04-20)
- T11 수집 결과 176/192. 미매칭 16건: `armortail`, `cudchew`, `dragonize`, `eartheater`, `electromorphosis`, `hospitality`, `megasol`, `opportunist`, `piercingdrill`, `purifyingsalt`, `sharpness`, `spicyspray`, `supersweetsyrup`, `supremeoverlord`, `toxicdebris`, `zerotohero`. T4b (nameKo 14) 와 14개 겹침, 나머지 2건(`hospitality`=대접, `supersweetsyrup`=감미로운꿀) 은 nameKo 만 있고 gameTextKo 가 비어 있던 케이스.
- `data/manual/ability_descriptions_ko.json` 신설 (processed 파일과 같은 shape). build.py `_load_ability_descriptions_ko` 가 processed + manual 을 per-field merge (manual 승) 하도록 확장.
- 결과: `abilities.json[].gameTextKo` **192/192 커버**. KO 모드 어빌리티 카드가 전부 한국어 gameText 로 노출.
- `scripts/fetch_ability_descriptions_ko.py --force` 주기 재실행 시 PokeAPI 가 뒤늦게 같은 slug 에 한국어를 반영해도 manual 쪽이 이긴다. 원치 않으면 manual 엔트리를 비우고 PokeAPI 값으로 돌리면 됨.
- 잔여: T4b (nameKo 14건) — 14 slug 중 일부는 Champions 신규라 공식 한국어명이 확정되지 않은 상태. 공식 정보 확인 후 별도 진행.

### T19. 기술 `nameKo` 미매칭 35건 수동 보강 ✅ (2026-04-20)
- T10 수집 결과 446/481 → 이번에 35건 채워 **481/481 완료**. 대상은 전부 Gen 9 이후 추가 기술이라 SV/바이올렛 공식 한국어명을 따랐음(예: `gigatonhammer`→대왕해머, `wavecrash`→파도격돌, `chillyreception`→썰렁한말장난).
- `data/manual/move_names_ko.json` 신설 (단순 `{slug: nameKo}` 맵) + `scripts/build_moves.py` `_load_move_names_ko()` 추가 → fetch 된 nameKo 가 비어 있을 때만 덮어씀. PokeAPI 값이 이미 있으면 건드리지 않음.
- `scripts/fetch_moves.py --force` 재실행으로 PokeAPI 가 뒤늦게 반영해도 자동 흡수(그 시점에 processed 쪽에 값이 들어오니 manual 은 자연스레 no-op).
- 번역은 이번에 SV 기준으로 채웠지만 Champions 에서 일부 기술 명칭이 바뀐 경우가 확인되면 이 파일만 수정.

### T20. 기술 `flavorTextKo` 미매칭 44건 수동 보강 ✅ (2026-04-20)
- T10 수집 결과 437/481 → 이번에 44건 추가 → **481/481 완료**. T19 35건에 Gen 9 후반 추가 기술 9건(alluringvoice, dragoncheer, electroshot, ficklebeam, hardpress, psychicnoise, supercellslam, temperflare, upperhand) 이 더해져 총 44건.
- `data/manual/move_flavors_ko.json` 신설 (`{slug: flavorTextKo}`). `scripts/build_moves.py` 에 `_load_slug_map` / `_load_move_flavors_ko` 추가, fetched 값이 비어 있을 때만 덮어씀 (이름과 동일 패턴).
- 노출 위치: `pokemon-detail.js:182` — 기술 테이블 이름 셀 tooltip(`title` 속성). KO 모드에서 한국어 설명으로 표시됨.
- 톤은 공식 게임 텍스트 `~한다/~된다` 풍. 1–2문장.
- 빌드 로그: `manual nameKo=35, manual flavorKo=44`. corpus 981 → 986 KB.

## 다음 작업 후보 (2026-04-20 추가)

파티 빌더 확장(T22~T22c)·한국어 커버리지·기술 탭까지 일단락. 다음 세션에서 이어갈 만한 항목:

### T27. AI 프롬프트 end-to-end 검증
- prompts.html 의 5개 템플릿(weakness / swap / moveset / counter / free) 을 실제 Claude.ai · ChatGPT 에 붙여 넣어 응답 품질 확인.
- 이제 인라인 JSON 에 slot.moves / slot.sps / slot.nature 가 포함되므로, 단순 "종족값 기반 추천" 수준이 아니라 실제 세팅을 반영한 추천이 나오는지 검증 대상.
- 외부 AI 가 우리 공개 URL(llms.txt · corpus.json · pokemon.json) 을 실제로 fetch 하는지, "교체 추천" 템플릿의 POKEMON_JSON_URL fetch 지시가 동작하는지 점검.
- 발견된 문제점은 해당 템플릿 body 수정 (`web/assets/prompts-templates.js`).
- 사용자가 브라우저에서 직접 수행해야 하는 단계 — 결과만 공유받아 개선.

### T28. 파티 분석 패널에 파티 단위 실효 스탯 합계 추가
- 현재 슬롯별 카드에는 실효 스탯 한 줄이 뜨지만(T22b), 분석 패널의 "종족값 합계" 옆/아래에 **파티 전체 실효 스탯 합계**(Lv50·IV31·SP·Nature 반영) 를 같이 보여주면 세팅 전후 비교가 쉬워짐.
- `renderStatsSummary` 확장, 기존 baseStats 합계는 유지한 채 `effectiveStats(form.baseStats, slot.sps, slot.nature, state.natures)` 누적 행을 추가.

### T29. 저장된 파티(localStorage) 마이그레이션
- 현재 저장 키 `pc.savedParties.v1` — 값은 URL-인코딩 문자열이라 새 포맷(7필드) 도 별도 마이그레이션 없이 디코드됨.
- 다만 구버전에서 저장한 값은 moves / sps / nature 가 비어 있어 로드 직후 "세팅 값 0" 으로 보이는 게 UX 상 자연스러움. 추가 작업 없이 유지해도 OK — 구조 깨짐 없음.
- 필요해질 때:
  - 저장 시점에 확장 필드도 포함하도록 `savePartyDialog` 가 `encodeParty(state.party)` 그대로 사용하는지 확인(이미 그럼, 새 포맷 자동 저장).
  - `pc.savedParties.v2` 로 포맷 버전을 올리는 건 현재 불필요.

### T30. 파티 내보내기 — Google Sheets TSV 버튼
- `docs/sheets-export-plan.md` 의 Phase 1 (TSV 복사 버튼) 이 아직 미구현.
- 1–2시간 분량. `party.html` `.party-actions` 에 버튼 추가, TSV 생성 로직을 party.js 에 한 함수로.
- 컬럼에 moves / sps / nature 포함시키면 세팅 전체를 시트로 옮길 수 있음.

### T32. 랜딩 페이지 사용 방법 상세 섹션 ✅ (2026-04-21)
- `web/index.html` 에 `<section class="how-to">` 추가 (card-grid 아래, footer 위). 4단계 카드: (1) 데이터 둘러보기, (2) 파티 구성, (3) 공유·저장, (4) AI 분석.
- `web/assets/style.css` `.how-to*` 블록 — `auto-fit minmax(280px,1fr)` 로 데스크톱 2~4열·모바일 1열 반응형.
- `web/assets/i18n.js` 에 `index.howTo.{title,step1~4.{title,body}}` 총 9키 ko/en.
- 스크린샷은 추후 별도 이슈로 분리.

### T32a. 랜딩 페이지 외부 AI 컨설팅 (2026-04-21 리서치 수집 완료, 구현은 별도 작업으로 통합)
- T32 결과물이 기능 나열 위주라 설명이 sparse 함. 외부 AI 에 콘텐츠·구조 + UI 두 가지 질문안을 보내 리서치 수집 완료.
- 콘텐츠 방향: "무엇이 있나" → "언제 왜 쓰나" / "AI 분석" 은 "AI에게 물어보기" 로 리네임 / 4단계 카피는 "혜택 한 줄 + 보조 2문장" 구조 / Hero 아래 "이럴 때 유용합니다" 시나리오 섹션 추가.
- UI 방향: Hero 그라디언트 + SVG 노이즈 / 4단계 번호 배지 + 커넥터 / 카드 그리드와 how-to 섹션 시각 차별화 / 모바일 375px 세로 전환 / prefers-reduced-motion 존중.
- 통합 구현은 같은 세션에 반영 (CSS 토큰 확장 · Hero · when-to-use · how-to 재작성 · AI 리네임 · 카드 차별화 · 푸터 고지).
- 후속: FAQ 섹션 / Before-After 카피 / AI 차별점 독립 배너 / 모바일 카드 가로 스크롤 — 현재 개편 반영 후 체감 효과 보고 착수.

### T35. 더블배틀 (VGC) 지원 — **프롬프트 레이어에만 국한, 축소 스코프 (6~9시간 추정)**
- **핵심 설계 통찰 (2026-04-21 사용자 논의 결과)**: 파티 구성 자체(6마리, 기술·특성·도구·성격·SP)는 싱글/더블이 완전히 동일. 차이는 전적으로 **"AI 에게 무엇을 어떻게 물어보는가"** 에 있음 → 파티 빌더 UI 는 건드리지 않고 **프롬프트 레이어에만** 모드 개념을 얹는다.
- 배경: Champions 는 VGC 2026 공식 채택 → 싱글보다 더블 수요가 큼. AI 가 더블 특유의 판단(리드 조합, 스프레드, 시너지)을 하려면 프롬프트에 모드 정보 필요.
- **달라지는 것 (AI 관점)**:
  - 리드 2마리 + 백 4마리 조합 판단
  - 스프레드 공격 0.75배 보정 (Earthquake/Heat Wave/Surf/Rock Slide 등)
  - 파트너 시너지 패턴 (redirect / 날씨 / TR / Tailwind / Intimidate)
  - **파트너 시너지 heuristic 엔진은 구현 안 함** — AI 판단이 훨씬 유연하고 정확. 우리는 프롬프트로 "이런 걸 고려하라" 만 지시.
- **UI 변경 (최소)**:
  - `prompts.html` 상단에 배틀 모드 토글 한 줄 (싱글/더블). 기본 싱글. localStorage 저장.
  - 파티 빌더 (`party.html`) 는 **손 대지 않음** — 6슬롯 파티는 모드 독립.
- **데이터 변경**:
  - `moves.json` 에 \`target\` 필드 수집 — PokeAPI \`target.name\` (14종). 스프레드 판단용. \`scripts/fetch_moves.py\` 확장.
  - \`party-encode.js\` 스키마는 **건드리지 않음** (공유 URL 호환 유지).
- **AI 프롬프트 변경**:
  - 기존 6개 템플릿의 \`body\` 를 \`{ko, en, koDouble, enDouble}\` 로 확장 — resolveBody 에서 현재 모드 읽어 분기.
  - 더블 모드 전용 신규 템플릿 2~3개: **리드 조합 추천** / **스프레드 커버리지 점검** / **파트너 시너지 평가**.
  - STRICT_POOL_RULES 에 모드 정보 주입 (싱글/더블 분기 문구).
- **작업 분해**:
  - T35a. \`moves.json\` 에 target 필드 수집 + build 파이프라인 반영 (2~3시간)
  - T35b. \`prompts.html\` 모드 토글 + \`prompts.js\` resolveBody 모드 분기 (1~2시간)
  - T35c. 기존 6개 템플릿 더블 버전 (koDouble/enDouble) + 신규 2~3개 (2~3시간)
  - T35d. i18n ko/en 모드 라벨 추가 (30분)
- **선행 조건**: 없음.
- **제외 (안 함)**:
  - 파티 빌더 UI 분기 (모드 토글, 슬롯 라벨 변화)
  - 파트너 시너지 규칙 엔진
  - 더블 전용 분석 패널 섹션
  - \`party-encode.js\` 스키마 확장
  - 이유: AI 판단에 맡기는 편이 유연하고, 우리 차별점(AI 프롬프트 생성기)과도 결이 맞음.
- **후속 영향**: AI 프롬프트 품질 크게 향상 예상 (Champions 주 포맷 정확히 다룸). 인접 툴(ChampTeams/VGC.tools)과 기능 중복 없이 우리만의 강점(AI 질문 생성) 유지.

### T34. 검색 노출 강화 (SEO · 2026-04-21 검색 인덱싱 허용 후속)
- **Google Search Console 등록** — 소유권 검증 방식은 HTML 파일 배치(`web/google*.html`) 가 가장 단순. 등록 후 sitemap 제출하면 크롤링 속도 ↑.
- **`web/sitemap.xml` 생성** — index / pokemon / items / abilities / moves / party 6개 URL 정적 파일로 충분. `prompts.html` 은 noindex 이므로 제외. `robots.txt` 맨 아래에 `Sitemap: https://.../sitemap.xml` 한 줄 추가.
- **페이지별 `<meta name="description">` 고유화** — 현재 index 외 대부분 비슷비슷한 복사본. 각 페이지 기능을 1~2문장으로 다르게 적어 검색 결과에서 "같은 사이트 다른 페이지" 로 구분되게.
- **`<title>` 태그 i18n 화** — 현재 하드코딩. 검색결과 스니펫 에서 노출되는 가장 중요한 텍스트.
- 공수: Search Console 등록 10분 + sitemap 20분 + meta/title 수정 1시간.

### T33. 후원 링크 — ✅ Ko-fi 연결 완료 (2026-04-21)
- footer `.btn-sponsor` href 를 `https://ko-fi.com/jyanny14` 로 최종 확정. 8 페이지(`index` · `pokemon` · `pokemon-detail` · `items` · `abilities` · `moves` · `party` · `prompts`) 전부 반영.
- 툴팁 프레임 변경: 기존 "서버·도메인 비용 보전" 은 **사실과 불일치** (GitHub Pages 호스팅 + 커스텀 도메인 없음 → 실제 운영비 $0). "개발 시간 기여" 프레임으로 재작성.
  - KO: `프로젝트 운영에 대한 작은 감사 · 수익 목적 아님 · 비영리 팬 프로젝트`
  - EN: `A small thank-you for maintaining this project · not for profit · non-commercial fan project`
  - i18n `footer.sponsorHint` ko/en 2키 + HTML 8개 파일 `title` 속성 하드코딩 모두 동기화.
- Ko-fi 설정 가이드 (계정 페이지에서):
  - **계정 타입**: Developer / Open Source (Gaming/Fan 은 Nintendo IP 관점에서 회피)
  - **기본 팁 금액**: $1 (T33b #1 프레이밍 유지용 — "큰돈 수령" 인상 최소화)
  - **Auto thank-you**: `후원해주셔서 감사합니다. 서버·도메인 비용... ` 류는 사실과 다르므로 아래 문안 권장:
    - `후원해주셔서 감사합니다. 이 프로젝트를 이어가는 데 힘이 됩니다. 비영리 팬 프로젝트이며 개인 수익 목적이 아닙니다.`
  - **Contributor/Gold 구독**: **불필요** — Gold 가 풀어주는 Memberships/Shop/티어 혜택은 T33b #1 에서 명시적으로 금지한 상업 기능들. 무료 티어로 one-time tip 수령은 이미 수수료 0%.
- 배치: footer 상단 출처 바로 아래 (현 상태 유지). hero/header 배치는 "돈 내라" 인상이 강해 피함.
- 문구 라벨: "후원하기" / "Sponsor" (그대로 유지).
- 금지어: "개발자 후원", "커피 한 잔 사주세요" 같은 개인 수익 문구 (Nintendo IP 리스크).

### T33a. 플랫폼 결정 이력 — ✅ Ko-fi 선정 (2026-04-21)
- 아래 비교표 기준으로 **Ko-fi one-time** 선정. 기록 보존용.

  | 플랫폼 | 수수료 | 상업 인상 | 장점 | 단점 | 결정 |
  |---|---|---|---|---|---|
  | GitHub Sponsors | 0% | 최약 | "개발자 지원" 프레임 | 승인 프로세스 불확실, 한국 유저 생소 | ⏸️ 승인 시간 문제로 대기 포기 |
  | **Ko-fi (one-time)** | **0%** | **약** | UX 친숙, 수수료 0, 글로벌 접근성 | "크리에이터 팁" 프레임 | ✅ **선정** |
  | Buy Me a Coffee | 5% | 중 | 브랜드 인지도 높음 | 수수료 5%, 서포터 공개 기본값 | ❌ 수수료 높음 |
  | Patreon | 8~12% | 강 | 구독 수익 안정 | 구독 = 상업적 색채 강함 | ❌ IP 리스크 |
  | 토스/카카오페이 | 0% | 약 | 한국 UX 최적 | 글로벌 유저 배제 | ❌ 접근성 제약 |
- **복수 플랫폼 병행 비권장** 원칙 유지 — KYC·정산·세무 이중 부담, 상업 인상 강화, 교체 필요 시 이전 채널 완전 폐쇄.

### T33b. 후원 도입 시 리스크 케이스
위 두 항목 중 뭘 고르든 공통으로 조심할 케이스들:

**1. Nintendo/Pokémon Company IP 리스크 (최우선)**
- 비영리 팬 프로젝트는 암묵적 관용 범위지만, **"기부 수령"은 상업 활동으로 해석될 수 있음**. 판례: Pokémon ROM 해킹 프로젝트들이 Patreon/Ko-fi 운영하다 DMCA 당한 사례 다수.
- 완화: (a) 플랫폼 선택에서 "서버비/개발시간 지원" 프레임이 명확한 곳을 우선 (Sponsors > Ko-fi > BMAC), (b) 문구에서 "수익 목적 아님 · 서버비 보전" 명시, (c) 티어별 혜택(예: "$5 후원자 전용 Pokémon 분석") 절대 만들지 말 것 — 이게 명백한 상업 이용으로 해석됨.

**2. 개인 세무·법적 리스크**
- 한국: 일정 금액(연 500만 원 내외) 넘으면 기타소득·사업소득 신고 의무 발생. BMAC/Ko-fi 같은 해외 플랫폼 수령은 외환거래·부가세 이슈도 같이.
- 완화: 수령액 자체를 낮게 유지, 기록 보관, 필요 시 세무사 자문. 익명 수령도 KYC 때문에 불가능하다고 가정.

**3. 공개 후원자 리스트 / 실명 노출**
- BMAC·Patreon 기본값이 서포터 공개. 팬 포켓몬 사이트에 이름 노출되면 후원자 본인이 원치 않을 수 있음.
- 완화: 플랫폼 설정에서 서포터 공개 off, 후원자 이름 우리 사이트에 게시 절대 X.

**4. "상업적 표시" 실수**
- footer 에 후원 카운터("$2,500 모금!") · 상위 후원자 뱃지 · "목표 달성 시 XX 기능 해금" 같은 요소는 **상업 서비스처럼 보임**.
- 완화: 버튼만, 카운터·뱃지·게이트 기능 절대 X. 현 구현은 이 원칙 준수 중.

**5. 플랫폼 계정 BAN 리스크**
- 예: BMAC 가 "Pokémon IP 사용 프로젝트" 신고 받고 계정 정지하면, 그때까지 수령한 금액 동결 가능.
- 완화: 수령 즉시 출금, 플랫폼에 대량 금액 묶어두지 않기.

**6. 복수 플랫폼 병행 시 관리 부담**
- 2개 이상 운영하면 각각 KYC/정산/세무 따로. 실질 이득 없이 복잡도만 증가.
- 완화: 한 채널만. 교체 시 이전 채널 완전 폐쇄.

**7. 유저 신뢰 측면**
- 팬 프로젝트 성격상 "기부 받으려고 만든 것" 인상 피하기 — 후원 버튼이 hero·header 상단에 크게 붙어있으면 그런 인상. 현재 footer 배치는 이 문제 회피.
- 완화: footer 유지, 버튼 크기·색 현 수준 유지 (accent 색이지만 작고 절제된 상태).

### T33c. (삭제됨) — Sponsors 대기 포기 및 Ko-fi 로 전환하며 T33 본문에 통합

### T31. 일본어(日) · 중국어(中) 다국어 지원
번역팀이 없으므로 **전부 PokeAPI 에서 자동 수집**. 현재 ko/en 2언어 → ja + zh-Hans + zh-Hant 까지 확장.

**데이터 레이어 (스크립트)**
- PokeAPI 언어 코드: `ja` (한자, 게임 공식 표기), `ja-Hrkt` (가타카나, 원한다면 대체), `zh-Hans` (간체), `zh-Hant` (번체).
- 기존 ko 수집 스크립트를 ja/zh 버전으로 복제하거나 langs 인자로 일반화:
  - `scripts/fetch_ability_names_ko.py` / `fetch_ability_descriptions_ko.py` → `_multilang.py` 로 통합, 타겟 언어 목록을 인자로.
  - `scripts/fetch_item_names_ko.py` → 동일.
  - `scripts/fetch_moves.py` — 이미 `flavor_text_entries` / `names` 둘 다 파싱하니 언어 필터만 확장.
- 각 JSON 필드에 `nameJa`, `nameZhHans`, `nameZhHant`, `gameTextJa`, `flavorTextJa`, `effectJa` 등 병렬 추가.
- `docs/schema.md` 업데이트.

**예상 커버리지**
- JA 는 게임 원본 언어라 PokeAPI 최우선 반영 → Gen 8 까지 100%, Gen 9 / Champions 신규 소수 누락.
- ZH 는 ko 와 비슷한 후순위로 반영 → Gen 8 까지 ~95%, Gen 9 / Champions 신규는 일부 누락 예상.
- Champions 전용 콘텐츠(신규 메가스톤 23, 신규 특성 4 등) 는 현재 ko 와 동일하게 **manual override** 필요. 해당 언어 위키 (pixelmon wiki / 52poke.com / 宝可梦百科) 참조.

**UI 레이어**
- `web/assets/i18n.js` — ko/en 각 ~200 키 → ja/zh-Hans/zh-Hant 추가. **수동 번역 필요 (가장 큰 공수).** 번역팀 없다고 했으니 실용적으로는:
  - LLM (Claude/GPT) 에 ko 블록 통째로 던져 ja/zh 초안 생성 → 게임 용어 (종족값=種族値=种族值 같은 공식 표기) 만 직접 검수.
  - 품질 80% → 실사용에 충분. 이후 오타·어색한 표현 발견 시 점진 개선.
- `web/assets/app.js` 의 `abilityDisplayName` / `moveDisplayName` / `itemDisplayName` / `formDisplayName` 에 ja/zh 분기 추가 (현재 ko 만 있음).
- 언어 토글 UI — 2-way 토글 (한/EN) → **드롭다운** 으로 전환. `initLangToggle` 재작성.

**작업 순서**
1. 스크립트 확장 (반나절) — 데이터 먼저 수집해 실제 커버리지 확인.
2. Display 헬퍼 분기 (1시간).
3. 언어 토글 드롭다운 (1~2시간).
4. i18n.js 번역 (LLM 초안 + 검수, 1~2일).
5. Manual override — JA/ZH 신규 콘텐츠 번역 (JA 10~20건 예상, ZH 30~40건 예상).
6. 폼 이름 합성 — `form_ja.py` / `form_zh.py` ("메가" → "メガ" / "超级", "알로라" → "アローラ" / "阿罗拉" 등).

**부분 진행 옵션 (권장)**
- **A. 데이터만** — 1~2 단계만. UI 는 계속 한/영 토글, 검색 필드에 `nameJa` / `nameZhHans` 포함해서 다국어 이름으로 검색 가능. AI 프롬프트 인라인 JSON 에도 포함 → AI 가 공식 표기로 매칭하기 쉬워짐. 공수 1일, 체감 이득 큼.
- **B. 풀 트리플/쿼드링구얼** — 전체 진행. 공수 2~3일.

---

## 파티 빌더 확장 — Champions 전투 상세 (2026-04-20 완료 · 보존용)

Champions 기준으로 각 파티 슬롯에 **기술 4개 / Stat Points / Nature** 를 지정할 수 있게 한다. 지금은 `{slug, formName, abilitySlug, itemSlug}` 4필드만 가져 분석 품질·AI 프롬프트 정확도가 제한됨.

### 참고 — Pokémon Champions 훈련 메커니즘

Serebii (`pokemonchampions/training.shtml`) + Bulbapedia (`Pokémon Champions`) 교차 확인.

- **IV**: 모든 스탯 31 고정. UI 노출·편집 불필요.
- **Level**: 배틀은 전부 레벨 50. 표시 없음.
- **Stat Points (SP) — EV 대체**:
  - EV → SP 변환: 첫 SP = 4 EV, 이후 SP = 8 EV 씩 (같은 스탯 내).
  - 스탯당 최대 32 SP(=본편 EV 252).
  - 총합 **65~66 SP** (2스탯 집중 시 65, 5~6스탯 분산 시 66).
  - Champions 에서는 메뉴에서 **직접 SP 할당** (2 VP/SP). Training Ticket 으로 무료 변경 가능.
- **Nature**: 25종 전통 체계. `+10% / -10%` 보정. 200 VP 로 변경.
- **Moves**: 4기술 세팅. 100 VP/기술 변경. 해당 폼의 learnable 범위 안에서만.
- **Ability**: 400 VP 로 변경. 해당 폼의 abilities 안에서 (Champions 에서 숨겨진 특성도 활성화 가능).

우리 파티 빌더는 "배틀 상태"를 저장하는 용도이므로 VP·Training Ticket 모델은 무시하고 최종 세팅값만 다룬다.

### T22. 공통 인프라 ✅ (2026-04-20 커밋 87d66a6)

- `party-encode.js` 슬롯 스키마 확장 — 뒤쪽에 optional 필드 추가:
  ```
  slug:form:ability:item:m1,m2,m3,m4:sp1/sp2/sp3/sp4/sp5/sp6:nature
  ```
  기존 공유 URL(`slug:form:ability:item` 까지만) 은 그대로 디코드 되어야 함. 뒤 필드 누락 시 각각 `[]` / `[0,0,0,0,0,0]` / `null` 기본값.
- `docs/schema.md` Party Slot 섹션 갱신.
- 파티 빌더 슬롯 카드 UI 에 **"상세 설정" 접힘 영역**(기본 접힘). 기존 간단 파티 공유 흐름 해치지 않음.
- AI 프롬프트 인라인 JSON(`prompts.js`) 의 slot 발췌에 moves·sps·nature 필드 포함.

### T22a. 기술 4기술 세팅 ✅ (2026-04-20 커밋 6b83364)

- 슬롯마다 기술 4칸 피커. 각 칸은 해당 폼의 `pokemon.moves` (learnable) 목록에서 선택.
- 중복 선택 금지.
- 저장: `moves: [slug, slug, slug, slug]` (길이 0~4, 빈칸 허용).
- 파티 분석 변경: 공격 STAB 커버리지를 **자속 전 타입 가정** → **실제 선택 기술의 타입 기준** 으로 재계산. 변화·상태 기술만 고른 슬롯은 STAB 기여 0 로.
- AI 프롬프트 인라인 JSON 에 `slot.moves` 포함. 현재 `learnableMoves` 전체(최대 60+)를 보내는데 4개만 확정되면 토큰 절약 + AI 판단 정확도 ↑.
- UI 참고: `pokemon-detail.js` 의 기술 테이블 재사용 가능.

### T22b. Stat Points (노력치) ✅ (2026-04-20 커밋 ccbaad5)

- 슬롯마다 6스탯 정수 입력 (hp·atk·def·spAtk·spDef·speed).
- 제약: **각 스탯 0~32**, **총합 ≤66**. 초과 시 빨간 border + submit 블록.
- 저장: `sps: [hp, atk, def, spAtk, spDef, speed]`.
- 실효 스탯 계산 헬퍼 신설 (`web/assets/stats.js`):
  - SP → EV 변환: `SP=0 → EV=0`, `SP≥1 → EV = 8*SP - 4` (첫 4 + 8씩 추가)
  - level 50, IV 31 고정 가정
  - HP: `floor((2*base + 31 + floor(EV/4)) * 50 / 100) + 50 + 10`
  - 기타: `floor((floor((2*base + 31 + floor(EV/4)) * 50 / 100) + 5) * natureMod)`
- 분석 패널: "종족값 합계" 옆/아래에 "실효 스탯 합계(Lv50, IV31, nature·SP 반영)" 추가.
- 저장된 파티(localStorage) 마이그레이션 — 구버전 저장본에 sps 없으면 `[0×6]` 기본값.

### T22c. Nature (성격) ✅ (2026-04-20 커밋 f964719)

- 신규 데이터 파일 `web/data/natures.json` — 25종, 각 `{slug, nameEn, nameKo, increased, decreased}`.
  - 중립 5종(Hardy/Docile/Serious/Bashful/Quirky) 은 `increased == decreased == null`.
- 생성 스크립트 `scripts/build_natures.py` — 리터럴 테이블, 네트워크 없음.
- `manifest.json` 의 files 목록에 `natures` 추가. `corpus.json` bundler 에도 포함.
- 슬롯 드롭다운: 25개. 선택 시 툴팁 "공격 ↑ / 방어 ↓" 식.
- 저장: `nature: slug` (중립일 경우도 slug 유지, 계산 시 modifier 모두 1.0).
- i18n `nature.adamant`~`nature.quirky` 25개 ko/en 추가.

### 의존성·작업 순서

1. **T22 (공통 인프라)** 먼저 — 인코딩·UI 접힘 영역·문서 갱신.
2. **T22c (Nature)** — 데이터 파일만 만들면 되고 T22b 의 실효 스탯 계산에서 필수.
3. **T22a (Moves)** — Nature 와 독립이라 어느 순서든 가능.
4. **T22b (SP)** — 실효 스탯 계산은 nature 를 알아야 하므로 마지막. 가장 복잡.

### 검증 시 유의

- 공식 SV 공식 스탯 계산식과 Champions 실효 스탯이 정확히 일치하는지 게임 내 몇 마리로 sanity check.
- 0 SP 일 때도 natureMod 는 적용되는 게 맞는지(맞음 — nature 는 SP 와 독립).
- 저장된 파티 마이그레이션이 구조적으로 깨지지 않는지.

---

### T21. `prompts` 페이지 i18n 적용 (역방향) ✅ (2026-04-20)
- 페이지 chrome + JS 동적 문자열 + 템플릿 title/desc 를 i18n 키 `prompts.*` 로 전부 전환. EN 모드에서 자연스러운 영어로 출력.
- 대상 파일:
  - `web/prompts.html` — skip-link · 페이지 제목/리드 · 인트로 · 섹션 aria-label · 푸터 에 `data-i18n` / `data-i18n-aria` 부여.
  - `web/assets/prompts.js` — 로드 에러, 빈 파티 안내, 카드 태그/버튼 라벨/미리보기 aria, 복사 결과 토글, fallback prompt, URL-only hint 모두 `t()` 경유.
  - `web/assets/prompts-templates.js` — `title`/`description` 제거하고 `titleKey`/`descKey` 로 대체. body 는 한국어 고정 유지 (프롬프트 자체는 AI 와의 한국어 대화용이라는 의사결정).
  - `web/assets/i18n.js` — `prompts.*` 24개 키 + `party.aiPrompts` 추가. ko/en 양쪽 정의.
- 제외: `<title>`, `<meta description>` 은 다른 페이지도 전부 하드코딩 상태라 일관성 유지 목적에서 유지.

## 선행 결정 사항

- `manifest.json` 도입: **확정** (2026-04-15) — JSON 파일 구조는 그대로 두고 manifest로 메타만 관리
- `_meta` 헤더 방식: **폐기**
- 게임 소스 = **PokeAPI `game_indices`가 정본** (2026-04-15). 폼 이름 휴리스틱은 폐기, 첫 등장 게임(`originGame`) 필드도 폐기
- `sourceGames`는 **HOME 직접 연동 게임만 포함** (2026-04-15). Pokémon Bank 경유는 T12 후속 개선 사항으로 분리
- 수동 오버라이드(T6)로 Legends: Z-A 등 신작 게임 대응

## 재개 순서 (Resume Sequence)

나중에 이 TODO로 돌아왔을 때 바로 이어서 진행할 수 있도록 권장 순서를 기록한다. 현재 Phase 2(웹앱)는 별도 흐름이므로 그쪽 잔여는 `docs/plan.md` 참조.

**0. 선행 — Phase 2 잔여 완료**
- `items.html` → `abilities.html` → 포켓몬 상세 뷰 → 파티 빌더(Phase 3)
- 여기까지 가면서 UI가 실제로 어떤 필드를 요구하는지 구체화됨 → 스키마 결정이 쉬워짐

**1. T1 스키마 문서 초안**
- 지금 구조부터 `docs/schema.md`에 고정
- 이후 T2~T12 변경이 있을 때마다 이 문서를 먼저 수정

**2. T3 문자열 정규화 파이프라인**
- 이후 모든 데이터 수집/빌드에 공통으로 적용되어야 하므로 먼저 확정

**3. T7 타입 상성 매트릭스**
- 네트워크 없음, 독립적, 짧음. 빠르게 끝내서 AI 추천 엔진 설계 시 선행 조건 확보

**4. T4 어빌리티 한글명**
- 별도 PokeAPI 호출 묶음. 단순

**5. T5a → T5 포켓몬 게임 소스 수집**
- T5a(폼 매핑)을 먼저 작성 및 검증해서 T5가 실패 없이 돌도록 함
- T5 실행 결과를 `pokemon.json`에 주입

**6. T6 수동 오버라이드 로딩**
- build.py에 병합 로직 추가 (빈 파일이어도 통과)
- Legends: Z-A 수동 엔트리는 실제로 필요할 때 기입

**7. T2 manifest.json**
- 모든 데이터 변경이 끝난 뒤 마지막에 생성. 해시가 안정적인 시점에만 의미 있음

**8. T11 어빌리티 한국어 설명 (선택)**
- 파티 추천 품질 향상용. 없어도 MVP 가능

**9. T9 corpus.json (선택)**
- LLM 주입용 통합 파일
- AI 추천 엔진 붙일 때 필요해지면 생성

**10. T10 기술 (선택, 별도 Phase)**
- 파티 추천 품질이 한계에 부딪혔을 때만 착수

**11. T12 Bank 경유 레거시 (후속 개선)**
- 사용자 피드백 기반

## i18n Phase 1 후속 과제 (2026-04-22)

Phase 1 데이터 레이어 + UI 스캐폴딩은 완료. 남은 번역·검증·수동 채움 항목.

### T-i18n-1. ~~PokeAPI 업스트림 공백 보완~~ ✅ 완료 (2026-04-22)

`scripts/fetch_names_from_bulbapedia.py` 로 Bulbapedia 'In other languages' 섹션
+ 첫 문단 Japanese 를 파싱해 자동 수집. 총 101건 채움 (ja 28건 + zh 73건).
번체/간체 슬래시 분리 포맷(`反芻 / 反刍`) 대응 — 간체만 추출.
`scripts/validate_names_i18n.py --strict` ja/zh 양쪽 통과.

### T-i18n-2. ~~Champions 신규 아이템 ja/zh 공식명 수동 채움~~ ✅ 완료 (2026-04-22)

T-i18n-1 과 함께 Bulbapedia 파서로 일괄 처리. 메가스톤 23~24건 포함.

### T-i18n-3. ~~UI 문자열 ja/zh 전면 번역~~ ✅ 완료 (2026-04-22)

`web/assets/i18n.js` `STRINGS.ja` / `STRINGS.zh` 282 키 전체 번역 완료
— ko/en 과 완전 키 대칭. 타입·성격·게임·스탯 등 고유명사는 공식 게임 내
표기 적용, 일반 UI 문구는 각 언어 관행에 맞춰 번역.

### T-i18n-4. 언어 토글 UX 개선 ✅ (2026-04-23)

`<select>` 드롭다운 대신 `<ul role="listbox">` 팝업 방식으로 구현 — 버튼 클릭 시
4 언어 항목 목록 표시, 항목 클릭 시 즉시 전환, 바깥 클릭/Escape 닫기,
키보드(Enter/Space) 선택 지원. `i18n.js` `initLangToggle()` 재작성,
`style.css` `.lang-toggle-menu*` 스타일 신규. HTML 8 파일 마크업은 건드리지 않음.

### T-i18n-5. Phase 2 — 설명 / 효과 / 플레이버 LLM 번역 ✅ (2026-04-23)

총 744건 완료 (Turn A~D). 6개 파일 + 3개 파일 신규 생성.
- Turn A (168건): `ability_gameText_{ja,zh}.json` · `item_effect_{ja,zh}.json` · `move_flavorText_{ja,zh}.json`
- Turn B~D (576건): `ability_description_{ja,zh,ko}.json` (192×3)
- Turn E: `scripts/build.py` `descriptionKo/Ja/Zh` 로더 + 병합 추가. 재빌드 성공.
최종 커버리지: ability description 0→192(ko/ja/zh), gameText/effect/flavorText ja/zh 각 0→전체 채움.

### T-i18n-6. Phase 3 — AI 프롬프트 템플릿 ja/zh 바디 ✅ 완료 (2026-04-23)

`web/assets/prompts-templates.js` 9개 템플릿 × ja/zh 바디 추가.
`SHARED_DISCLAIMER_JA/ZH`, `STRICT_POOL_RULES_JA/ZH` 상수 신규 추가.
싱글 6종: `ja`/`jaDouble`/`zh`/`zhDouble` 4키 추가.
더블 전용 3종(leads/spread/synergy): `jaDouble`/`zhDouble` 2키 추가.
`resolveBody()` 가 ja/zh 모드에서 en 폴백 없이 자국어 바디 반환.

## 참고 자료

- PokeAPI 한국어 locale: `language.name === "ko"` 필터
- 공식 본편 게임 slug 예시: `red`, `blue`, `yellow`, `gold`, `silver`, `crystal`, `ruby`, `sapphire`, `emerald`, `firered`, `leafgreen`, `diamond`, `pearl`, `platinum`, `heartgold`, `soulsilver`, `black`, `white`, `black-2`, `white-2`, `x`, `y`, `omega-ruby`, `alpha-sapphire`, `sun`, `moon`, `ultra-sun`, `ultra-moon`, `lets-go-pikachu`, `lets-go-eevee`, `sword`, `shield`, `brilliant-diamond`, `shining-pearl`, `legends-arceus`, `scarlet`, `violet`
- HOME 직접 연동 가능 게임 (2026년 기준): Sword/Shield, BDSP, Legends: Arceus, Scarlet/Violet, Let's Go Pikachu/Eevee, Pokemon Champions 본편
- HOME 간접 연동 (Bank 경유, T12): XY, ORAS, Sun/Moon, USUM 및 VC로 접근 가능한 구 세대

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

### T8b. 아이템 한글명 미매칭 24건 수동 보강 (후속)
- `data/manual/item_names_ko.json` 의 24개 키(`fairy-feather` 1개 + Champions 신규 메가스톤 23개)가 빈 값
- 공식 번역명(게임 한국어 UI, 포켓몬 Korea 공식 사이트 등) 확인 후 파일에 기입 → `python scripts/build.py` 재실행
- PokeAPI 가 뒤늦게 반영했는지 주기적으로 확인: `python scripts/fetch_item_names_ko.py --force`

### T4b. 어빌리티 한글명 미매칭 14건 수동 보강 (후속)
- `data/manual/ability_names_ko.json`의 14개 키 값이 빈 문자열 상태
- 대상: `armortail`, `cudchew`, `dragonize`, `eartheater`, `electromorphosis`, `megasol`, `opportunist`, `piercingdrill`, `purifyingsalt`, `sharpness`, `spicyspray`, `supremeoverlord`, `toxicdebris`, `zerotohero`
- PokeAPI가 한국어를 아직 반영하지 않은 Gen 9/Champions 신규 특성
- 진행 방식: 공식 출처(게임 내 한국어 UI, Pokémon Korea 공식 사이트, 신뢰 가능한 한국 팬위키) 확인 후 파일에 기입 → `python scripts/build.py` 재실행만 하면 abilities.json에 반영됨
- 주기적으로 `python scripts/fetch_ability_names_ko.py --force` 재실행해서 PokeAPI가 뒤늦게 한국어를 반영했는지 확인 가능

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

## 한국어 커버리지 보강 (2026-04-20 추가)

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

### T16. 도구 `effect` 한국어 번역 추가
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

### T20. 기술 `flavorTextKo` 미매칭 44건 수동 보강
- T10 수집 결과 437/481. T19 와 slug 집합이 거의 겹침.
- `data/manual/move_flavors_ko.json` 신설, 같은 경로로 병합.
- 우선순위는 T19 보다 낮음 (UI 노출 빈도 낮음).

### T21. `prompts` 페이지 i18n 적용 (역방향)
- KO→EN 이 아닌 EN 모드에서 한국어 고정이 되는 문제. 사용자 질문의 범위 밖이지만 전체 품질 관점에서 같이 정리.
- 대상 파일:
  - `web/prompts.html` — `<title>`, `<meta description>`, 페이지 제목·리드, 섹션 label, 푸터. `data-i18n` 속성 일괄 부여.
  - `web/assets/prompts.js` — 버튼 라벨 ("프롬프트만 복사", "프롬프트 + 데이터 복사", "복사됨 ✓", "복사할 텍스트를 선택…"), 알림 문구 ("데이터 로드 실패", "파티가 비어 있어서…"), 빈 파티 안내문.
  - `web/assets/prompts-templates.js` — 템플릿 title/description 만 i18n 하고 `body` 는 현재 한국어 고정 유지 (프롬프트 자체를 영어로 바꿀지는 별도 의사결정 필요).
- `i18n.js` 에 `prompts.*` 키 블록 신설. EN 번역은 자연스럽게 작성.

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

## 참고 자료

- PokeAPI 한국어 locale: `language.name === "ko"` 필터
- 공식 본편 게임 slug 예시: `red`, `blue`, `yellow`, `gold`, `silver`, `crystal`, `ruby`, `sapphire`, `emerald`, `firered`, `leafgreen`, `diamond`, `pearl`, `platinum`, `heartgold`, `soulsilver`, `black`, `white`, `black-2`, `white-2`, `x`, `y`, `omega-ruby`, `alpha-sapphire`, `sun`, `moon`, `ultra-sun`, `ultra-moon`, `lets-go-pikachu`, `lets-go-eevee`, `sword`, `shield`, `brilliant-diamond`, `shining-pearl`, `legends-arceus`, `scarlet`, `violet`
- HOME 직접 연동 가능 게임 (2026년 기준): Sword/Shield, BDSP, Legends: Arceus, Scarlet/Violet, Let's Go Pikachu/Eevee, Pokemon Champions 본편
- HOME 간접 연동 (Bank 경유, T12): XY, ORAS, Sun/Moon, USUM 및 VC로 접근 가능한 구 세대

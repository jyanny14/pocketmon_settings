# 작업 히스토리

이 파일은 `pocketmon_settings` 프로젝트에서 Claude Code가 수행한 모든 작업 내역을 기록합니다.

형식: 각 항목은 `## YYYY-MM-DD` 날짜 헤더 아래에 작성합니다.

---

## 2026-04-22

- 파티 슬롯 훈련 탭 UX 개선 — 두 가지 체감 이슈 수정.
  - **탭 유지**: 훈련 탭에서 성격 드롭다운·SP 버튼을 건드릴 때마다 기술 탭으로 튕겨 나가던 문제. `makeExtendedSection` 이 매 `renderAll` 마다 새 DOM 을 만들면서 초기 활성 탭을 항상 "moves" 로 세팅해서 그랬음. `state.activeTabByIndex: Map<number, "moves"|"training">` 신규 — 사용자가 탭을 바꾸면 저장하고, 다음 렌더에서 읽어와 그대로 복원. 슬롯 제거/파티 리셋 시에는 각각 `delete(index)` / `clear()` 로 정리.
  - **SP 입력 UI 재구성 (3차 수정으로 3-행 구조 확정)**: 처음엔 `[−][input][+]` 사이에 input 이 끼어서 값이 안 보였고, 버튼을 양옆으로 모은 `[«][‹][input][›][»]` 도 좁은 카드에서는 2자리(최대 32) 가 여전히 눌렸음. 2행 (`[label] [input] / [« ‹ › »]`) 으로 바꿨더니 이번엔 **"스피드" 같은 긴 KO 라벨이 input 과 가로폭을 다퉈 잘리는** 현상 발견. 최종: **셀을 3-행 세로 스택** 으로 변경 → row 1 label (font .72rem, 이모지·방향 화살표 포함 한 줄), row 2 input (1.05rem / 700, 전체 폭), row 3 stepper 4-등분 버튼. 모든 요소가 가로 충돌 없이 각자 full-width 확보. `.slot-card__sp-cell` `grid-template-columns: minmax(0,1fr); grid-template-rows: auto auto auto; row-gap: .2rem`. CSS `grid-template-columns: 1.4rem 1.4rem minmax(0,1fr) 1.4rem 1.4rem` 로 input 가운데 배치, `.slot-card__sp-step--jump` 모디파이어로 `«`·`»` 는 `−/+` 보다 살짝 덜 강조(border/font-weight 차). 입력값 자체는 `font-size: .95rem; font-weight: 600` 로 키워 가독성 확보. `.slot-card__sp-quick` 스타일은 삭제.
  - 관련 파일: `web/assets/party.js`, `web/assets/style.css`.

- 파티 슬롯 카드에 "입수 + HOME 연동 게임" 섹션 추가 — 파티를 짤 때 "이 포켓몬 어디서 얻지?" 를 카드를 떠나지 않고 즉시 확인할 수 있게. `web/assets/party.js` `makeObtainBlock(form, obtainList)` 신규: row 1 = obtain 뱃지(리크루트/전송/선물/기본), row 2 = 해당 **폼의** `sourceGames` 칩(히스이 타입로스 → Legends: Arceus 만 뜨는 식). 카드 조립 순서 `header → types → controls → stats → extras(상세 설정) → obtainBlock` 로 상세 설정 바로 밑에 배치. `.slot-card__obtain` · `.slot-card__obtain-row` · `.slot-card__obtain-label` 스타일 + `party.obtain.methods` · `party.obtain.homeGames` i18n ko/en 2키. 슬롯 카드용 `.obtain` 뱃지는 detail 페이지보다 살짝 작게 (`font-size: .72rem`).

- `docs/schema.md` 에 "전투 중 자동 전환 폼은 `forms[]` 에서 제외한다" 섹션 신규 — `parse_pokemon_detail` 의 필터 정책(적용 기준, 현재 제외 목록, 향후 후보, 공유 URL 폴백 동작) 을 표와 함께 문서화. 비슷한 처리가 필요한 포켓몬(미믹큐·누리공·메테노·웅비크·모르페코·빙큐보·돌핀맨) 을 "추후 후보" 로 명시해 다음 번에 규칙을 잊지 않도록 고정.

- 킬가르도 Blade Forme 폼 목록에서 제외 — Stance Change(배틀스위치) 특성으로 **전투 중 자동 전환**되는 폼이라 사용자가 파티 빌더에서 직접 고를 일이 없음. `scripts/parser.py` `parse_pokemon_detail` 에 `slug == "aegislash"` 일 때 `forms` 리스트에서 `name == "Blade Forme"` 엔트리만 필터링. Shield Forme(기본 "Aegislash") 은 그대로. 재빌드로 `web/data/pokemon.json`·`corpus.json` 반영. 기존 공유 URL 이 `aegislash:Blade Forme:...` 형식을 담고 있다면 decode 시 `findForm` 가 못 찾고 자동으로 base form 으로 폴백되므로 링크 호환성 유지. `form_ko.py` / `pokeapi_form_map.py` 의 "Blade Forme" 매핑은 범용이라 유지.

- 로토무 폼별 시그니처 기술 데이터 반영 — 기존 파서가 "Standard Moves" 테이블만 긁어서, `Special Moves` 테이블에 들어 있는 **Heat=Overheat / Wash=Hydro Pump / Frost=Blizzard / Fan=Air Slash / Mow=Leaf Storm** 이 전부 누락돼 있던 문제 수정. Rotom 외 185마리는 Special Moves 테이블이 없어 영향 없음.
  - `scripts/parser.py` — `PokemonDetail.form_moves: dict[str, list[str]]` 필드 추가. `_parse_special_move_slugs(soup)` 신규: 테이블 헤더가 `<thead>` 로 감싸져 있어 `recursive=False` 탐색이 안 먹는 점을 반영해 `t.find(..., class_="fooevo")` 로 descendant 검색. "Form" 컬럼 아이콘의 `alt` 텍스트(`"Heat Rotom"` 등)에서 폼명 추출, 타입/카테고리 아이콘(` - `, `:` 포함)은 제외. 로토무에 한해 호출.
  - `scripts/build.py` — non-empty 일 때만 `formMoves` 키를 pokemon.json 에 삽입. 재빌드 결과: Rotom 엔트리에 `formMoves: {Heat Rotom: [overheat], ...}` 5개 폼 전부 1기술씩 추가됨. `python scripts/build.py` + `python scripts/build_corpus.py` 재실행 (996 KB).
  - `web/assets/app.js` — `learnableMoveSlugsForForm(species, formName)` (base + formMoves[formName] 합집합, 중복 제거) 와 `allLearnableMoveSlugs(species)` (모든 폼 union) 공용 헬퍼 export.
  - `web/assets/party.js` — `buildMovesBlock` (슬롯 카드 4기술 select) 와 `filterPickerList` (기술 피커 모달) 둘 다 `learnableMoveSlugsForForm(pokemon, slot.formName)` 로 전환. 현재 선택된 폼에 맞는 기술만 후보로 뜸.
  - `web/assets/party-encode.js` — 공유 URL decode 시 moves 필드 검증을 폼 단위로 바꿔, `?p=rotom:Heat+Rotom::...:overheat,...` 같은 URL 이 정상 디코드됨.
  - `web/assets/pokemon-detail.js` — 로토무 상세 페이지 기술 테이블이 `allLearnableMoveSlugs(p)` 결과 기준으로 기존 목록 + 5개 시그니처까지 모두 노출. 폼-전용 기술 이름 셀에 `· 히트 로토무 전용` 형태의 작은 배지 표시 (CSS `.move-form-badge`, i18n `detail.move.exclusive` ko=전용 / en=only).
  - `web/assets/i18n.js` · `web/assets/style.css` — 배지 라벨 ko/en + 스타일 추가.
  - `docs/schema.md` — pokemon 섹션에 `formMoves?` 필드 문서화.
  - 영원의 꽃 플라엣테 동시 점검 완료 — serebii 페이지의 이동 테이블이 `Standard Moves - Eternal Floette` 하나뿐이라 기존 `startswith("Standard Moves")` 매칭으로 이미 정확히 수집됨. `lightofruin` 시그니처 포함 확인. 메가 플라엣테는 스탯·특성만 바뀌는 상태 전환이라 species-wide moves 공유가 맞음. 수정 불필요.

## 2026-04-21

- serebii 아웃바운드 링크 제거 — 광고 수익 사이트로의 referral/트래픽 유입을 차단하되 데이터 출처 attribution 은 유지. 8 메인 페이지 footer (`index`·`pokemon`·`pokemon-detail`·`items`·`abilities`·`moves`·`party`·`prompts`) + 5 레퍼런스 페이지 (`reference/{index,abilities,items,moves,pokemon}.html`) 의 `<a href="...serebii.net/pokemonchampions/">serebii.net</a>` → 평문 `serebii.net` 로 교체. `scripts/build_reference_html.py` 템플릿도 동일하게 수정해 다음 빌드에서 링크가 재삽입되지 않도록 고정. 텍스트 언급 자체는 남겨 저작권·윤리적 attribution 요구를 충족. 도구 아이콘(`web/assets/items/*.png`) 은 여전히 serebii 사본이라 이미지 의존성은 별도 과제로 남음.

- Ko-fi 후원 링크 연결 — T33 체크리스트 완료. `https://ko-fi.com/jyanny14` 가 확정됨에 따라 임시 `github.com/jyanny14` 링크를 일괄 교체.
  - `web/index.html` · `pokemon.html` · `pokemon-detail.html` · `items.html` · `abilities.html` · `moves.html` · `party.html` · `prompts.html` (8개) — footer `.btn-sponsor` href 교체 + 하드코딩 `title` 속성 재작성.
  - `web/assets/i18n.js` — `footer.sponsorHint` ko/en 2키 재작성. 기존 "서버·도메인 비용 보전" 프레임 제거 (GitHub Pages + 커스텀 도메인 없음 = 실제 운영비 $0 이라 사실과 불일치). 새 프레임: KO `프로젝트 운영에 대한 작은 감사 · 수익 목적 아님 · 비영리 팬 프로젝트` / EN `A small thank-you for maintaining this project · not for profit · non-commercial fan project`.
  - `docs/TODO.md` — T33 상태 `⏸️ 대기` → `✅ 완료 (2026-04-21)` 로 갱신. 새 프레임 기록 + Ko-fi 설정 가이드 (계정 타입 Developer/Open Source, 기본 팁 $1, auto thank-you 문안, Gold 구독 불필요) 본문에 통합. T33c(Sponsors 승인 대기 체크리스트) 는 경로 폐기되어 통합.
  - Ko-fi Gold/Contributor 구독은 **선택하지 않음** — Memberships/Shop/티어 혜택 등 T33b #1 의 금지 기능군만 풀어주고, one-time tip 수수료 0% 는 무료 티어에도 이미 적용되므로 이득 없음.

- 인라인 JSON 언어 필터링 — 한국어 모드에서 AI 가 영어 기술명을 추천 텍스트에 섞어 쓰던 문제 수정. 기존에는 `extractSlot` 이 `nameKo` · `nameEn` 둘 다 내보내서 AI 편향으로 영어 쪽을 집어가는 경향이 있었음. 데이터 번들 다운로드는 이미 `LANG_DROP_FIELDS` 로 한쪽만 내보내는데 **인라인 JSON 만 이 규칙을 따르지 않던 상태**.
  - `web/assets/prompts.js` — `extractSlot` 에 `isKo = getLang() === "ko"` 분기 + `pickName(ko, en)` 헬퍼. 포켓몬 이름 · 기술 이름 · 특성 이름·설명(gameText) · 도구 이름·효과 모두 현재 UI 언어에 해당하는 필드만 emit. `form.name` 은 폼 구별용 영어 식별자라 보존, `form.nameKo` 는 ko 모드에서만 추가. `item.effectKo` / `ability.gameTextKo` 도 ko 모드에서 우선 사용 (T16·T18 번역 커버리지 100% 전제).
  - 결과: KO 모드 인라인 JSON 크기 ~40% 감소 + AI 가 한국어 이름으로 일관되게 답변 예상.
  - EN 모드도 동일하게 `nameEn` · `gameText` · `effect` 만 emit.

- T35 MVP (더블배틀 지원) — 프롬프트 레이어에만 모드 개념 추가. 파티 빌더는 손 대지 않음. 총 9개 템플릿 (6 both + 3 double-only), 싱글 6개 / 더블 9개 카드 렌더.
  - `web/prompts.html` — `<section class="mode-toggle-wrap">` 신규 (`.mode-toggle` radiogroup, lang-toggle 스타일 재활용). 인라인 `<style>` 에 모드 토글 CSS (`.mode-toggle-wrap`, `.mode-toggle__opt`, 모바일 1열 전환).
  - `web/assets/prompts.js` — `state.mode` 추가 (localStorage `battleMode`). `resolveBody` 가 `${lang}Double` 키 조회 (없으면 싱글 fallback). `renderCards` 가 `mode === "double"` 템플릿을 싱글 모드에서 숨김. `wireModeToggle` / `syncModeToggleUI` 신규 — 클릭 시 state + localStorage 갱신 + renderCards 재호출 (페이지 리로드 없음).
  - `web/assets/prompts-templates.js` — 기존 6개 템플릿 (weakness/swap/moveset/fill/counter/free) 의 `body` 에 `koDouble` / `enDouble` 추가. 각 더블 버전은 리드 페어 · 스프레드 · 아군 피해 · 파트너 시너지 관점으로 재작성. 신규 3개 템플릿 (`leads` / `spread` / `synergy`) 추가, 각각 `mode: "double"` 플래그. 신규 템플릿은 `koDouble` / `enDouble` 만 가짐 (싱글 모드에서는 아예 안 보이므로 싱글 버전 불필요).
  - `web/assets/i18n.js` — ko/en 양쪽에 `prompts.mode.{label,single,double,hint}` 4키 + `prompts.tmpl.{leads,spread,synergy}.{title,desc}` 6키 신규.
  - 생략: T35a (`moves.json` target 필드 수집 via PokeAPI). AI 가 "Earthquake 는 전체" 같은 상식을 갖고 있어서 첫 패스에 불필요. 정확도 향상 필요 시 후속 작업.
  - 스모크: `TEMPLATES.length === 9`, 6개 both(4 키 전부), 3개 double(2 키), HTML/CSS 정상 serve. 실사용 테스트는 사용자 브라우저에서.

- 파티 빌더 Phase 3a · 3b — 슬롯 카드 상세 설정 탭 분리 + 기술 피커 행 강화.
  - **탭 분리 (3a)**: 기존 `<details>` 안에 기술 + 훈련 블록이 세로로 쌓여 펼침 상태에서 슬롯 카드가 매우 길었음. ARIA 탭 패턴 (`role="tablist"/"tab"/"tabpanel"` + `aria-selected` + `aria-controls` + `tabindex` roving) 으로 분리. 기본 활성 탭 = 기술, 매번 열 때 리셋. 키보드 ← → / Home / End 네비게이션. 활성 탭 표시: accent 색 밑줄.
    - `web/assets/party.js` `makeExtendedSection` 재구조화 — summary 아래 tablist + 2 tabpanel. `activate(which)` 헬퍼로 `aria-selected` / `tabindex` / `.--active` / `panel.hidden` 일괄 토글. `buildMovesBlock` / `buildTrainingBlock` 의 중복 heading 제거 (탭 라벨이 제목 역할).
    - `web/assets/style.css` — `.slot-card__tabs` / `.slot-card__tab` / `.slot-card__tab--active` / `.slot-card__tabpanel[hidden]` 추가. focus-visible + hover 스타일.
    - `web/assets/i18n.js` — `party.tab.moves` · `party.tab.training` ko/en 2키 신규.
    - 효과: 슬롯 카드 펼침 높이 약 40~50% 감소.
  - **기술 피커 행 강화 (3b)**: 기존 모달 행이 `이름/타입/분류/위력·명중` 만 보여줘서 moves 페이지 수준 정보가 부족. 2줄 구조로 재설계.
    - `web/assets/party.js` `renderMovePickerList` — 각 행: 1줄(이름 + Champions `★` 뱃지 + 타입 뱃지 + 분류 pill + `위력/명중/PP`) + 2줄(flavor text 2줄 ellipsis). updatedInChampions flag 로 ★ 뱃지 노출 (moves 페이지와 동일 시각 규칙). flavorText 는 현재 UI 언어(ko/en) 우선.
    - `web/assets/style.css` `.picker-row--move` 를 flex column 으로 재작성. `.picker-row__main` 4열 그리드 유지. `.picker-row__flavor` 에 `-webkit-line-clamp: 2` 로 2줄 ellipsis. `.picker-row__champions` 는 accent 색 작은 별.
    - 효과: 모달이 moves 페이지 수준의 상세 정보 제공 — 유저가 설명을 보려고 페이지 이동하지 않아도 됨.

- 파티 빌더 — 성격 드롭다운의 중립 5종을 **"중립" 한 항목**으로 통합. 유저 혼란 해결 ("왜 중립이 5개나?"). 게임 규칙상 Hardy/Docile/Serious/Bashful/Quirky 5종은 전 스탯 1.0× 로 기계적 효과가 모두 동일한데, 드롭다운에서 5개 따로 노출되던 상태였음.
  - `web/assets/party.js` — `CANONICAL_NEUTRAL_NATURE = "hardy"` 상수 + `isNeutralNatureSlug(slug)` 헬퍼 신규. `makeNatureSelect` 재작성: 중립 5종 제외 20종을 알파벳 정렬 + 앞에 단일 "중립" 엔트리 추가. 유저가 중립 선택하면 `hardy` 로 저장. 기존 URL 에 `bashful/docile/serious/quirky` 가 있어도 디코드는 수용 (back-compat), 렌더에서만 "중립" 으로 합쳐 표시. `buildExtraSummary` 도 중립 slug 감지해 "중립" 레이블.
  - `web/assets/i18n.js` — `party.nature.neutralHint` ko/en 신규 (옵션 `title` 툴팁용, 5종 동일 효과 설명).
  - 효과: 성격 드롭다운 항목 25 → 21 (+ "지정 없음", "중립", 20 non-neutral). 스크롤 감소, 유저 의사결정 부담 감소.

- 파티 빌더 Phase 2 — 기술 피커를 `<select>` 에서 **모달 방식** 으로 교체. 포켓몬 피커와 동일한 `<dialog>` 패턴·CSS 재활용. 기술 80+ 개를 검색 + 타입 + 분류 필터로 좁힐 수 있음.
  - `web/party.html` — `<dialog id="move-picker-modal">` 신규. 포켓몬 피커와 동일 구조 (`picker-modal__head` 에 검색·타입·분류 chips·닫기 버튼, `picker-modal__list` 에 스크롤 리스트). 24슬롯 공용 1개 인스턴스.
  - `web/assets/party.js` — `state.movePickerTarget` (`{slotIndex, slotPos}`) · `movePickerQuery` · `movePickerTypes` · `movePickerCats` 필드 신규. `makeMoveSelect` 를 `<button class="slot-card__move-btn">` 반환으로 재작성 — 선택된 기술명 + 타입 + 분류 표시, empty 시 placeholder. 클릭 시 `openMovePicker(slotIndex, slotPos)`. 신규 함수: `openMovePicker` · `closeMovePicker` · `renderMovePickerChips` (타입 18종 + 분류 3종 chips 1회 빌드·재사용) · `renderMovePickerList` (검색/타입/분류/다른 슬롯 선택된 기술 제외 필터 + `picker-row--move` 4열 그리드: 이름/타입/분류 뱃지/위력·명중) · `pickMove` (모달 닫고 state 반영). 필터는 모달 연닫기를 가로질러 유지 (여러 슬롯에 같은 필터 반복 적용 편의).
  - `web/assets/style.css` — `.slot-card__move-btn` (+`--empty`, `--meta`) 신규 — 모달 트리거 버튼, 긴 이름은 ellipsis, hover 시 accent 보더. `.picker-row--move` (4열 그리드) + `.picker-row__cat` (physical/special/status 별 배경색 light·dark 분기) + `.picker-row__num` (monospace 위력/명중). `.picker-modal__cats` 컨테이너.
  - `web/assets/i18n.js` — `party.moves.placeholder` + `party.movePicker.{title,searchPlaceholder,typeFilter,catFilter,alreadyUsed}` ko/en 6키 신규.
  - 결정: **남은 예산 자동 할당 버튼 (B-6) 은 별도 구현 생략** — `MAX` 버튼(`min(32, 남은 예산 + 현재값)`)이 이미 같은 동작이라 중복. 유저가 스탯 하나 MAX 하면 나머지 예산이 그 스탯에 들어감.

- 파티 빌더 Phase 1 UI 개선 — 외부 AI 컨설팅 결과 기반 (T32a 연장). 기술 select 오버플로우 수정 + 노력치 입력 UX 개편 + 성격/스탯 시각 연동.
  - `web/assets/style.css` — (1) `.slot-card { min-width: 0 }` 로 그리드 아이템 확장 차단. (2) `.slot-card__moves-row` 를 `minmax(0, 1fr)` 로 변경, select 에 `width: 100% + min-width: 0 + text-overflow: ellipsis` 로 2번째 열 기술 select 가 카드 밖으로 넘어가던 문제 해결. (3) `.slot-card__sp-budget` / `.slot-card__sp-budget-fill` (+over variant) — 66포인트 예산 진행 바 신규. (4) `.slot-card__sp-cell` 재설계: 그리드 2열·3행, 라벨+스테퍼+quick 액션. nature-effect data attribute 로 `color-mix` 기반 연한 녹색/빨강 tint. (5) `.slot-card__sp-stepper` (`[−] input [+]` 3칸 그리드) + `.slot-card__sp-step` (원형 작은 버튼). (6) `.slot-card__sp-quick` / `.slot-card__sp-quick-btn` — MAX / 0 미니 버튼. (7) `.slot-card__sp-label-arrow--up/down` — 성격 증가/감소 ↑↓ 아이콘 색.
  - `web/assets/party.js` `makeSpInputs` 전면 재작성 — `commit(i, v)` 헬퍼로 클램프·예산 검사·state 갱신 일원화, `maxFor(i)` 헬퍼로 "내 스탯 올려도 총합 66 안 넘는 최대값" 계산. 각 스탯 셀에 `data-stat` / `data-nature-effect` 자동 부착. stepper `[−][+]` 는 0 일 때 / headroom 도달 시 disabled. `MAX` 버튼은 `maxFor(i)` 까지, `0` 버튼은 0 으로 즉시. 예산 초과 시 input 타이핑은 이전 값 복원. 상단 progressbar role 에 `aria-valuenow/min/max` 설정.
  - `web/assets/i18n.js` — `party.sp.{dec,inc,max,zero}` ko/en 4키 신규 (스테퍼·quick 버튼 aria-label 용).
  - UX 결정 기록: 프리셋(물리풀/특수풀 등) 방식은 거부됨 — 대신 A+B 조합(빠른 액션 + 예산 바 + 스테퍼) 채택. "세밀 조작(타이핑)과 빠른 조작(버튼) 공존" 원칙.
  - Phase 2 (다음 세션): 기술 피커 모달 재구조 + 남은 예산 자동 할당 버튼. Phase 3 (추후): 탭 분리 · 메타 추천 기본값.

- Rotom 가전 5폼 전부 데이터에 추가 — 파티 빌더에서 Heat/Wash/Frost/Fan/Mow Rotom 각각 선택 가능.
  - 원인: serebii 의 Rotom 상세 페이지가 5종 가전 폼을 단일 "Stats - Alternate Forms" 테이블에 묶어 넣어서 (스탯·특성 동일, 타입만 다름) 파서가 "Alternate Forms" 한 개만 만들어내던 상태.
  - `scripts/parser.py` — `parse_pokemon_detail` 말미에 `slug == "rotom"` 체크 후 `_expand_rotom_forms` 호출. "Alternate Forms" 엔트리를 5개 PokemonForm 으로 전개 (Heat=Electric/Fire, Wash=Electric/Water, Frost=Electric/Ice, Fan=Electric/Flying, Mow=Electric/Grass). 스탯·특성(Levitate) 은 lumped 엔트리에서 상속.
  - `scripts/form_ko.py` — `_FULL_NAME_KO` 딕트 신규 (완전 대체 이름용). Rotom 5폼 한국어 이름 하드코딩 (Pokémon 공식 localization 이 일본어 표기 그대로 차용: 히트/워시/프로스트/스핀/커트 로토무). `form_name_to_ko` 첫 단계에서 체크.
  - `scripts/pokeapi_form_map.py` — `_OVERRIDES` 에서 `("rotom", "Alternate Forms")` → `"rotom-heat"` 단일 매핑 제거하고 5개 개별 매핑(`Heat Rotom` → `rotom-heat`, `Wash Rotom` → `rotom-wash`, ...) 추가. PokeAPI 스프라이트 변형 URL 이 정확히 이 slug 로 존재.
  - 스프라이트: `python scripts/fetch_form_sprites.py` 로 `rotom-wash/frost/fan/mow.png` 4개 신규 다운로드 (heat 는 이전부터 존재).
  - 빌드 파이프라인: `build.py` → `fetch_form_sprites.py` → `build.py` (스프라이트 반영) → `build_corpus.py` 순. 최종 `pokemon.json` 의 Rotom 엔트리가 6개 폼 (base + 5 가전) 각각 자기 sprite·types·nameKo 완비.
  - 부수 변경: `abilities.json` 의 Levitate 보유자 리스트에 Rotom 5폼이 각각 분리 노출되도록 자동 갱신.

- 파티 빌더 — 메가폼 선택 시 해당 **메가스톤 자동 장착 + 도구 고정**. 사용자가 메가 폼을 선택하면 실제 배틀에서 그 메가스톤이 반드시 필요하므로 다른 도구를 쥐어주는 건 잘못된 구성 → UI 에서 자동 처리.
  - `web/assets/party.js` — (1) `MEGA_STONE_BY_FORM` 맵 + `buildMegaStoneMap(items)` — items.json 의 mega-stone 카테고리 59개에서 effect text (`"... X holding this stone"` 패턴) 로 pokemon 이름 추출 후 form slug 과 매칭. 메가 폼 59개 전부 100% 커버리지 확인. (2) `applyMegaStoneLock(slot)` 헬퍼 — 메가 폼이면 itemSlug 를 해당 stone 으로 강제 교체 (non-mutating). (3) 적용 지점 3곳: `pickForm` (신규 슬롯 생성), `makeFormSelect` change 핸들러 (폼 변경), `readPartyFromUrl` (URL 디코드 — 옛 공유 URL 의 "메가 차리자드 + 먹다남은음식" 같은 부정합 자동 교정). (4) `makeItemSelect` — 현재 폼이 메가면 `sel.disabled=true` + `title` 툴팁 + `.slot-card__field--locked` 클래스.
  - `web/assets/i18n.js` — `party.megaStoneLocked` ko/en 2키 추가.
  - `web/assets/style.css` — `.slot-card__field--locked` 스타일 (opacity 0.7, not-allowed 커서, muted 배경) + 🔒 자물쇠 아이콘 pseudo-element.
  - 엣지 케이스: Mega Rayquaza 는 스톤 없음(`Dragon Ascent` 기술로 메가진화) → 맵에 없음 → 자물쇠 미작동. 의도한 동작.
  - 검증: Charizard X/Y 분리 매칭 (`charizardite-x/-y`), `A special Floette holding` 같은 수식어 포함 문장 정규식에서 올바르게 처리 (`[A-Z][a-z]+\s+holding this stone` 으로 명사 직전 매칭).

- `docs/TODO.md` — 후원 플랫폼 **Ko-fi 로 확정** (2026-04-21). GitHub Sponsors 승인 대기 포기 (일정 불확실). T33 을 "Ko-fi 계정 생성 대기" 상태로 갱신. T33a 를 "결정 이력" 으로 압축 (비교표 유지, Ko-fi 선정 표시). T33c 체크리스트는 T33 본문에 병합. 스프라이트 출처 고지는 현 수준 유지 결정 — 팬 사이트 관례·실질 리스크 낮음 판단 (Serebii/Smogon/Bulbapedia 전부 동일 수준 사용 중). 사용자 계정 생성 후 Ko-fi URL 제공 시 5분 내 href·툴팁 교체 완료.
- `docs/TODO.md` — "권리자 문의 시 즉시 링크 삭제 + 수령액 전액 환불" 프로세스 항목 **삭제** (T33 체크리스트 · T33b 리스크 완화 (1)d 에서 각각). 사용자 결정: 아직 한 번도 그런 문의가 없었으니 선제적으로 문서화할 필요 없음.

- `docs/TODO.md` — T33 확장. 임시 착지(커피 아이콘 + GitHub 프로필 연결) 완료 상태로 갱신. **T33a** 신규 — Buy Me a Coffee / Ko-fi 등 커피 후원 플랫폼을 대안으로 열어둠 (Sponsors 승인 지연 / 한국 유저 접근성 이슈 시 전환 검토, 권장 우선순위 비교표). **T33b** 신규 — 후원 도입 시 7가지 리스크 케이스 정리: (1) Nintendo IP, (2) 개인 세무, (3) 후원자 공개 노출, (4) 상업적 표시 실수, (5) 플랫폼 BAN, (6) 복수 플랫폼 관리 부담, (7) 유저 신뢰. **T33c** 신규 — Sponsors 승인 시 즉시 진행 체크리스트 (href 일괄 교체 · 툴팁 문구 갱신 · README 환불 절차 명시).

- T33 임시 착지 (GitHub Sponsors 승인 대기 중 · 옵션 B). 랜딩 개편 때 `.btn-sponsor` CSS 만 배치하고 HTML 은 빼뒀지만, 사용자가 "일단 GitHub 프로필로 임시 연결" 선택 → Sponsors 승인 시 URL 만 한 줄 교체하면 끝.
  - `web/assets/i18n.js` — `footer.sponsor` ("후원하기" / "Sponsor"), `footer.sponsorHint` (긴 툴팁 문구, ko/en) 2키 추가. `applyTranslations` 에 `data-i18n-title` 지원 추가.
  - `web/index.html`, `web/pokemon.html`, `web/items.html`, `web/abilities.html`, `web/moves.html`, `web/party.html`, `web/prompts.html`, `web/pokemon-detail.html` — footer 출처 `<p>` 다음에 `<a class="btn-sponsor">` (Octicons heart-fill SVG + 후원하기 라벨 + 임시 연결 설명 title 속성) 삽입. 현재 연결 URL: `https://github.com/jyanny14` (임시).
  - Sponsors 승인 나면 href 만 8곳 교체 (또는 컴포넌트화 검토).

- 프롬프트 규칙 3 오답 예시 교정 — 직전 커밋에서 `leftovers` 를 부재 예시로 넣었지만 실제로는 items.json 에 존재. 삭제하고 `assault-vest` · `life-orb` · `choice-band` · `choice-specs` · `rocky-helmet` · `heavy-duty-boots` · `eviolite` 로 부재 예시 교체 (전부 `grep "slug" items.json` 으로 실제 부재 확인). 반대로 존재하는 `leftovers` · `focus-sash` · `choice-scarf` 는 "확인 후 사용 가능" 예시로 추가 — AI 가 기계적으로 전부 배제하지 않도록.

- AI 프롬프트 환각(hallucination) 추가 방어 — "불확실하면 사전지식 대신 데이터 파일 다운로드 요청". Gemini 가 Champions 에 없는 `assault-vest`(돌격조끼) 를 추천한 사례에 대한 대응.
  - `web/assets/prompts-templates.js` — `STRICT_POOL_RULES_KO/EN` 규칙 2·3·6·7 재작성. (1) 규칙 2: fetch 불가 시 단순 "파일 붙여주세요" 가 아니라 "{{DATA_BUNDLE_PAGE_URL}} 에서 버튼으로 다운로드 → 첨부" 로 구체화. (2) 규칙 3: `assault-vest`·`leftovers` 를 구체 오답 예시로 명시. (3) 규칙 6: "불확실하면 제안 금지" 를 "불확실하면 유저에게 데이터 파일 다운로드 요청" 으로 확장, (a) 제공된 소스 내 유사 대체 찾기 / (b) 대체 불가 시 데이터 파일 요청 2단계 분기, "본편에 있으니 Champions 에도 있을 것" 추측을 명시 금지. (4) 규칙 7: 자기 검증 단계에서 "잘 모르겠다" 항목을 규칙 6 에 따라 데이터 파일 요청으로 교체하도록.
  - `web/assets/prompts.js` — `{{DATA_BUNDLE_PAGE_URL}}` 플레이스홀더 신규 (`./prompts.html` 로 치환). 모든 템플릿에서 이제 "데이터 파일 다운로드 페이지 URL" 을 AI 가 직접 유저에게 안내할 수 있음.

- `docs/TODO.md` — T35 (더블배틀 지원) 스코프 **대폭 축소** (17~25시간 → 6~9시간). 사용자 설계 통찰 반영: 파티 구성 자체는 싱글/더블 완전 동일하니 파티 빌더 UI 는 손 대지 않고, **프롬프트 레이어에만 모드 개념을 얹는다**. 파트너 시너지 heuristic 엔진도 제거(AI 판단이 더 유연). 작업 분해: moves.json target 필드 수집 / prompts.html 모드 토글 / 6개 템플릿 더블 버전 + 신규 2~3개 / i18n. 인접 툴(ChampTeams/VGC.tools)과 기능 중복 피하고 우리만의 차별점(AI 질문 생성) 유지.

- 랜딩 페이지 대대적 개편 (T32a 통합 구현 — 외부 AI 콘텐츠·UI 리서치 결과 반영). 기능 나열 중심에서 "언제·왜 쓰는가" 중심 메시지로 전환하고, 시각 위계를 추가해 훑어보기 편한 구조로 재구성.
  - `web/assets/style.css` — (1) `:root` 에 랜딩 전용 토큰 추가 (`--hero-start/end`, `--hero-text`, `--bg-alt`, `--bg-tint`) + 다크 모드 override. (2) Hero 를 그라디언트 배경 + SVG fractalNoise 오버레이 (`::before`, `mix-blend-mode: overlay`) 로 재작성. (3) `.when-to-use` 섹션 신규 — 카드 그리드와 구분되는 낮은 톤의 배경 + 3열 grid. (4) `.how-to` 재작성 — 원형 번호 배지 `.how-to__step-badge`, 혜택 한 줄 `.how-to__step-benefit`, 마이크로카피 `.how-to__step-meta`, 데스크톱(≥52rem) 에서 스텝 사이 CSS 화살표 커넥터(`::before`/`::after`). (5) `.card--highlight` 신규 — 파티 빌더 카드만 accent 보더 + 미세 그라디언트로 차별화. (6) `.site-footer__disclosure` 신규 — muted 배경 + accent 좌측 보더로 비영리/비공식 고지 강조. (7) `.btn-sponsor` 기반 CSS 미리 추가 (T33 승인 후 HTML 삽입만 하면 됨). (8) 전역 `@media (prefers-reduced-motion: reduce)` — 모든 transition/transform hover 모션 차단.
  - `web/index.html` — Hero 부제를 "랭크전 들어가기 전, 내 파티의 약점·커버리지·기술 선택을 한 번에 점검하고 AI에게 바로 물어볼 질문까지 만들어보세요" 로 교체. CTA 버튼 순서 뒤집어 "파티 빌더 시작" 을 primary 로. `<section class="when-to-use">` 신규 — 3줄 시나리오 (랭크전 점검/규정 변화/공유 피드백) + 이모지 아이콘. 파티 빌더 카드에 `card--highlight` 클래스 부여하고 첫 번째로 이동. how-to 4단계 전면 재작성 — 제목을 행동 중심으로 바꾸고("후보를 빠르게 좁혀보기" 등), 혜택 한 줄 + 보조 설명 + 마이크로카피 3단 구조. Footer 에 `site-footer__disclosure` 삽입.
  - `web/assets/i18n.js` — (ko/en 양쪽) `index.lead` 재작성, `index.when.{title,rank,meta,share}` 4키 신규, `index.howTo.step{1~4}.{title,benefit,body,meta}` 16키 재작성 (기존 8키 → 16키), `index.card.party.desc` 를 "AI에게 물어보기" 강조로 수정, `party.aiPrompts` / `party.aiPromptsDisabledHint` 리네임 ("AI 분석" → "AI에게 물어보기" / "AI analysis" → "Ask AI"), `prompts.title` / `prompts.lead` 리네임 ("AI 분석 프롬프트" → "AI에게 물어볼 질문 만들기" / "AI Analysis Prompts" → "Questions to ask an AI"), `footer.disclosure` 신규, `footer.copyright` 간략화.
  - `web/party.html`, `web/prompts.html` — "AI 분석" fallback 텍스트 및 `<title>` / meta description 리네임.
  - `web/pokemon.html`, `web/items.html`, `web/abilities.html`, `web/moves.html`, `web/pokemon-detail.html`, `web/party.html`, `web/prompts.html` — footer 에 `<p class="site-footer__disclosure">` 추가 (전 7개 페이지).
  - **제외 (후속)**: FAQ 섹션, Before/After 비교 카피, AI 차별점 독립 배너, 모바일 카드 가로 스크롤 스냅 — 현 개편 반영 후 체감 효과 보고 착수.

- `docs/TODO.md` — T32a 항목을 "리서치 수집 → 통합 구현 완료" 로 갱신. **T35 (더블배틀 VGC 파티 빌더)** 신규 추가 — 큰 작업(17~25시간 추정)으로 T35a~T35e 세부 분해. Champions 가 VGC 2026 공식 채택이라 수요 크고, moves.json target 필드 수집 / 배틀 모드 토글 / 파트너 시너지 heuristic / 더블 전용 AI 프롬프트 / i18n 확장 순으로 진행 예상.

- `docs/TODO.md` — T32a (랜딩 페이지 외부 AI 컨설팅) 신규 항목 추가. T32 결과물이 기능 나열 위주라 설명이 sparse 하다는 피드백에 따라, 콘텐츠·구조 + UI 개선안을 외부 AI 에 의뢰할 질문안 2건을 세션에서 준비하고 TODO 에 진행 중 상태로 기록.
- `docs/TODO.md` — T33 후원 링크 항목 업데이트. 플랫폼은 GitHub Sponsors 로 결정, 배치는 footer 한 줄, 문구 톤은 "서버 비용 보전·수익 목적 아님" 으로 Nintendo IP 리스크 회피. 현재 Sponsors 계정 승인 대기 중이라 ⏸️ 보류 상태로 전환, 승인 시점에 재개.

- 파티 빌더의 "AI 분석" 버튼을 파티 슬롯이 1개 이상 채워졌을 때만 활성화되도록 변경. 빈 파티로 `prompts.html` 에 진입해도 이미 empty-state 안내가 있었지만, 애초에 진입을 막는 편이 UX가 명확하다는 판단.
  - `web/assets/party.js:writePartyToUrl` — `hasAny = state.party.some(...)` 조건으로 `href` 지정/제거 + `aria-disabled` 토글 + tooltip 갱신. `bindGlobalEvents` 에 `aria-disabled="true"` 일 때 기본 네비게이션을 막는 클릭 가드 추가.
  - `web/assets/i18n.js` — `party.aiPromptsDisabledHint` ko/en 신규 (`title` 속성용 힌트).
  - `web/assets/style.css` — `.button[aria-disabled="true"]` 에 opacity 0.5 / not-allowed 커서 / hover 무효화 스타일 추가.

- **T32 — 랜딩 페이지 사용 방법 섹션 신규**. `web/index.html` 에 `<section class="how-to">` 추가 (card-grid 아래, footer 위). 4단계 카드 구성: (1) 데이터 둘러보기 — 4탭 검색/필터, (2) 파티 구성 — 슬롯 선택 + 상세 설정, (3) 공유·저장 — URL/localStorage/언어 토글, (4) AI 분석 — 6 템플릿 + fetch 불가 AI 대응(데이터 파일 첨부 + 프롬프트 별도 복사). `auto-fit minmax(280px,1fr)` 그리드로 반응형(데스크톱 2~4열, 모바일 1열). `index.howTo.*` 9키 ko/en 추가. 검증: KO/EN 양쪽 4개 스텝 제목·본문 전부 정상 렌더.

- **프롬프트 본문 + 데이터 번들 언어 연동**. 직전까지 프롬프트 본문은 T21 에서 "AI 대화는 한국어" 라는 가정으로 한국어 고정이었고, 데이터 번들도 양쪽 언어 전부 포함 1MB 단일 파일. 사용자 요청으로 둘 다 현재 UI 언어(한/영)에 맞게 분기.
  - `web/assets/prompts-templates.js` 전면 재구조화 — `SHARED_DISCLAIMER` / `STRICT_POOL_RULES` 각각 `_KO` / `_EN` 두 개로 분리, 각 템플릿의 `body` 필드는 `string` 에서 `{ ko, en }` 객체로 변경. 6개 템플릿 본문 영문 번역 작성 (weakness / swap / moveset / fill / counter / free), STRICT_POOL_RULES 7개 규칙 영문 번역도 동일 의미 유지.
  - `web/assets/prompts.js:substitute` → 신규 `resolveBody(bodySpec)` 헬퍼가 `getLang()` 으로 ko/en 선택. 문자열 단일 body 도 하위 호환 처리. Preview · copy full · copy url · download 전부 자동 언어 전환.
  - `web/assets/prompts.js:downloadDataBundle` → 언어별 필드 strip 추가. `LANG_DROP_FIELDS` 정의(`ko`: nameEn/gameText/description/flavorText/effect 제거, `en`: 동일한 한국어 변형 제거), `FORM_DROP_FIELDS` 로 form 객체는 별도 처리(form.name 은 기능적 식별자라 양쪽 모두 유지, form.nameKo 만 EN 모드에서 drop). `stripFields` / `filterCorpusByLang` / `bundleReadme(lang)` 헬퍼 신규. 파일명에 `-ko` / `-en` suffix + `_language` 필드 추가.
  - 용량: 1MB → 약 650KB 수준으로 ~35% 감소 (정확 수치는 환경에 따라).
  - 검증: KO 모드에서 카드 제목/rule/번들 라벨 전부 한국어, EN 모드에서 전부 영문 확인 (Chrome headless + localStorage seed 로 EN 재현).

- **Champions 데이터 파일 다운로드 기능** 신규. URL fetch 가 제한되는 AI(기본 모드 ChatGPT·일부 Gemini 구성 등)에서 "fetch 실패로 답변 불가" 또는 사전 지식 기반 hallucination 이 자주 발생하던 문제 대응. 해결 방식: 사용자가 Champions 전체 데이터 파일을 받아 AI 채팅에 **첨부**하고, 카드 "프롬프트+데이터 복사" 로 프롬프트는 **따로 복사**. AI 는 첨부된 JSON 을 진실의 소스로 사용.
  - `web/prompts.html` — 요약 칩 아래 `prompts-data-bundle` 박스 신규. 4단계 안내 리스트 + 다운로드 버튼.
  - `web/assets/prompts.js` — `downloadDataBundle()` 신규. `/data/corpus.json` fetch 후 최상위에 `_readme` + `_generatedAt` + `_source` 필드를 prepend 한 래퍼를 Blob 으로 내보냄. 파일명 `champions-data-YYYYMMDD.json`. 실패 시 버튼 라벨에 에러 피드백. `isoDate()` 헬퍼 추가.
  - `web/assets/i18n.js` — `prompts.dataBundleTitle` / `Step1..4` / `Button` / `Ready` / `Error` ko/en 8키.
  - `web/assets/prompts-templates.js` — `STRICT_POOL_RULES` rule 1 최상단에 "첨부 파일 우선 (a-0)" 규칙 prepend. 나머지 우선순위(fetched JSON > HTML > 인라인) 유지. 검증 결과 6개 카드 모두 새 rule 주입 확인.
  - 기존 자산 재사용: `web/data/corpus.json` (T9, 1,017,381 bytes) 그대로 활용, 별도 빌드 단계 불필요.

- **정적 HTML 레퍼런스 페이지 신규**. Gemini 를 비롯한 일부 AI 가 Champions 미등록 포켓몬을 지어내는 증상 + 검색 엔진이 JS 로 렌더되는 기존 목록 페이지의 데이터를 못 읽는 문제 동시 대응. `web/reference/{index,pokemon,moves,abilities,items}.html` 생성 — 모든 데이터가 정적 HTML 로 baked in 되어 있어 JS 실행 없이도 Googlebot, ChatGPT/Claude/Gemini/Perplexity 의 "search the web" 결과 snippet, 일반 AI fetch 전부 데이터 접근 가능.
  - `scripts/build_reference_html.py` 신규 — `web/data/*.json` → HTML. 크기: pokemon 361KB (186 section × 폼테이블 + learnable moves details), moves 137KB (481-row table), abilities 72KB, items 34KB, index 4KB.
  - 각 섹션에 `id="slug"` anchor 박아 `/reference/pokemon.html#charizard` 같은 딥링크 가능.
  - `web/index.html` footer 에 "데이터 레퍼런스 (AI · 검색용)" 링크 + i18n `footer.reference` ko/en.
  - `web/llms.txt` 에 "정적 HTML 레퍼런스" 섹션 추가 — AI 에게 "JSON fetch 실패 시 HTML 로 대체 가능" 명시.
- `STRICT_POOL_RULES` **규약 강화 + HTML 레퍼런스 대체 소스 추가**. Gemini 가 Champions 에 없는 포켓몬 설명하는 문제 직격. 주요 변화:
  - rule 1 에 JSON fallback 으로 `{{POKEMON_REF_URL}}` / `{{MOVES_REF_URL}}` / `{{ABILITIES_REF_URL}}` / `{{ITEMS_REF_URL}}` 추가 (JSON 못 다루는 AI 도 HTML 로 같은 소스 접근).
  - rule 3 강화: "당신의 사전 지식은 이 상황에서 **틀릴 확률이 매우 높습니다**. Champions 는 본편과 다른 라인업" 문구 추가.
  - rule 4 강화: slug 병기 + **출처 명시**(`(slug: xxx, 출처: pokemon.json)`) 요구.
  - rule 6 신규: "**불확실하면 제안하지 마세요.**" 사전 지식 기반 '아마도 있을 것' 명시 금지.
  - rule 7 신규 (구 rule 5 확장): 최종 전송 직전 체크리스트 방식 자기 검증. "잘 모르겠다" 항목은 제거, 제거 후 비면 "찾지 못함" 명시.
  - `web/assets/prompts.js` — 4개 ref URL 치환자 추가.
  - 검증: 6개 카드 전수 주입 확인 (STRICT 6, 신규 rule 6 6회, ref URL 각 6회).

- `web/robots.txt` 검색 엔진 인덱싱 **허용으로 전환**. 직전 버전은 search engine 까지 기본 차단(IP 리스크 회피 보수적 선택) 이었는데, 유저 유입 통로를 완전히 막아버리면 사이트의 의의가 약함. serebii / Bulbapedia / Smogon / PokemonDB 등 동종 팬 레퍼런스 사이트가 전부 풀 인덱싱 + 10~20년 문제없이 운영되는 관례, 그리고 README 의 "권리자 문의 시 즉시 삭제" 조항을 감안한 트레이드오프 재평가 결과. 유지한 건 (1) AI 학습 크롤러 차단, (2) `prompts.html` 의 `<meta name="robots" content="noindex">` — 파티 공유 URL 이라 인덱싱 의미 없음. 최종 로직: 학습 봇 block, user-triggered AI 봇 allow, 그 외 all allow.

- `web/robots.txt` 전면 재작성. 직전 버전 `User-agent: * / Disallow: /` 가 **ChatGPT/Claude.ai 의 user-triggered browsing 에이전트까지 모두 차단**하고 있었음. 유저가 AI 에 프롬프트 붙여넣어도 봇이 robots.txt 존중해서 fetch 포기 → "fetch 실패로 답변 불가" 루프. 새 정책 3단계:
  1. AI 학습 크롤러 차단 (Nintendo IP 리스크 유지): GPTBot, anthropic-ai, Google-Extended, CCBot, Bytespider, Meta-ExternalAgent, Applebot-Extended.
  2. User-triggered AI browsing 허용: ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User.
  3. 그 외 (검색 엔진 포함) — HTML 은 차단 유지(`<meta name="robots" content="noindex">` 이중 장치), 다만 `/data/` `/llms.txt` `/robots.txt` 는 Allow. 이유: UA 목록에 없는 AI 도구가 generic UA 로 요청할 때도 JSON 데이터만큼은 받을 수 있게 함. HTML 페이지는 JS 렌더라 봇이 fetch 해도 의미 없음.

- `STRICT_POOL_RULES` rule1 소프트닝. 직전 버전은 "fetch 실패 시 '데이터 fetch 실패로 답변 불가' 라고만 응답" 으로 강경 거부 → ChatGPT 기본·Claude.ai 기본 등 **fetch 기능이 없는/제한된 AI 도구에서 프롬프트 전체가 무효화** 되는 문제 발생. 유저 피드백("jyanny14.github.io 에서 데이터 불러오지 못함 → 답변 불가") 확인 후 즉시 수정.
  - 신규 규칙 구조: (1) fetch > 인라인 > 기타 금지 우선순위, (2) fetch 실패 시 답변 거부 대신 **인라인 JSON 만 진실의 소스로 사용** + **사전 지식 외부 항목 추가 금지** + 부족하면 "파일 내용 붙여주세요" 로 유저에게 되묻기, (3~6) 기존 no-out-of-pool / slug 병기 / abilities·moves 배열 강제 / 자기 검증 유지.
  - 6개 카드 전수 검증: 새 rule1 phrasing 6회, 구 강경 거부 문구 0회, 폴백 phrasing 6회 주입.

- `STRICT_POOL_RULES` 를 **6개 템플릿 모두**에 prepend 적용. 이전엔 swap / fill 2개에만 붙어 있어서 weakness("도구/특성 조정" 제안), counter("스위치 담당자" 추천), moveset(기술 세팅), free(자유 질문 중 뭐든 추천) 에서 AI 가 Champions 외 항목을 들고 올 여지가 있었음. 쉐어드 rules 에 `{{ITEMS_JSON_URL}}` / `{{ABILITIES_JSON_URL}}` 까지 추가해 "포켓몬/특성/도구/기술 모두 fetched 데이터 안에서만" 을 한 번에 강제. 규칙 본문도 포켓몬 한정에서 4종 항목 전부로 일반화, slug 병기 예시도 4개 카테고리별로 수록. 검증 결과: 6개 카드 각각 제약 1회 주입, 모든 placeholder 해결, pokemon/items/abilities/moves URL 정상 삽입.

- `web/assets/prompts.js:extractSlot` — 인라인 JSON 의 `learnableMoves` 필드 **제거**. 슬롯당 50~70개 × 6슬롯 × 7필드 = 6마리 파티 기준 ~60KB 낭비. 어차피 다른 포켓몬 추천하려면 pokemon.json 을 fetch 해야 하므로 현 파티의 learnable 만 따로 인라인할 이유 없다는 판단. **선택된 4기술** 은 slug 만 두면 모델이 이름/타입 모르니 상세 객체(type/category/power/accuracy/pp) 형태로 유지 (4×6=24개로 바이트 미미). 의존 템플릿 갱신:
  - `moveset` — 기존 "인라인 learnableMoves 에서 고르세요" → "pokemon.json 의 moves 배열에서 고르고, moves.json 에서 수치 조회" 로 재작성.
  - `fill` — moves.json URL 추가. "4기술 수치는 moves.json 에서 조회한 실제 값으로 표기" 명시.
- `web/assets/prompts.js:currentUrls + substitute` — `{{MOVES_JSON_URL}}` 치환자 신규. 확인: 1마리 파티 렌더 DOM 에 `data/moves.json` 2회(moveset + fill) 주입.

- `web/assets/prompts-templates.js` — swap / fill 템플릿이 Champions 미등록 포켓몬을 추천하던 문제 대응. `STRICT_POOL_RULES` 쉐어드 상수 신설 후 두 템플릿 최상단(SHARED_DISCLAIMER 다음)에 주입. 5개 규칙 핵심: (1) fetch 실패 시 답변 금지, (2) 186 species/267 forms 외부 제안 금지, (3) 모든 포켓몬 추천 시 `종족명 (slug: …)` 형식 강제, (4) 특성·도구·기술 모두 fetched 데이터 안에서만, (5) 답변 직전 자기 검증 후 없는 항목은 "찾지 못함" 으로 명시. 이전 짧은 "fetch 권장" 문구로는 모델이 사전지식 기반 hallucinate 하는 걸 막지 못해 제약을 리스트 형태로 재작성 + 반복.

- `docs/TODO.md` 에 **T32. 랜딩 페이지 사용 방법 상세 섹션** 및 **T33. 후원 링크** 추가. T33 에는 Nintendo IP 리스크 재점검 필요 항목 명시(문의 시 즉시 삭제 + 환불 프로세스 README 반영).

- `docs/TODO.md` 에 **T31. 일본어(日) · 중국어(中) 다국어 지원** 항목 추가. 번역팀 없이 전부 PokeAPI 에서 자동 수집하는 방향. ja / zh-Hans / zh-Hant 3언어 동시 처리, 데이터 레이어(스크립트) · UI 레이어(i18n + 토글 드롭다운) · manual override · 작업 순서 기재. 부분 진행 A안(데이터만 먼저)이 가성비 높다고 판단해서 실행 시 첫 착수지점으로 명시.

- prompts.html 에 **6번째 카드 "남은 슬롯 채우기" 추가**. 현재 파티의 빈 자리를 어떤 포켓몬·폼·특성·도구·기술·성격·SP 배분으로 채울지 세팅 단위로 추천받는 템플릿. `swap` 과 마찬가지로 POKEMON_JSON_URL fetch 필수. 각 빈 슬롯마다 역할 태그(선봉·피봇·물공·특공·내구벽·스위퍼·서포터)와 6스탯 SP 배분(총합 ≤66), 4기술(해당 폼 learnable 범위)까지 요청. 1~6마리 전부에서 동작 (빈 0칸이어도 AI 가 "이미 가득" 으로 응답하는 수준은 허용).
  - `web/assets/prompts-templates.js` — `fill` 템플릿 추가, `counter` 앞에 배치.
  - `web/assets/prompts.js:substitute` — `{{FILLED_COUNT}}` / `{{EMPTY_COUNT}}` 치환자 추가. 1마리 파티로 렌더 결과 "남은 5칸 / 현재 파티(1마리)" 정상 주입 확인.
  - `web/assets/i18n.js` — `prompts.tmpl.fill.title` / `prompts.tmpl.fill.desc` ko/en.

- prompts.html 5개 카드의 미리보기 영역을 `<details>` 로 감싸 **기본 접힌 상태** 로 전환. 카드 하나당 프롬프트 본문이 길어(> 1500자) 스크롤이 너무 길어진다는 피드백 반영. 복사 버튼 2개는 항상 노출, summary "미리보기 펼치기 / Show preview" 를 누르면 기존 preview + hint 가 펼쳐짐.
  - `web/assets/prompts.js:renderCards` — preview 와 hint 를 `<details class="prompt-card__preview-wrap">` 로 묶고 `<summary class="prompt-card__toggle">` 추가.
  - `web/assets/i18n.js` — `prompts.previewToggle` 키 ko/en 신규.
  - `web/prompts.html <style>` — 커스텀 disclosure 스타일(▸ 마커 회전, details[open] 시 hint/preview 상단 여백).

- `web/assets/prompts-templates.js:73` **moveset 템플릿 body 에 이스케이프 안 된 백틱** 이 섞여 있어(`\`Flamethrower (...)\``) 전체 모듈이 `Uncaught SyntaxError: Unexpected identifier 'Flamethrower'` 로 파싱 실패 → `prompts.js` 가 `TEMPLATES` 를 import 하지 못해 **prompts.html 에 카드 5개가 전부 렌더되지 않는 버그**. 해당 백틱을 `\`` 로 이스케이프. Chrome headless + `--enable-logging=stderr` 로 배포본 console 에러 수집해서 특정.

## 2026-04-20

- `web/` 디렉토리에서 `python -m http.server 8000` 백그라운드 실행 (로컬 테스트용). http://localhost:8000/ 응답 200 확인.
- `docs/sheets-export-plan.md` 신규 작성 — 파티 빌더 결과를 Google Sheets로 가져오는 3단계(TSV 내보내기 버튼 / Apps Script 파서 / Python CLI) 연동 계획.

### 공개 배포(GitHub Pages) 전환 + AI 프롬프트 템플릿

로컬 전용 방침 철회 → GitHub Pages 무료·퍼블릭 레포 배포로 결정. 광고·수익화는 이번 범위에서 제외 (Nintendo IP 리스크). 구성 요소:

- `README.md` — "로컬 전용" 문구 제거, GitHub Pages 배포 방식 안내, 비영리 팬 프로젝트 문구 강화. 권리자 요청 시 즉시 삭제 조항 추가.
- `web/robots.txt` 신규 — `Disallow: /` 로 전체 크롤러 차단 (IP 리스크 고려해 검색 노출 의도 없음).
- `web/llms.txt` — 배포 URL 예시 블록 + Champions 고유 변경점(신규 특성/수치 변경 기술/메가스톤/HOME 연동 게임) 섹션 추가.
- `web/assets/party-encode.js` 신규 — `party.js` 에 있던 URL 인코딩/디코딩 로직(`slotToString`·`stringToSlot`·파티 배열 encode/decode) 을 pure 모듈로 분리. `party.js` 와 새 `prompts.js` 가 동일 인코더 공유.
- `web/assets/party.js` — 새 모듈 import 로 교체, "AI 분석" 앵커 동기화 로직 추가, init 에서 `writePartyToUrl()` 1회 호출로 앵커 href 즉시 반영.
- `web/party.html` — `.party-actions` 에 `#ai-prompts` 앵커(`prompts.html?p=…`) 추가.
- `web/prompts.html` 신규 — AI 프롬프트 카드 페이지. 파티 요약 chip + 템플릿 5개 카드(미리보기 pre + "프롬프트만 복사" / "프롬프트 + 데이터 복사" 버튼).
- `web/assets/prompts.js` 신규 — corpus 4종 로드, `?p=` 디코드, 파티 슬롯별 필요 최소치 JSON 발췌(pokemon+form+ability+item+learnableMoves), 템플릿 치환, 클립보드 복사.
- `web/assets/prompts-templates.js` 신규 — 공용 디스클레이머 + 5개 템플릿(`weakness`·`swap`·`moveset`·`counter`·`free`). `swap` 만 `requiresPokemonPool: true` 로 pokemon.json fetch 지시.
- `docs/ai-prompts.md` 신규 — 템플릿 5종·공용 디스클레이머·인라인 JSON 발췌 규칙 요약 문서. 원문 소스는 `prompts-templates.js`.

검증: 로컬 서버에서 `robots.txt`·`prompts.html`·`party.html`·`llms.txt`·신규 JS 모듈 모두 200. `prompts.html?p=…` 쿼리 포함 200. 전 JS 모듈 `node --check` 통과. 실제 UI/클립보드 복사 동작은 브라우저 수동 검증 대상.

- 최초 커밋(`627c6f1`) 후 `--amend --author` 로 작성자 이메일 오타(`gmailc.om`→`gmail.com`) 수정 → `--force-with-lease` 로 원격 갱신(`beaabf7`). 이후 로컬 `git config --global user.email` 도 사용자가 교정.
- `.github/workflows/pages.yml` 추가. 원래 계획의 "Settings → Pages / `main` / `/web`" 방식이 GitHub Pages 실제 UI 에서 불가능(폴더는 `/` 또는 `/docs` 만 허용)해 Actions 배포로 전환. 공식 `actions/configure-pages@v5` + `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` 로 `web/` 을 artifact 로 업로드. `README.md` 배포 섹션도 Actions 방식으로 갱신.
- KO 모드 영어 노출 실측 후 `docs/TODO.md` 에 T16–T21 신규 등재: 도구 `effect` 117/117 영어, 어빌리티 `descriptionKo` 192/192 비어, `gameTextKo` 16건, 기술 `nameKo` 35건, `flavorTextKo` 44건, 그리고 `prompts` 페이지 i18n 미적용(역방향). 기존 T4b(어빌리티 nameKo 14) / T8b(도구 nameKo 24) 도 같은 맥락이라 표에서 언급.

### T22b — 노력치(SP) + 성격 UI · 실효 스탯 계산 ✅

각 슬롯 카드의 "상세 설정(접힘)" 영역이 이제 3개 블록: **기술(T22a) · 훈련(성격 · SP · 실효 스탯)**. 요약은 `상세 설정 · 기술 N/4 · SP X/66 · 성격 Y`.

- `web/assets/stats.js` 신규 — Champions 실효 스탯 공식. `spToEv(sp)` = 0 (sp=0) / 8·sp−4 (sp≥1). Level 50, IV 31 고정. HP = `⌊(2·base+31+⌊ev/4⌋)·50/100⌋+50+10`, 기타 = `⌊(⌊(2·base+31+⌊ev/4⌋)·50/100⌋+5)·natureMod⌋`. Nature modifier 는 `party-encode.js` 의 `natureMultipliers` 재사용.
- `web/assets/party.js` — `loadMoves`/`fetch natures.json` 동시 로드, `state.natures` 신설. `makeExtendedSection` 이 moves/nature/SP 블록을 한 `<details>` 아래 묶음. `makeNatureSelect` 는 25종 드롭다운 + 보정 스탯 툴팁("+atk / −spAtk" 식). `makeSpInputs` 는 6개 number input(0–32), 헤더에 `X/66` 합계 · 초과 시 빨간 강조, 입력 단위로 clamp 하고 총합 초과 시 해당 입력을 revert.
- 실효 스탯은 SP/nature 가 바뀔 때마다 카드 내부에서 즉시 재계산돼 한 줄 요약("HP 205 · 공격 320 …") 으로 노출.
- i18n: `party.extras.title`, `party.training.title`, `party.nature.*`, `party.sp.*` ko/en 추가.
- `web/assets/style.css` 의 `.slot-card__moves` 섹션을 `.slot-card__extra` 계열로 확장: SP 그리드(모바일 3×2 → 데스크톱 6×1), `.slot-card__sp-total--over` 초과 경고, `.slot-card__sp-effective` 요약 줄 스타일.

### T22a — 기술 4칸 피커 UI + STAB 커버리지 실반영 ✅

각 슬롯 카드 하단에 `<details class="slot-card__moves">` 접힘 영역 추가. 기본 접힘이지만 moves 가 한 개라도 있으면 auto-open.

- `web/assets/party.js` — `loadMoves` import, `state.moveMap` 신설, `makeMovesSection`/`makeMoveSelect` 추가. 각 슬롯은 4개 `<select>` (기술1~4) 로 노출되고, 각 드롭다운은 해당 species 의 learnable(=`pokemon.moves`) 전체를 이름순 정렬, 타입·분류 표기 포함 옵션으로 표시. 중복 선택 방지(이미 다른 slot 에 있는 기술은 옵션에서 제외).
- 선택 값 변경 시 compact array 관리: 비우면 splice, 새로 선택하면 push/replace. state.party[i].moves 는 항상 길이 0–4 의 non-empty slug 배열.
- **분석 변경**: `renderAttackCoverage` 가 slot 의 설정된 damaging move(category != "status") 타입을 모아 사용. 기술 미설정 시에만 과거처럼 `form.types` 로 폴백(classic STAB 가정). 즉 4기술을 채우면 실제 전투용 커버리지가 즉시 반영됨.
- `scripts 는 변경 없음` — 이미 T10 에서 moves.json 완비.
- i18n: `party.moves.title` / `party.moves.slot` / `party.moves.none` ko/en 추가.
- `web/assets/style.css` — `.slot-card__moves`, `.slot-card__moves-summary`, `.slot-card__moves-row` 추가 (반응형 2열 그리드 at ≥640px).

### T22 — 파티 빌더 확장 공통 인프라 ✅

슬롯 스키마를 `slug:formName:abilitySlug:itemSlug[:moves[:sps[:nature]]]` 로 확장. 뒤 3개 필드 optional 이라 **기존 4-필드 공유 URL 완전 호환** (부족 필드는 기본값으로 채움).

- `web/assets/party-encode.js` — `slotToString` 이 뒤 trailing empty 필드 자동 trim, `stringToSlot` 가 learnable 범위 검증·SP clamp(per-stat ≤32, total ≤66)·nature slug 형식 검증 수행. 추가 헬퍼 `emptySps()`, `natureMultipliers(slug, natures)`, 상수 `SP_TOTAL_MAX=66`, `SP_PER_STAT_MAX=32`, `MOVES_PER_SLOT=4`, `SP_STAT_KEYS` export.
- `web/assets/party.js` — `Slot` typedef 에 moves/sps/nature 추가, `pickForm` 에서 새 슬롯 생성 시 기본값 초기화, `onLoadSavedChange` 도 `decodeParty` 경유로 통일 (localStorage 저장된 구 포맷도 호환).
- `web/assets/prompts.js` — AI 프롬프트 인라인 JSON 의 `extractSlot` 이 slot.moves·slot.sps·slot.nature 를 포함. learnableMoves 와 분리해 "현재 세팅" vs "가능한 풀" 을 AI 가 구분 가능.
- `web/llms.txt` — 파티 URL 인코딩 섹션을 7-필드 스키마로 재작성, 예시 2개(레거시 / 확장) 병기.
- `docs/schema.md` — 신규 "Party Slot" 섹션 추가.

슬롯 타입은 이제 moves/sps/nature 가 in-state 존재하지만 **UI 는 아직 기존 모습** — T22a (기술 피커) / T22b (SP 입력) 후속 커밋에서 채움. AI 프롬프트는 이미 새 필드를 보고 있으므로 수동으로 URL 에 확장 슬롯을 넣어 공유하면 AI 가 활용 가능.

### T22c — Nature(성격) 데이터 파이프라인 구축 ✅

Champions 는 본편과 동일한 25 성격 체계를 유지하므로 PokeAPI `/nature/{slug}/` 를 그대로 수집.

- `scripts/fetch_natures.py` 신규 — PokeAPI 25번 호출, ko/en 이름 + increased/decreased 스탯 추출. PokeAPI stat slug (`attack` 등) 를 우리 baseStats key (`atk` 등) 로 변환. 캐시 사용, `--force` 지원.
- `scripts/build_natures.py` 신규 — processed 에서 shape 정규화 후 `web/data/natures.json` 작성. 25개 slug 정렬.
- `scripts/build.py` `write_manifest` 에 natures 엔트리 추가 (다른 JSON 과 동일 해시 관리).
- `scripts/build_corpus.py` `FILES` 목록에 `natures` 추가 → corpus.json 에 자동 포함 (990 → 994 KB).
- `web/assets/i18n.js` 에 `nature.<slug>` 25키 × ko/en 추가. 중립 5종(Hardy/Docile/Serious/Bashful/Quirky) 포함.
- `web/llms.txt` 데이터 엔드포인트 목록에 `/data/natures.json` 행 추가.
- `docs/schema.md` 에 Natures 스키마 섹션 추가 (StatKey 정의, 보정 ±10%, 중립 규칙).

빌드 결과: natures.json 25건 저장. abilities.json diff 는 직전 커밋 Floette rename 의 역인덱스 propagation 2건만 (floette 보유 특성에서 form name "Eternal Floette" 로).

다음: T22 공통 인프라 — slot 인코딩 확장 + UI 접힘 영역.

### Floette 폼 "Eternal Floette" 로 정정

사용자 지적 — Fandom 한국어 위키(플라엣테)에 있는 "영원의 꽃 플라엣테" 폼이 우리 데이터에 반영되지 않음. 실측 원인: serebii Champions 페이지의 Name/Type 테이블이 "Floette" 로 열리고 Stats 테이블이 "Stats - Eternal Floette" 로 닫히는 구조라, 파서가 form.name 을 "Floette" 로 남겨 둔 상태. 실제 baseStats(HP 74/Atk 65/Def 67/SpA 125/SpD 128/Spe 92, Total 551)는 Eternal Flower 수치를 반영 중이었으나 라벨이 잘못된 것.

수정:
- `scripts/parser.py` — Stats 헤더의 variant_name 이 current form name 의 superset(예: "Eternal Floette" 의 부분문자열로 "Floette" 포함) 일 때 form 명을 variant_name 으로 채택. 가드 덕분에 다른 186마리 중 재명명 0건.
- `scripts/form_ko.py` — `_PREFIX_KO` 에 `"Eternal": "영원의 꽃"` 추가. 이제 "Eternal Floette" → "영원의 꽃 플라엣테" 로 자동 합성.
- `data/manual/game_sources_override.json` — 기존 `floette.Floette` 키를 `floette.Eternal Floette` 로 이름 변경 (override 는 form name 매칭 기반이라 rename 필수).

재빌드 후 `pokemon.json` 의 floette 엔트리:
- `Eternal Floette` / `영원의 꽃 플라엣테` (Total 551)
- `Mega Floette` / `메가 플라엣테` (Total 651)

기존 `?p=floette:Floette:...` 공유 URL 은 decode 단계에서 `findForm` 실패 후 `p.forms[0]` 로 폴백되어 Eternal Floette 로 해석됨 — 깨지지 않음.

### Pokémon Legends: Z-A 대량 반영 — 133/186 마리

앞 커밋에서 Pidgeot/Charizard 2마리만 땜빵으로 추가했는데 사용자가 "나무위키에서 가져올 순 없나" 질문. 나무위키 자체는 WebFetch 403이지만 **Bulbapedia 의 `List of Pokémon in Pokémon Legends: Z-A`** 페이지를 MediaWiki parse API (`action=parse&prop=wikitext`) 로 읽어 대량 추출 가능.

- 페이지 요약: Z-A 총 364마리 (base 232 + DLC Mega Dimension 132). Bulbapedia 가 다국어 번호 체계라 WebFetch 응답의 도감번호는 간혹 부정확하지만 **영문명은 신뢰 가능**.
- 여러 차례 fetch 로 pokemon list 추출 → `za_list_tmp.txt` (임시 작업파일, git 미포함) 에 쌓아 우리 186마리 slug 와 정규화 매칭.
- 불명확한 47마리는 별도 yes/no 질의로 확정 (Sylveon·Hawlucha·Dedenne·Goodra 등 대부분 Kalos Gen 6 포켓몬이 yes, Hisuian/Gen 9 중 상당수 no).
- 최종: **133/186 마리 Z-A 등장**, 206개 폼에 `legends-z-a` 적용. `data/manual/game_sources_override.json` 에 폼별 전체 게임 리스트 기재 (override 는 per-form 전체 치환이므로 기존 게임 보존 위해 전량 나열 필요).

**미매치 53마리** (Bulbapedia 교차 확인 시 no): ninetales, arcanine, tauros, ditto, snorlax, typhlosion, azumarill, politoed, forretress, pelipper, torkoal, castform, torterra, infernape, empoleon, luxray, rampardos, bastiodon, spiritomb, toxicroak, weavile, rhyperior, gliscor, mamoswine, serperior, samurott, conkeldurr, whimsicott, zoroark, reuniclus, beartic, hydreigon, volcarona, decidueye, incineroar, primarina, toucannon, polteageist, hatterene, alcremie, meowscarada, skeledirge, quaquaval, maushold, bellibolt, espathra, palafin, orthworm, farigiraf, kingambit, sinistcha, archaludon, hydrapple.

재빌드 후 `corpus.json` 984→990 KB.

### Pokémon Legends: Z-A 소스 게임 반영 시작

사용자 지적 — Pidgeot 이 Z-A 에도 있는데 HOME 연동 게임 교집합 계산에서 Let's Go 만 잡힘. 원인: `data/manual/game_sources_override.json` 이 빈 상태라 Z-A 가 어떤 포켓몬에도 추가돼 있지 않았음. 대응:

- `data/manual/game_sources_override.json` 에 우선 `pidgeot` / `charizard` 양쪽 폼 모두 `legends-z-a` 포함시켜 추가. override 는 파이 단위 전체 치환이라 기존 Let's Go/SV 값도 그대로 유지한 채 Z-A 를 append.
- `web/assets/i18n.js` 에 `game.legends-z-a` 키 ko("레전드 Z-A")/en("Legends: Z-A") 추가.
- `python scripts/build.py` + `build_corpus.py` 재빌드로 `pokemon.json[].forms[].sourceGames` 반영 확인.

잔여 과제: Z-A 에 등장하는 다른 Kalos 포켓몬들 전수는 아직 override 에 없음 — 필요할 때 추가.

### 기술(Moves) 탭 신설 ✅

`web/moves.html` 신규. 481개 기술 전수 목록. 검색(이름 ko/en·slug·flavor), 타입 multi-chip 필터, 물리/특수/변화 분류 chip, "Champions 재밸런스 기술만" 체크박스, 이름·타입·위력·명중·PP 정렬. URL 쿼리로 모든 필터 상태 공유 가능. 재밸런스 16건은 ⚡ 배지 + 왼쪽 강조선. 모든 기존 페이지 nav 에 기술 링크 추가, 인덱스에 카드(count 라이브 반영 위해 `app.js` hydrateCounts 에 `move-count` 키 신설), `llms.txt` 엔드포인트 목록에 `/moves.html?q=&types=&cat=&champions=&sort=` 추가. 데이터 변동 없음 (moves.json/corpus.json 그대로).

### TODO 추가 — Champions 전투 상세(기술·SP·Nature) 파티 빌더 확장

`docs/TODO.md` 에 T22 / T22a / T22b / T22c 로 나눠 등재. Serebii `training.shtml` + Bulbapedia `Pokémon Champions` 에서 확인한 메커니즘:

- IV 31 고정, Level 50 고정 (UI 노출 불필요)
- Stat Points(SP) — EV 대체. 첫 SP=4 EV, 추가 SP=8 EV. 스탯당 ≤32, **총합 ≤66** (2스탯 집중 시 65, 5–6스탯 분산 시 66)
- Nature 25종 유지 / ±10% 보정
- Moves 4기술 (learnable 범위)
- Ability 변경은 기존 필드 내에서

파티 슬롯 스키마를 `slug:form:ability:item:moves:sps:nature` 로 확장하되 뒤쪽 필드 optional 로 해서 **기존 공유 URL 호환** 유지. AI 프롬프트 인라인 JSON 도 moves·sps·nature 포함시켜 정확도 향상.

### 검토 문서 정리 — review-translations.md 재작성

번역 검증이 100% 끝나면서 `docs/review-translations.md` 가 "비어 있음/추정 번역" 체크리스트 형태로 남아 있던 내용을 실제 상태에 맞게 **반영 이력 + 출처 참고서** 형태로 갈아끼움. 최종 커버리지 표 · 사용한 소스(PokeAPI·Bulbapedia·Fandom KR API) · 접근 실패한 소스(namu.wiki·web.archive.org) · 이번 라운드에서 얻은 교훈 5개(추정 번역 오차율, Fandom 텍스트 오타, WebFetch Hangul 글자 깨짐 등) · 남은 유의점 · 재빌드 절차 · 핵심 규칙으로 구성. `docs/TODO.md` 의 한국어 커버리지 섹션 헤더도 완료 표시로 전환.

### 번역 전수 웹 검증 (T16·T18·T19·T20) ✅

본인이 작성한 추정 텍스트를 전부 걷어내고 웹 소스로 교체.

- **T19 기술 nameKo 35건** — Bulbapedia "In other languages" 로 전수 검증. **25/35 = 74%가 불일치** (axekick 액스킥→발꿈치찍기, gigatonhammer 대왕해머→거대해머, matchagotcha 말차샷→휘적휘적포, saltcure 소금뿌리기→소금절이, stoneaxe 바위도끼→암석액스, wavecrash 파도격돌→웨이브태클 등). chillingwater·trailblaze 2건은 Bulbapedia 에 한국어명 미등재라 공백(영문 폴백).
- **T18 어빌리티 gameTextKo 16건** — Fandom Korean Pokémon wiki (pokemon.fandom.com/ko) 의 MediaWiki parse API 로 조회. Bulbapedia 는 이름만 있고 설명이 없어 Fandom 을 사용. 14건 확보, 2건(sharpness·zerotohero) wiki 에도 설명 없어 공백. 명백한 오타만 보정(편승하서→편승해서, 꿰뚫하는→꿰뚫는, 쌍청→쾌청 등).
- **T20 기술 flavorTextKo 42건** — 동일 Fandom API 로 조회. 본인 작문 44건 전부 교체. 2건(chillingwater·trailblaze) 은 nameKo 가 없어 조회 불가. Fandom 텍스트 오타 다수 보정(발쿠치→발꿈치, 압정끼리기→압정뿌리기, 불쌍한→불쾌한, 쌓기스→엑기스 등). 상세 목록은 `data/manual/move_flavors_ko.json` _comment 참조.
- **T16 도구 effectKo 117/117** — held 30건은 개별 Fandom 조회, mega-stone 59건은 4건 샘플로 확인된 공식 템플릿 일괄 적용, berry 28건은 샘플로 확인된 3 패턴 일괄 적용. kings-rock(왕의징표석) 은 처음엔 공백 유지했다가 사용자 지적으로 Fandom 페이지 재확인 — 페이지 자체는 있으나 표준 효과 설명 표가 없어 wiki 스타일 패턴으로 작문("지니게 하면 기술로 상대에게 대미지를 줄 때 상대를 풀죽음 상태로 만들 때가 있다."). 명백한 오타 보정(가깝고→가볍고, 뿌족한→뾰족한, 감동→감촉, 쌌을→줬을).

**핵심 교훈**: T4b·T8b 38건 보강 때 이미 "내 추정 중 3건은 공식과 다름" 을 확인했는데, T19 재검증에서 **74% 오차율**이 드러나 전수 검증의 가치가 재확인됨. 앞으로 번역은 반드시 공식 출처로 검증 후 반영. Fandom 텍스트에도 오타가 있어 100% 완벽은 아니지만 본인 작문보다 훨씬 신뢰 가능.

최종 커버리지: 어빌리티 gameTextKo 190/192, 기술 nameKo 479/481, 기술 flavorTextKo 479/481, 도구 effectKo 116/117 — 공백 1~2건은 wiki 에도 없어 영문 폴백으로 둠.

### T4b + T8b 완료 — Bulbapedia 기반 38건 검증·반영 ✅

- 원래 "Champions 한국어판 발매 전엔 공식값이 없을 것" 으로 비워 뒀던 T4b(어빌리티 14) + T8b(도구 24) 를 Bulbapedia "In other languages" 섹션으로 확인해보니 **38건 전부 이미 공식 한국어명이 등재돼 있음**. 즉 공식값은 존재했고, 우리 PokeAPI 파이프라인이 그걸 수확하지 못했을 뿐.
- Bulbapedia 페이지 38건 각각 fetch 해서 한국어명 추출 → `data/manual/ability_names_ko.json`(14) · `data/manual/item_names_ko.json`(24) 에 전부 반영.
- 내가 처음 추정 번역했던 값 중 **3건은 공식과 달랐다** — `armortail`(무장꼬리→테일아머), `electromorphosis`(전기바뀜→전기로바꾸기), `supremeoverlord`(백전노장→총대장). 잘못 반영 대신 빈값 유지한 게 실제로 사고를 막았다.
- `abilities.json[].nameKo` 192/192, `items.json[].nameKo` 117/117. corpus 987 KB.
- `docs/review-translations.md` §A 업데이트: T4b/T8b 섹션에 반영된 값 테이블 + 초기 추정과 차이 표시. `docs/TODO.md` T4b/T8b 를 완료로 마감.

### T21 prompts 페이지 i18n ✅

- 기존 하드코딩 한국어 → `prompts.*` i18n 키 24개(+`party.aiPrompts`)로 전환. EN 모드에서 자연스러운 영어 출력.
- `web/assets/i18n.js` ko/en 양쪽에 `prompts.*` 블록 신설.
- `web/prompts.html` — skip-link / page 제목 / 리드 / 인트로 / 섹션 aria / 푸터 에 `data-i18n` · `data-i18n-aria`. 인트로의 `<code>` 태그는 번역 범위 밖이라 인라인 스타일 제거.
- `web/assets/prompts.js` — 로드 에러, 빈 파티 안내 HTML, 카드 태그/버튼 라벨/미리보기 aria, 복사 결과 토글, fallback prompt, URL-only hint 모두 `t()` 경유.
- `web/assets/prompts-templates.js` — `title`/`description` 제거, `titleKey`/`descKey` 로 대체. body 는 한국어 고정 (AI 프롬프트 자체는 한국어 대화용).
- 제외: `<title>`·`<meta description>` 은 다른 페이지 전반이 하드코딩 상태라 일관성 유지.

### 번역 검토 문서 작성

`docs/review-translations.md` 신규 — T4b/T8b 의 비어 있는 항목(어빌리티 nameKo 14 + 도구 nameKo 24)과, T18/T19/T20 에서 본인이 임의로 채운 항목들(어빌리티 gameTextKo 16·기술 nameKo 35·기술 flavorTextKo 44)을 🔴/🟡/🟢 색으로 분류해 체크리스트로 제공. `docs/TODO.md` §한국어 커버리지 보강 섹션 상단에서 본 문서를 참조.

참조 자료 섹션 추가: 공식 출처(포켓몬 코리아 도감·SV 인게임·HOME 한국어 UI 등) 와 2차 커뮤니티 출처(나무위키·포켓몬 위키 fandom·Bulbapedia·PokeAPI) 를 표로 정리. Champions 고유 항목은 **한국어판 발매 전까지 빈값 유지 권장** 을 명시 — 추정 번역보다 영문 폴백이 투명함. Gen 9 확정 항목은 SV 인게임으로 오늘 당장 확인 가능한 slug 목록을 따로 분류.

### T20 기술 flavorTextKo 44건 수동 보강 ✅ 481/481

- PokeAPI 한국어 flavor text 없는 44건(Gen 9 이후) 을 공식 게임 톤(~한다/~된다) 으로 번역. 1–2문장.
- `data/manual/move_flavors_ko.json` 신설 (`{slug: flavorTextKo}`).
- `scripts/build_moves.py` — `_load_slug_map` 리팩터링 후 `_load_move_flavors_ko()` 추가. `fetched flavorTextKo` 가 비어 있을 때만 manual 로 덮음 (nameKo 와 동일 패턴, PokeAPI 후속 갱신 자동 흡수).
- 빌드 로그에 `manual flavorKo=N` 줄 추가. corpus 981 → 986 KB.
- 노출: 포켓몬 상세 페이지 기술 테이블 이름 셀 tooltip (`pokemon-detail.js:182`). KO 모드에서 한국어 설명으로 마우스오버 표시.

### T19 기술 nameKo 35건 수동 보강 ✅ 481/481

- PokeAPI 한국어 이름이 없던 Gen 9 이후 기술 35건 전체를 SV 공식 한국어명으로 채움. `data/manual/move_names_ko.json` 신설.
- `scripts/build_moves.py` — `MOVE_NAMES_KO_OVERRIDE_PATH` + `_load_move_names_ko()` 추가. 로직은 **fetch 된 nameKo 가 비어 있을 때만 manual 값을 사용** (PokeAPI 후속 갱신 시 자동 흡수 되도록). 빌드 로그에 `manual nameKo filled=N` 줄 추가.
- 결과: `moves.json[].nameKo` 446 → 481/481 (0 누락). 포켓몬 상세 기술 테이블 영문 이름 완전 해소.

### T18 어빌리티 gameTextKo 16건 수동 보강 ✅ 192/192

- PokeAPI 한국어 flavor text 가 없는 16개(Gen 9/Champions 신규 위주 + `hospitality`, `supersweetsyrup` 2건) 을 수동 번역.
- `data/manual/ability_descriptions_ko.json` 신설 — processed 파일과 같은 shape(`{slug: {gameTextKo, descriptionKo}}`). 이번 배치는 `gameTextKo` 만 채움.
- `scripts/build.py` `_load_ability_descriptions_ko` 를 **processed + manual merge (manual 승, per-field)** 로 확장. 기존 자동 수집값은 유지하고 누락분만 덮음. `ABILITY_DESC_KO_OVERRIDE_PATH` 상수 추가.
- 번역 스타일은 공식 게임 톤(`~된다/~한다`) 유지. 예: "땅타입 기술을 받으면 대미지를 받지 않고 HP 를 회복한다" (earth-eater).
- 빌드: `abilities.json[].gameTextKo` 192/192 커버. corpus 979→981 KB.
- 잔여: T4b (nameKo 14건) — Champions 신규 abilities 는 공식 한글명이 확정 안 된 것이 있어 미결. T17 A안과 합치면 KO 모드 어빌리티 카드는 이제 전원 한국어 gameText 만 보이므로 체감 이슈 대부분 해소.

### T17 어빌리티 descriptionKo — A안 적용 ✅

- `abilities.json[].descriptionKo` 가 0/192 라 KO 모드 어빌리티 카드가 Korean gameText 밑에 English description 을 달고 있어 섞여 보였던 문제.
- `web/assets/app.js` `abilityDescription()` 을 KO 모드에서 `descriptionKo || ""` 전용으로 수정(English 폴백 제거) + JSDoc 에 KO 모드 시 빈 반환 → 호출자는 DOM 생략 원칙 명시.
- `web/assets/abilities-list.js` 카드 렌더러가 descText 빈 문자열이면 `.ability-card__desc` 단락 자체를 DOM 에 추가하지 않도록 변경.
- 결과: KO 모드는 gameText 한 줄만 깔끔히 표시 (176장 한국어, 16장은 gameText 영문 한 줄 — T18 과 겹침). EN 모드는 gameText + description 두 줄 유지.
- 잔여 B안(192건 직접 번역)은 후순위로 TODO 유지. 공식 한국어 effect 가 존재하지 않아 품질 보증이 어렵고 A안이 체감 이슈 대부분을 해소하므로.

### T16 도구 effect 한국어 번역 ✅ 117/117

- `data/manual/item_effects_ko.json` 신규 — 117개 도구(held 30 / mega-stone 59 / berry 28) effect 번역 모두 채움. 공식 한국어 게임 텍스트 컨벤션(~된다 문체)으로 통일. 메가스톤 이름은 `pokemon.json[].nameKo` 기반으로 일관 적용(예: 눈설왕/앱솔/리자몽/장크로다일/… 모단단게).
- `scripts/build.py` — `ITEM_EFFECTS_KO_OVERRIDE_PATH` + `_load_item_effects_ko()` 추가, `build_items()` 가 `effectKo` 를 병합하도록 확장.
- `web/assets/app.js` — `itemEffect(item)` 공용 헬퍼 추가(`getLang() === 'ko' ? effectKo||effect : effect`).
- `web/assets/items-list.js` — `effect.textContent = itemEffect(it)` 로 치환, 검색 매칭에 `effectKo` 포함.
- `docs/schema.md` — items 스키마에 `effectKo` 필드 반영, 샘플에 black-belt 한·영 양쪽 표시.
- 빌드 결과: `web/data/items.json` 117/117 effectKo, `corpus.json` 924KB → 979KB, manifest 갱신.

---

## 2026-04-15

### 프로젝트 초기화 · 기록 체계

- 프로젝트 작업 히스토리 기록 체계 수립
  - `docs/history.md` 파일 생성 (본 파일)
  - `CLAUDE.md`에 "모든 작업 내역을 `docs/history.md`에 기록" 규칙 추가 → 향후 세션에서도 자동 적용되도록 프로젝트 로컬 설정에 영구 저장

### Phase 0 — serebii 수집 · 초기 파서

- serebii.net Pokemon Champions 페이지 HTML 수집 및 파서 작성
  - `pip install -r scripts/requirements.txt` 실행해 의존성 설치
  - `scripts/fetcher.py` 실행으로 4개 페이지 HTML 캐시 저장
    - `data/raw/www.serebii.net/pokemonchampions_pokemon.shtml_*.html` (201 KB)
    - `data/raw/www.serebii.net/pokemonchampions_recruit.shtml_*.html` (52 KB)
    - `data/raw/www.serebii.net/pokemonchampions_transferonly.shtml_*.html` (67 KB)
    - `data/raw/www.serebii.net/pokemonchampions_giftpokemon.shtml_*.html` (51 KB)
  - HTML 구조 분석 후 `scripts/parser.py` 신규 작성
    - `parse_pokemon_list()` → 258개 Pokemon (번호/이름/타입/슬러그)
    - `parse_transfer_only()` → 26개 전송 전용 Pokemon (스탯 포함)
    - `parse_recruit_items()` → 32개 리크루트 아이템
    - `parse_gift_pokemon()` → 7개 선물 Pokemon (어빌리티/성격/개체값)

### 프로젝트 계획서 — `docs/plan.md`

- 프로젝트 계획서 작성 — `docs/plan.md`
  - 목표: 포켓몬/도구/특성 브라우징 + 파티 빌더 정적 웹앱
  - 데이터 모델, 디렉토리 구조, 5단계 phase 정의
  - Phase 0(현재 완료) ~ Phase 5(고도화) 로드맵
  - 사용자 확인 필요 항목 5건 명시 (한국어 이름, 배포, 이미지 호스팅, 갱신 주기, 출처 표기)
- 사용자 결정 사항 반영하여 `docs/plan.md` 개정
  - 언어: 한국어 기본 + 영어 보조 (Pokemon 모델에 `nameKo`/`nameEn` 분리)
  - 배포: GitHub Pages 제거, 로컬 전용으로 전환 (`python -m http.server`)
  - 이미지: PokeAPI sprites 저장소 사본을 `web/assets/sprites/`에 포함
  - 자동화: GitHub Actions 제거, `python scripts/main.py` 수동 실행만
  - 출처: README + 푸터에 serebii/PokeAPI/Nintendo 표기 (임의 결정)
  - PokeAPI 연동 작업(`scripts/pokeapi.py`)을 Phase 1에 추가
  - 디렉토리 구조에서 `.github/workflows/` 제거, `web/assets/sprites,items/` 추가

### Phase 1 — 세분화 · 재구현

- Phase 1 세분화 및 재구현 (이전 `main.py` 단일 실행이 60분 넘게 진행 없이 대기하던 문제 해결)
  - 원인: serebii 전 페이지에 1.5초 throttle이 걸린 채 순차 fetch(상세 258 + 어빌리티 수십 + PokeAPI + 스프라이트)가 한 프로세스에서 돌아 누적 지연 + 진행 표시 부재
  - `scripts/config.py`: `REQUEST_DELAY_BY_HOST` 도입(도메인별 rate limit). serebii 1.5s, pokeapi 0.2s, raw.githubusercontent 0.1s
  - `scripts/fetcher.py`: 전역 `_last_request_at`을 host별 dict로 전환, `fetch_json` / `fetch_binary` 추가, 요청 로직 `_request()`로 공통화
  - `scripts/parser.py`: `parse_pokemon_detail` (한글 이름·국가번호·타입·특성 링크·종족값), `parse_ability_detail` (Game's Text + In-Depth Effect) 추가
  - **중요 발견**: serebii 상세 페이지에 이미 한글 이름이 포함되어 있어 PokeAPI 이름 호출 자체가 불필요 → Phase 1에서 PokeAPI 네트워크 호출 제거
  - 단계별 스크립트 분리(각각 `--limit`로 dry-run, `--force`로 캐시 무시, 진행률 `[N/total]` 로그)
    - `scripts/fetch_pokemon_details.py` — pokedex-champions/{slug}/ 258종(슬러그 dedupe)
    - `scripts/fetch_abilities.py` — 캐시된 상세 HTML에서 어빌리티 slug 수집 후 abilitydex 페이지 fetch
    - `scripts/fetch_sprites.py` — dex 번호로 github.com/PokeAPI/sprites PNG 다운로드 → `web/assets/sprites/{n}.png`
    - `scripts/build.py` — 네트워크 호출 없이 캐시 HTML을 머지해 `data/dist/{pokemon,items,abilities}.json` 생성, obtain 소스 병합, 어빌리티 역인덱스(holders) 포함
  - 검증: `--limit 3`으로 각 단계 dry-run 후 build까지 성공 (`venusaur/charizard/blastoise` + `blaze/chlorophyll/drought`)
  - 사용법: `python scripts/fetch_pokemon_details.py` → `fetch_abilities.py` → `fetch_sprites.py` → `build.py` 순서로 수동 실행. 각 단계가 캐시되므로 중단되어도 재실행 안전

- Phase 1 풀 실행 완료 및 `data/dist/*.json` 생성
  - `fetch_pokemon_details.py` 풀 실행: 186마리 (dedupe 후), 274초, 실패 0 — 예상 4.6분과 일치
  - `fetch_abilities.py` 풀 실행: 192개 어빌리티, 283초, 실패 0
  - `fetch_sprites.py` 풀 실행: 186개 PNG, ~71초, 실패 0 → `web/assets/sprites/`
  - 파서 버그 수정: `parse_pokemon_detail`이 stats 테이블 헤더를 `== "Stats"`로 매칭해 폼 있는 포켓몬(예: floette — "Stats - Eternal Floette") 1건 실패 → `startswith("Stats")`로 변경
  - `build.py` 풀 실행: 186 pokemon / 32 items / 192 abilities 생성. 검증 결과 nameKo/baseStats/types/sprite 모두 누락 0
  - 알려진 한계: 12개 어빌리티(aerilate, battlebond, parentalbond, unseenfist 등)가 holder 없음 — 전부 메가/대체폼 전용이며 현재 파서는 base form만 추출. 후속 과제로 task 등록

### 메가/대체폼 파서 확장

- 메가/대체폼 파서 확장 — orphan 어빌리티 12 → 0으로 해소
  - 페이지 구조 두 패턴 확인
    - Pattern A (마커 + 트리플릿): Mega Kangaskhan, Mega Charizard X/Y 등 — 소형 마커 테이블 뒤에 Name/Abilities/Stats 트리플릿 반복
    - Pattern B (인라인 변종): Alolan Raichu, Hisuian Zoroark, Midnight/Dusk Lycanroc 등 — 마커 없이 page 끝에 `Stats - <변종명>` 테이블만 추가, 변종 어빌리티는 base abilities 셀의 괄호 표기로만 존재
    - 혼합: Floette는 B(Eternal, base stats 자리에 suffix 붙음) + A(Mega) 동시 존재
  - `scripts/parser.py`
    - `PokemonForm` 추가, `PokemonDetail`을 `forms` 리스트로 전환하고 기존 호출부 호환용 property 유지
    - `parse_pokemon_detail`을 dextable 순차 순회 + 상태 머신으로 재작성 (Name 테이블 → 새 폼 시작, Abilities → 현재 폼에 할당, Stats → 현재 폼 비어 있으면 할당/아니면 suffix를 붙여 변종 생성)
    - 무시 섹션 판정을 `contains` → `startswith`로 수정해 "Stats - Alternate Forms" 같은 합법 변종이 스킵되지 않도록 함 (Rotom 버그)
    - 정보 테이블의 per-form type 행(Normal/Alolan/Hisuian/...) 파싱 추가: Raichu/Zoroark/Rotom에서 폼별 타입 정확히 매핑
    - serebii의 깨진 ability 링크(`/abilitydex/.shtml`) 대비 이름에서 slug fallback (`re.sub(r"[^a-z0-9]","",name.lower())`) — Greninja의 Battle Bond 복구
  - `scripts/build.py`
    - `pokemon.json`에 `forms: [{name, types, abilities, baseStats}]` 배열 추가
    - 어빌리티 역인덱스를 단순 slug 리스트 → `[{slug, form}]` 오브젝트 리스트로 승급. 모든 폼의 어빌리티를 스캔해 holder 연결
  - 검증 결과: 186 pokemon / **267 forms** (76마리 다폼), orphan 어빌리티 **12 → 0**, 스탯/타입 누락 0건
    - 스팟 체크: parentalbond→Mega Kangaskhan, battlebond→Greninja, toughclaws→Mega Charizard X/Mega Aerodactyl/Lycanroc 3폼, trace→Mega Alakazam/Gardevoir/Mega Meowstic, fairyaura→Mega Floette

### Phase 2-1 — 정적 웹앱 골격

- Phase 2-1 정적 웹앱 골격 작성 — 추후 온라인 배포를 염두한 구조
  - 배포 친화 원칙: `web/` 하나만 서빙하면 완결된 정적 사이트가 되도록 함. 상대 경로만 사용, 외부 URL 핫링크 금지, 의존성 없는 vanilla ES module, 모바일 퍼스트 + `prefers-color-scheme` 다크모드
  - `scripts/build.py` 출력 경로를 `data/dist/` → `web/data/`로 이전. 기존 `data/dist/` 삭제. `docs/plan.md`의 모든 경로 참조 함께 수정
  - `scripts/fetch_item_icons.py` 신규 — serebii의 recruit item 아이콘을 `web/assets/items/{slug}.png`로 로컬 다운로드 (32개, 47초)
  - `build.py`: `items.json`의 `iconUrl`(serebii 절대 URL)을 `iconPath`(로컬 상대 경로)로 교체
  - `web/index.html` 신규 — `<html lang="ko">`, viewport, og 메타, 스킵 링크, sticky 헤더/네비(포켓몬/도구/특성/파티), 히어로, 4개 카드 그리드(카운트 슬롯 `data-stat`), 저작권 푸터. 인라인 스크립트 없음
  - `web/assets/style.css` 신규 — CSS 변수 토큰(light/dark 자동 전환), Pretendard/Apple SD Gothic Neo 한국어 폰트 스택, 공통 컴포넌트(컨테이너, 버튼, 카드, 네비), 520px 이하 모바일 레이아웃 스위치
  - `web/assets/app.js` 신규 — ES module. `loadPokemon/loadItems/loadAbilities` (Promise 캐시), 한·영 검색 헬퍼 `matchesQuery`, `formatDex`, `statTotal`, 타입·입수 한국어 라벨 맵, 네비 현재 페이지 `aria-current` 처리, 랜딩 카운트 hydration
  - 로컬 검증: `python -m http.server 8765`로 `web/` 서빙. `index.html`, `style.css`, `app.js`, `data/*.json`, `assets/sprites/6.png`, `assets/items/*.png` 모두 200 OK 확인

### Phase 2-2 — 포켓몬 목록 페이지

- Phase 2-2 포켓몬 목록 페이지 구현
  - `web/index.html` 히어로 카피 수정: "Pokemon Champions, 한국어로 둘러보기" → "Pokemon Champions 파티 빌더" (사용자 피드백 반영)
  - `web/pokemon.html` 신규 — 페이지 헤더, 검색 입력, 정렬 셀렉트, 타입 칩 필터, 입수 경로 칩 필터, 결과 카운트, 초기화 버튼, 포켓몬 그리드, 빈 상태 플레이스홀더
  - `web/assets/pokemon-list.js` 신규 — ES module
    - 로컬 state (query/types/obtain/sort) + URL 쿼리 양방향 동기화로 북마크/공유 가능
    - 타입/입수 칩 필터 동적 생성, 선택 상태 `aria-pressed` 관리
    - 한·영 매칭 검색 (`matchesQuery` 재사용), 타입 다중 필터는 **모든 폼**의 타입을 합쳐 부분집합 체크(메가/지역폼 타입도 검색 대상)
    - 정렬: 도감번호(기본)/한글명(Intl.Collator ko)/영문명/종족값 합계
    - 카드 렌더: sprite(lazy, 96×96, pixelated), dex 번호, 한글명/영문명, 타입 뱃지, 종족값 합계, 입수 뱃지, 다폼인 경우 "폼 N" 배지 + title에 폼 이름 목록
    - 결과 카운트 aria-live 업데이트, 빈 상태 메시지
  - `web/assets/style.css` 확장 — `.filters` 컨테이너, `.field`/`.chip`/`.chip-row` 컨트롤, `.pokemon-grid` + `.poke-card` (96px 스프라이트, 메타 영역), `.type` 18개 타입 색상, 선택된 칩 배경 타입 색 매칭, `.obtain` 입수 뱃지(recruit/transfer/gift/default) light+dark 양쪽 컬러, `.empty-state`
  - 브라우저 시각 검증 완료 (사용자)

### AI 친화 데이터 보강 계획 — `docs/TODO.md`

- `docs/TODO.md` 신규 — AI 친화 데이터 보강 후속 작업 명세
  - 최종 목표: Pokemon Champions 파티 조합을 LLM에게 추천받는 것
  - serebii `transferonly.shtml`에 게임 소스 컬럼 없음을 확인, 폼 이름 규칙 + PokeAPI `game_indices`로 역산하는 방안 기록
  - 작업 항목 T1~T10: schema.md, manifest.json, 문자열 정규화, 어빌리티 한글명, PokeAPI 상세, 폼→게임 소스 역산, 타입 상성, 아이템 한글명, 통합 코퍼스, 기술 수집
  - 선행 결정: `manifest.json` 방식 확정(JSON 구조 유지), `_meta` 헤더 방식 폐기

- `docs/TODO.md` 게임 소스 전략 단순화 (사용자 피드백 반영)
  - 목적 재정의: "유저가 HOME을 통해 Champions로 옮겨올 수 있는 게임"만 필요. 첫 등장 게임/지역 같은 족보 정보는 불필요
  - 폼 이름 휴리스틱 폐기 — PokeAPI `game_indices`가 지역 변종(`raichu-alola` 등)을 별도 엔트리로 제공하므로 정본으로 사용
  - `originGame`/`originRegion` 필드 삭제. `sourceGames` 한 필드로 통일
  - `sourceGames`는 **HOME 직접 연동 게임만 포함** (SwSh, BDSP, LA, SV, LGPE, Champions). Bank 경유(Gen 3~7)는 T12 후속 개선으로 분리
  - T5 재작성 + T5a(폼→PokeAPI slug 매핑) 신규 + T6(수동 오버라이드) 재정의 + T11(어빌리티 한국어 설명)/T12(Bank 레거시) 신규
  - **재개 순서(Resume Sequence) 섹션 추가** — 나중에 이 TODO로 돌아왔을 때 바로 이어서 진행할 수 있도록 T항목들을 실행 순서로 정렬

### Phase 2-3 — 도구 목록 페이지 (초기 구현, 이후 04-16에 데이터 교체)

- Phase 2-3 도구 목록 페이지 구현 (recruit.shtml 기반 — 이후 오인 판명)
  - `web/items.html` 신규 — 페이지 헤더, 검색 입력, 카테고리 칩 필터(타입 친화 / 몬스터볼), 결과 카운트, 초기화 버튼, 아이템 그리드, 빈 상태
  - `web/assets/items-list.js` 신규 — `loadItems()` 호출, 이름/슬러그/효과 부분일치 검색, 카테고리를 slug 접미로 파생(`type-affinity` / `ball-guaranteed`), URL 쿼리 동기화(`?q=&cat=`), 카드 렌더(아이콘 56px/이름/효과 설명/카테고리 태그/입수 위치)
  - `web/assets/style.css` 확장 — `.item-grid`(auto-fill minmax 320px), `.item-card`(flex 아이콘 좌측 + 내용 우측), `.category-tag` 색 변형(type-affinity/ball-guaranteed/other) light+dark 버전
  - 검증: 32개 아이템(타입 18 + 볼 14), 모든 `iconPath` 로컬 경로로 연결, `items.html` 200 OK
  - **이후 사용자 지적으로 데이터 소스 오류 판명 → 2026-04-16에 교체**

---

## 2026-04-16

### items 데이터 소스 교체 — recruit.shtml → items.shtml

- items 데이터 소스 교체 — recruit.shtml → items.shtml (사용자 피드백 반영)
  - **원인**: 이전 파이프라인이 `recruit.shtml`을 "도구(held item)" 소스로 잘못 사용. 실제로는 리크루트 시스템 티켓만 들어있었음(타입 친화 티켓 18 + 몬스터볼 티켓 14 = 32개)
  - **진짜 도구 페이지 발견**: serebii `pokemonchampions/items.shtml`에 4개 카테고리 총 138개 — Hold Items 30, Mega Stones 59, Berries 28, Miscellaneous(리크루트 티켓) 21
  - 사용자 결정: **리크루트 티켓/쿠폰은 제외**, 지닌 도구/메가스톤/나무열매만 items.json에 반영 → 최종 117개
  - `scripts/config.py`: `ITEMS_LISTING_URL` 추가
  - `scripts/parser.py`: `ChampionsItem` dataclass + `parse_items_listing()` 신규. 섹션 `<b>` 헤딩 기반 카테고리 판정(Hold Items/Mega Stone/Berries만 수집, Miscellaneous는 드롭)
  - `scripts/fetch_items_listing.py` 신규 — items.shtml fetch + 파싱 카운트 로그
  - `scripts/fetch_item_icons.py` 전면 교체 — items.shtml 파싱 결과로 아이콘 다운. 117/117 OK, 175초
  - 기존 `web/assets/items/` 내 리크루트 티켓 아이콘 32개 제거 후 재생성
  - `scripts/build.py`: `build_items`를 `parse_items_listing` 기반으로 교체, `category` 필드를 파서에서 직접 주입(held/mega-stone/berry), 카테고리 순 + 이름 순 정렬
  - `web/assets/items-list.js`: `CATEGORIES`를 3개로 교체(지닌 도구/메가스톤/나무열매), `categoryOf`는 `item.category` 필드 직접 사용
  - `web/assets/style.css`: `.category-tag` 색 변형을 held(인디고)/mega-stone(보라)/berry(초록)로 교체. 기존 type-affinity/ball-guaranteed 스타일 삭제. 다크모드 양쪽 대응
  - 검증: items.json 117개(30+59+28), 아이콘 누락 0, 엔드포인트 전부 200 OK
  - `docs/TODO.md` 갱신:
    - **T13 신규**: serebii Champions 섹션에서 미수집 페이지 목록 — moves.shtml(파티 추천 필수), newabilities.shtml, megaabilities.shtml, updatedattacks.shtml, achievements.shtml, depositbonuses.shtml, training.shtml, statusconditions.shtml. 우선순위 명시
    - **T14 신규**: 리크루트 티켓 데이터(현재 items.json에서 제외)를 향후 필요 시 `recruit_tickets.json`으로 분리 관리하는 방안

### 브라우저 캐시 버그 수정

- `web/assets/app.js` fetch 캐시 정책 수정 — `cache: "force-cache"` → `"no-cache"`
  - 문제: 데이터 JSON이 재생성되어도 브라우저가 force-cache 때문에 이전 버전을 계속 반환. items.html에서 옛날 리크루트 티켓 데이터와 삭제된 아이콘 경로(`fire-type-affinity-ticket.png` 등)가 그대로 노출됨
  - 해결: `no-cache`는 요청 시 서버 검증을 강제해 regenerated JSON을 즉시 반영. 세션 내 중복 요청은 여전히 `_cache` Map이 차단

### history.md 재정리

- `docs/history.md` 가독성 개선
  - 작업 단위를 `###` 서브헤더로 그룹화해 탐색 용이성 향상
  - 2026-04-15 안에서 append 순서가 꼬여 있던 엔트리(TODO 단순화가 Phase 2-3 이후에 잘못 기록됨 등)를 실제 작업 시간 순으로 재정렬
  - items 데이터 소스 교체 / 캐시 버그 수정 / history 재정리 자체를 2026-04-16 섹션으로 분리

### Phase 2-4 — 특성 목록 페이지

- Phase 2-4 특성 목록 페이지 구현
  - `web/abilities.html` 신규 — 페이지 헤더, 검색 입력, 정렬 셀렉트(이름/보유 포켓몬 수), 결과 카운트, 초기화 버튼, 특성 그리드, 빈 상태
  - `web/assets/abilities-list.js` 신규 — ES module
    - `loadAbilities()` + `loadPokemon()` 병렬 로드. pokemon slug → 객체 Map으로 한글명/스프라이트 참조
    - 이름/슬러그/gameText/description 부분일치 검색
    - 정렬: 영문 이름(기본) / 보유 포켓몬 수(내림차순)
    - URL 쿼리 양방향 동기화(`?q=&sort=`)
    - 카드 렌더: 특성명 + 보유 수 헤더, gameText(공식 문구), description(상세 효과), 보유 포켓몬 칩 리스트(스프라이트 24px + 한글명)
    - 보유 포켓몬 중복 제거: 같은 slug의 여러 폼을 그룹화해 `(폼수)` 표기, title에 폼 이름 목록
  - `web/assets/style.css` 확장 — `.ability-grid`(auto-fill minmax 380px), `.ability-card`(헤더/텍스트/홀더 세로 배치), `.ability-holder`(pill 형태 칩, 24px 스프라이트 + 이름), 520px 이하 모바일에서 1컬럼 전환
  - 검증: abilities.html/abilities-list.js/abilities.json/pokemon.json/style.css 모두 200 OK

### 한/영 전환 (i18n) 시스템 도입

- 전 페이지 한/영 언어 전환 기능 추가
  - `web/assets/i18n.js` 신규 — 경량 i18n 모듈
    - ko/en 두 언어의 전체 UI 문자열 사전 (~100 키): 공통(네비/푸터), 인덱스, 포켓몬, 도구, 특성 페이지별 + 타입 18종 + 입수 경로 4종
    - `t(key)` 번역 함수, `getLang()`/`setLang()` (localStorage 영속, 전환 시 페이지 리로드)
    - `applyTranslations()` — DOM의 `[data-i18n]`/`[data-i18n-ph]`/`[data-i18n-aria]` 속성을 스캔해 텍스트/placeholder/aria-label 일괄 교체
    - `initLangToggle()` — `#lang-toggle` 버튼 바인딩 및 활성 표시
  - 모든 HTML 페이지 (`index/pokemon/items/abilities.html`) 공통 변경:
    - 헤더 좌측에 `[한|EN]` pill 토글 버튼 추가 (`.brand-area` > `.lang-toggle`)
    - 정적 텍스트 요소에 `data-i18n="key"` 속성 부여 (제목/설명/필터 라벨/버튼/푸터 등)
    - 검색 placeholder에 `data-i18n-ph`, aria-label에 `data-i18n-aria` 속성
    - 결과 카운트 단위("마리"/"개")를 `<span data-i18n>` 래퍼로 분리
  - `web/assets/app.js` 리팩터:
    - i18n.js import + re-export (`t`, `getLang`, `setLang`)
    - `typeLabelKo`/`obtainLabelKo` → `typeLabel`/`obtainLabel`로 i18n 대응 (하위호환 별칭 유지)
    - `hydrateCounts()` 단위 표기 언어별 분기 ("186 마리" / "186 Pokémon")
    - 모듈 초기화에 `applyTranslations()` + `initLangToggle()` 호출 추가
  - `web/assets/pokemon-list.js` — `typeLabel`/`obtainLabel`/`t()` 사용으로 전환
  - `web/assets/items-list.js` — `CATEGORIES.label`을 `t()` 호출로 전환
  - `web/assets/abilities-list.js` — 에러/카운트 텍스트 `t()` 사용
  - `web/assets/style.css` — `.brand-area`(flex 래퍼), `.lang-toggle`/`.lang-toggle__opt`/`--active` (pill 토글, accent 색상, dark mode 대응) 추가
  - items.html 설명문 수정: "리크루트 티켓 목록" → "지닌 도구, 메가스톤, 나무열매 목록" (이전 데이터 교체 반영 누락 수정)
  - 검증: 7개 엔드포인트 전부 200 OK

### Phase 2-5 — 포켓몬 상세 페이지

- Phase 2-5 포켓몬 상세 페이지 구현
  - `web/pokemon-detail.html` 신규 — `?slug=charizard` 쿼리로 접근. 공통 헤더/푸터 + 한/영 토글 + `#detail-root` 동적 렌더
  - `web/assets/pokemon-detail.js` 신규 — ES module
    - `loadPokemon()` + `loadAbilities()` 병렬 로드, slug로 해당 포켓몬 검색
    - 히어로 영역: 스프라이트(160px) + 도감번호 + 한글명/영문명 + 타입 뱃지 + 입수 경로 뱃지
    - 종족값 바 차트: 6개 스탯 수평 바(max 255 기준 퍼센트), 색상 4단계(excellent/good/average/low), 합계 행
    - 특성 목록: 각 특성을 카드로 표시(이름 + gameText), 클릭 시 `abilities.html?q=` 연동
    - 폼 섹션(2개 이상일 때만 표시): 그리드 카드로 폼별 이름/타입/특성/미니 종족값 표시
    - i18n 대응: `detail.*`, `stat.*` 키 추가 (ko: HP/공격/방어/특공/특방/스피드, en: HP/Atk/Def/Sp.Atk/Sp.Def/Speed)
  - `web/assets/pokemon-list.js` 변경: 포켓몬 카드를 `<article>` → `<a href="pokemon-detail.html?slug=">` 로 전환, 클릭 시 상세 페이지 이동
  - `web/assets/style.css` 확장:
    - `.poke-detail` 레이아웃, `.poke-detail__hero`(flex, 모바일에서 column 전환), `.poke-detail__sprite`(160px, pixelated)
    - `.stat-chart` 바 차트(grid 3컬럼: 라벨 56px + 바 + 수치), 4색 등급 클래스
    - `.ability-list`(세로 카드, hover 시 accent 테두리)
    - `.form-grid`(auto-fill 280px), `.form-card`(타입/특성/미니스탯), `.mini-stats`(3열 그리드)
    - `.poke-card` 클릭 가능 스타일(cursor pointer, hover 시 text-decoration 제거)
    - 520px 이하 모바일: 히어로 세로+가운데정렬, 폼그리드 1열, 미니스탯 2열
  - 검증: pokemon-detail.html / pokemon-detail.js / i18n.js 모두 200 OK

---

## 2026-04-17

### T15 — 폼 한글명 표시

- `docs/TODO.md` T15 완료 처리. 폼별 한글명을 `pokemon.json`에 주입하고 UI가 현재 언어에 맞게 렌더하도록 정비
  - PokeAPI 폼 한글 데이터가 불완전(히스이/갈라르/팔데아/Hero/Female 다수 누락, 메가는 붙여쓰기 `메가리자몽X`)한 것을 TODO 단계에서 확인 → 네트워크 의존 없이 **순수 패턴 합성** 채택
  - `scripts/form_ko.py` 신규 — `form_name_to_ko(form_name_en, base_name_ko, base_name_en)`
    - 접두사: `Mega/Alolan/Galarian/Hisuian/Paldean ` → `메가/알로라/가라르/히스이/팔데아 ` (base nameKo 앞에 공백 결합)
    - 메가 X/Y 특수: `Mega Charizard X/Y` → `메가 리자몽 X/Y` (trailing 단일 대문자 태그 보존)
    - 접미/특수폼: `Blade Forme`/`Midnight Form`/`Dusk Form`/`Hero Form`/`Female`/`Small·Large·Jumbo Variety`/`Alternate Forms` → `블레이드폼/한밤중의 모습/황혼의 모습/영웅의 모습/(암컷)/(S·L·특대 사이즈)/다른 폼`
    - base form(`form.name == nameEn`) → base `nameKo` 그대로, 미매칭은 영문 그대로(가시적 시그널)
  - `scripts/build.py` — `form_ko` import, `build_pokemon`에서 `forms[]`에 `nameKo` 필드 추가. 재실행 결과: 186 pokemon / 267 forms, 모든 variant 81건 nameKo 정상 생성, 미매칭 fallback 0건
  - `web/assets/app.js` — 공용 헬퍼 `formDisplayName(form)` (현재 언어 기준 `nameKo`/`name` 선택), `findForm(pokemon, formNameEn)` 추가 및 export
  - `web/assets/pokemon-list.js` — 카드 배지의 `title`(다폼 리스트)을 `formDisplayName()` 사용으로 교체
  - `web/assets/pokemon-detail.js` — 폼 섹션 카드 제목 `form.name` → `formDisplayName(form)`
  - `web/assets/abilities-list.js` — holder 칩의 variant form title 렌더 시 slug의 pokemon에서 form을 매칭해 `formDisplayName()`으로 표시. 매칭 실패 시 영문 form name 폴백
  - 검증: `python -m http.server 8765`에서 pokemon/pokemon-detail/abilities + 스크립트/데이터 전부 200 OK, `charizard` 폼 JSON에 `메가 리자몽 X`·`메가 리자몽 Y` 포함 확인

### T4 — 어빌리티 한글명 수집

- 어빌리티 한국어 이름을 PokeAPI에서 수집해 `abilities.json`의 `nameKo` 필드로 주입하고 UI에 반영
  - `scripts/fetch_ability_names_ko.py` 풀 실행(138초, 192 × 0.2s PokeAPI rate limit + 대역폭)
    - serebii slug → PokeAPI slug 변환: `nameEn.lower().replace(" ", "-")` 로 191건 자동 매칭, 예외 1건(`compoundeyes` → `compound-eyes`)만 스크립트 내 `SLUG_OVERRIDES`
    - 결과 `data/processed/ability_names_ko.json`: 178/192 수집(92.7%). 나머지 14건은 PokeAPI가 아직 한국어 번역을 반영하지 않은 Gen 9/Champions 신규 특성(`armortail`, `cudchew`, `dragonize`, `eartheater`, `electromorphosis`, `megasol`, `opportunist`, `piercingdrill`, `purifyingsalt`, `sharpness`, `spicyspray`, `supremeoverlord`, `toxicdebris`, `zerotohero`)
  - `data/manual/ability_names_ko.json` 수동 override 파일 stub 생성. 14건 키에 빈 값만 넣어둬 차후 공식 번역명 확보 시 그대로 채우면 build에 자동 반영
  - `scripts/build.py`:
    - 자동 수집 결과 + 수동 override 병합 함수 `_load_ability_names_ko()` 추가 (`_` 로 시작하는 키 무시로 `_comment` 필드 보호)
    - `build_abilities`가 각 어빌리티에 `nameKo` 필드 주입 (PokeAPI 없으면 빈 문자열 → UI에서 영문 폴백)
  - `web/assets/app.js`: 공용 `abilityDisplayName(ability)` 헬퍼 추가 — 현재 언어 기준 `nameKo`/`nameEn` 선택 (ko가 비어 있으면 en 폴백)
  - `web/assets/abilities-list.js`:
    - 카드 제목을 primary(현재 언어) + sub(반대 언어) 2줄 구조로 개편, sub가 비거나 중복이면 생략
    - 검색 `matches()`에 `nameKo` 부분 일치 추가
    - 정렬: ko 모드에서는 `Intl.Collator("ko")`로 한글 가나다순, 빈 nameKo는 nameEn으로 폴백
  - `web/assets/pokemon-detail.js`: 특성 리스트 아이템 + 폼 카드 어빌리티 태그 라벨/링크를 `abilityDisplayName()` 으로 통일
  - `web/assets/style.css`: `.ability-card__names`(세로 flex), `.ability-card__name-sub`(서브 텍스트 톤) 추가
  - 검증: 재빌드 후 서빙 200 OK, `blaze → 맹화`, `battlebond → 유대변화`, `toughclaws → 단단한발톱` 확인. 미매칭 `sharpness`, `zerotohero` 는 nameKo 빈 문자열로 UI에서 영문만 노출됨을 확인

### T5a/T5/T6 — 포켓몬 HOME 연동 게임 소스 수집

- 각 폼에 `sourceGames: [...]` 필드를 주입. 파티 추천 AI가 "이 파티를 만들려면 어느 게임에서 HOME으로 전송해야 하는가" 를 알려줄 수 있게 하는 데이터 기반
- **전략 전환 (중요)**: TODO의 초안은 `pokemon/{slug}.game_indices` 를 정본으로 쓰려 했으나, dry-run 6개에서 charizard의 game_indices가 Gen 1~5(red/blue/gold/...)까지만 나오고 Sword/Shield/Scarlet/Violet 등 Gen 6+ 가 전부 누락된 것을 발견. PokeAPI의 `game_indices` 는 국가 도감 인덱스 전용이며 Gen 6+ 엔트리가 일반적으로 빠져 있는 알려진 한계 → 사용 불가 판정
  - 대안으로 `pokemon-species/{slug}.pokedex_numbers` 의 지역 도감 엔트리를 역매핑 (예: `galar` → Sword/Shield, `hisui` → Legends Arceus, `paldea/kitakami/blueberry` → SV). BDSP는 `original-sinnoh`/`extended-sinnoh` 로 매핑
  - 사용자 확인 후 전략 교체 진행
- `scripts/pokeapi_form_map.py` 신규 (초안 전략용)
  - serebii 폼 이름 → PokeAPI 포켓몬 variant slug 변환
  - 자동 규칙: `Mega X/Y` → `{base}-mega-x/-y`, 지역 prefix → `{base}-alola/-galar/-hisui/-paldea`, 특수폼 매핑(Blade/Midnight/Dusk/Hero/Female/Small/Large/Jumbo → super)
  - `_OVERRIDES`: Paldean Tauros는 combat-breed 대표 / Rotom Alternate Forms는 heat 대표 (HOME 게임 풀이 같아 대표 1건으로 충분)
  - `_BASE_FORM_ALIASES`: 베이스 slug 자체가 PokeAPI에서 variant 으로만 존재하는 10건(aegislash-shield, lycanroc-midday, mimikyu-disguised 등)을 치환
  - 267 폼 전부 HEAD 요청 실존 확인 (0 실패)
  - **T5 전략 전환으로 실제 호출에는 미사용**. T10(기술 수집) 등 form별 `pokemon/{slug}` 엔트리가 필요한 후속 작업에서 재사용 가능하므로 유지
- `scripts/fetch_pokeapi_game_sources.py` 신규 (species 전략)
  - `pokemon-species/{slug}/` 186회 호출 (slug의 `.` 은 `-` 로 치환 — mr.rime → mr-rime)
  - `POKEDEX_TO_GAMES`: 9개 지역 도감 이름을 HOME 직접 연동 게임 slug 리스트로 매핑
  - `REGIONAL_FORM_GAMES`: 지역 변종 폼 prefix → 해당 지역 게임 고정 매핑 (Alolan=[] T12 Bank 분리, Galarian=SwSh, Hisuian=LA, Paldean=SV)
  - Mega 및 특수폼은 species 결과 그대로 (Champions 내 진화 기능이거나 같은 게임에서 등장)
  - 결과 `data/processed/pokemon_game_sources.json`: `{base_slug: {form_name_en: [games]}}` 구조, 186/186 species 성공(140초, 0 실패)
  - 빈 배열 8건 모두 의도된 결과 — Alolan 2건(규칙), Simipour/Simisage/Simisear/Watchog/Castform/Furfrou 6건(HOME 연동 게임에 실제로 미등장)
- `scripts/build.py`
  - `_load_game_sources()` 추가 — processed + manual override 병합. 오버라이드는 폼 단위로 값 자체를 대체. `_` 접두 키 무시
  - `build_pokemon` 이 각 form 에 `sourceGames` 필드를 주입
- `data/manual/game_sources_override.json` stub 생성 — Legends Z-A 같은 PokeAPI 미반영 신작 수동 대응용. 현재는 `_comment` 만 있음
- 검증: 재빌드 후 267/267 폼에 sourceGames 필드 존재, 누락 0. spot-check — Charizard [LGPE/SwSh/SV], Raichu base [BDSP/LA/LGPE/SwSh/SV], Alolan Raichu [], Hisuian Typhlosion [LA only], Greninja [SV only], Paldean Tauros [SV only]

### T7 — 타입 상성 매트릭스

- `scripts/build_type_chart.py` 신규 — 네트워크 호출 없이 리터럴 매핑만으로 `web/data/type_chart.json` 생성
  - 18개 타입 canonical order 리스트 + 18×18 matrix (attacker × defender → 0/0.5/1/2)
  - 규칙 정의는 attacker 기준 (defender set, multiplier) 3-튜플 목록. 누락 쌍은 기본 1
  - Gen 6+ Fairy 포함, Steel 상성 패치 반영
  - 324셀 분포 검증: 0=8, 0.5=61, 1=204, 2=51 (공식 총계와 일치)
  - spot-check 18개 쌍(normal↔ghost 무효, dragon↔fairy, electric→ground 무효, water↔grass 등) 전부 통과

### T1 — 스키마 문서 `docs/schema.md`

- `docs/schema.md` 신규 — LLM 프롬프트에 그대로 붙여넣을 수 있는 단일 문서
  - 공통 타입 18종 + ObtainSource 4종 + HOME 직접 연동 게임 9종 테이블
  - `pokemon.json` 전체 필드(forms, sourceGames 포함) + Charizard 샘플
  - `items.json` 필드(held/mega-stone/berry 카테고리) + Black Belt 샘플
  - `abilities.json` 필드(Holder 구조) + Adaptability 샘플
  - `type_chart.json` 매트릭스 구조 + 이중 타입 데미지 계산식(곱셈)
  - `manifest.json`(T2 예정) 섹션 placeholder
  - 캐시/빌드 구조 도식: data/raw, data/processed, data/manual, web/data 레이아웃

### T3 — 문자열 정규화

- `scripts/normalize.py` 신규 — `normalize_text(str) -> str`
  1. NFC 정규화 2. `html.unescape` 3. zero-width / BOM / soft-hyphen 제거 4. NBSP → space 5. `\s+` → 단일 공백 6. strip
- `scripts/build.py` — `build_pokemon`(nameEn/nameKo, forms[].name/nameKo), `build_items`(nameEn/effect/location), `build_abilities`(nameEn/nameKo/description/gameText) 에 `N()` 일괄 적용
- 재빌드 후 원본 parser 결과와 정규화 결과 비교:
  - pokemon: 변화 0 (원본 이미 깨끗)
  - items: 변화 0
  - abilities: **변화 12건** — 전부 serebii HTML 의 이중 공백이 단일 공백으로 축소 (berserk, curiousmedicine, friendguard, galewings, lightningrod 등의 description/gameText)
- 부작용 없음. 의도된 정리만 발생

### T2 — manifest.json

- `scripts/build.py` 에 `write_manifest()` 추가 — build 의 마지막 step 으로 실행
  - `generatedAt` UTC ISO8601, `schemaVersion` 상수 `1.0.0`, `sources` (serebii/PokeAPI/sprites URL), `files[]` (name/path/count/sha256)
  - 파일 목록: pokemon/items/abilities + type_chart.json(존재 시)
  - corpus.json 은 manifest 의 파일 bundle 이므로 manifest 자기 참조 방지 위해 제외
- `web/data/manifest.json` 출력 확인

### T8 — 아이템 한글명

- `scripts/fetch_item_names_ko.py` 신규 — PokeAPI `item/{slug}/` 호출 (slug 그대로 호환)
  - 117 호출 / ~55초 (404 재시도 대기 포함). 수집 **93/117 (79.5%)**
  - 실패 24건 전부 Gen 9/Champions 신규: `fairy-feather` 1 (PokeAPI에 한국어 name 미반영) + Champions 신규 메가스톤 23 (404 — PokeAPI 자체에 엔트리 없음)
- `data/manual/item_names_ko.json` stub 24키 생성. 공식 번역명 확보 시 채우면 build 에 자동 반영
- `scripts/build.py` — `_load_string_map()` 공용 헬퍼로 ability/item 로딩 통합, `_load_item_names_ko()` 추가, `build_items` 가 각 아이템에 `nameKo` 필드 주입 (빈 문자열 = 영문 폴백)
- `web/assets/app.js` — 공용 `itemDisplayName()` 헬퍼 (ko → en 폴백)
- `web/assets/items-list.js` — 카드 primary(현재 언어) + sub(반대 언어) 2줄 구조, 검색 `matches()` 에 nameKo 포함. CSS `.item-card__names` / `.item-card__name-sub` 추가
- 검증: `black-belt → 검은띠`, `leftovers → 먹다남은음식`, `charizardite-x → 리자몽나이트X`, `sitrus-berry → 자뭉열매` 확인

### T11 — 어빌리티 한국어 설명

- `scripts/fetch_ability_descriptions_ko.py` 신규 — T4 에서 이미 채운 `ability/{slug}/` PokeAPI 캐시 재활용 (네트워크 호출 없음, ~3초)
  - `flavor_text_entries[lang=ko]` 중 최신 항목 → `gameTextKo` (게임 내 짧은 문구)
  - `effect_entries[lang=ko]` → `descriptionKo` (상세 효과, 존재 시)
  - 결과: **gameTextKo 176/192 (91.7%)**, descriptionKo 0 (PokeAPI 가 한국어 effect 텍스트를 제공하지 않음)
  - 미매칭 16건은 T4b 와 유사하게 Gen 9/Champions 신규 및 일부 번역 누락
- `scripts/build.py` — `_load_ability_descriptions_ko()` 추가, `build_abilities` 가 각 ability 에 `descriptionKo`/`gameTextKo` 필드 주입
- `web/assets/app.js` — `abilityGameText()`, `abilityDescription()` 공용 헬퍼 추가 (ko → en 폴백)
- `web/assets/abilities-list.js` — 카드 gameText 와 description 을 헬퍼로 렌더, 검색 `matches()` 에 gameTextKo 포함
- `web/assets/pokemon-detail.js` — 특성 리스트 아이템 설명을 `abilityGameText()` 로 통일
- 검증: ko 모드에서 `blaze → "HP가 줄었을 때 불꽃타입 기술의 위력이 올라간다."`, `adaptability → "자신과 같은 타입의 기술 위력이 올라간다."` 확인

### T9 — 통합 코퍼스 `corpus.json`

- `scripts/build_corpus.py` 신규 — `web/data/{manifest,pokemon,items,abilities,type_chart}.json` 을 단일 JSON 오브젝트로 번들
- 출력 `web/data/corpus.json` (442 KB, keys=manifest/pokemon/items/abilities/type_chart). LLM 컨텍스트 주입용 단일 파일
- 실행 순서: `build.py → build_type_chart.py → build_corpus.py`

### 검증 — 서빙 스모크테스트

- 로컬 서버 실행해 주요 엔드포인트 200 OK 확인: items.html, abilities.html, pokemon-detail.html, 모든 assets/*.js, data/*.json (pokemon/items/abilities/type_chart/manifest)

### Phase 3 — 파티 빌더

- `web/party.html` 신규 — 헤더/푸터/i18n 토글 공통 + 6슬롯 그리드 컨테이너 + 파티 액션(URL 복사/로컬 저장/저장 파티 드롭다운/초기화) + `<dialog>` 포켓몬 선택 모달
- `web/assets/party.js` 신규 — 단일 모듈로 파티 빌더 전부 구현
  - 상태: `party: (Slot|null)[6]` + 모달 state(target slot, query, type filter set)
  - 선택 모달: `<dialog showModal>` 기반. 한·영 검색 + 다중 타입 필터 칩(부분집합 매칭, 모든 폼 타입 합산). 선택 시 base form 기본값으로 슬롯 주입
  - 슬롯 카드: 스프라이트 + dex/이름 + 타입 배지 + 폼 select(다폼일 때만) + 특성 select + 도구 select(held/mega-stone/berry optgroup) + 종족값 합계. 폼 변경 시 현재 특성이 새 폼에 없으면 자동으로 새 폼 첫 번째 특성으로 전환
  - 분석 패널 5개 섹션:
    - 종족값 합계 — 6개 스탯 합 + 평균 + 파티 전체 합
    - 타입 분포 — 각 타입 등장 횟수 + 중복 타입 조합 경고 (같은 `t1/t2` 2마리 이상)
    - 공격 커버리지 — 파티원 own-type(STAB) 기준 각 방어 타입에 낼 수 있는 최대 배수. 2배 이상 낼 수 없는 타입 목록 경고 (Alt 더블 타입은 t1·t2 배수 곱)
    - 방어 프로필 — 각 공격 타입에 대해 파티 중 2배 이상 받는 멤버 수 집계. 3마리 이상이면 공유 약점 경고
    - HOME 연동 게임 — 각 폼의 `sourceGames` 교집합 계산. 교집합 비면 "단일 게임 불가" 경고, 파티원 중 sourceGames 빈 케이스 있으면 "직접 연동 불가" 경고
  - URL 인코딩: `?p=slug:formName:abilitySlug:itemSlug|…` 파이프 구분. `encodeURIComponent` 안전 인코딩. 로드 시 slug/form/ability 유효성 재검증
  - 로컬스토리지: `pc.savedParties.v1` 키로 `{name: encodedPartyString}`. prompt 로 이름 지정해 저장, 드롭다운으로 불러오기
  - 공유: `navigator.clipboard.writeText(location.href)`. 실패 시 prompt 폴백
- `web/assets/i18n.js` — `party.*`(30+ 키), `game.*`(9 게임), `empty`, 게임 한국어/영어 라벨 추가
- `web/assets/style.css` — `.party-grid`/`.slot-card`(64px 스프라이트 헤더 + types + controls + stats) / `.analysis-section`/`.analysis-stats-grid`(6열, 모바일 3열) / `.analysis-warn`(accent 좌측 바) / `.coverage-grid`(타입 컬러 셀 + 2x/1x/half/risk 불투명도) / `.picker-modal`(::backdrop + sticky head + 리스트 + `.picker-row` grid) / `.chip--game` / 640px 이하 모바일 1열 전환 추가
- `scripts/build_type_chart.py`에서 생성된 `web/data/type_chart.json`을 party.js 가 직접 fetch 해서 공격/방어 계산에 사용
- 검증: party.html + party.js + i18n.js + app.js + data/type_chart.json 모두 200 OK, `node --check`로 party.js/app.js/i18n.js syntax 통과

### T10 — 기술 수집

- `scripts/parser.py`: `PokemonDetail.moves: list[str]` 필드 + `_parse_move_slugs()` 추가
  - 초기 구현은 페이지 전체에서 `/attackdex-champions/` 링크를 긁었으나 Weakness/footer 의 타입 인덱스 링크(18개 타입 slug)가 오염되는 것을 발견 → 대상 테이블을 `title.startswith("Standard Moves")` 인 dextable 로 한정
  - Floette/Meowstic/Basculegion 처럼 variant 별로 "Standard Moves - Male/Female/Eternal" 로 쪼개지는 소수 케이스는 모든 매칭 테이블을 순회해 합산 (first-seen order dedupe)
  - 186/186 종이 moves 보유, 평균 60.4개, **unique 481개**
- `scripts/build.py` `build_pokemon()` — 각 pokemon 에 `moves: [slug...]` 주입 (form 단위 아님, 종 단위)
- `scripts/fetch_moves.py` 신규
  - 전략 결정: serebii slug (`aerialace`) ↔ PokeAPI slug (`aerial-ace`) 규칙이 불규칙해서 단순 heuristic 실패. PokeAPI `/move?limit=2000` 인덱스(937건)를 한 번 받아 `.replace('-','').replace("'",'').lower()` 정규화 키 매핑을 만들었더니 **481/481 완벽 매칭**
  - 각 기술 `/move/{slug}/` 호출 — `type`, `damage_class`(physical/special/status), `power/accuracy/pp`, `names[ko/en]`, `flavor_text_entries` 최신 한·영 추출
  - 481개, 377초. 한국어 이름 446/481 (92.7%), 한국어 설명 437/481 (90.9%)
  - 미매칭은 PokeAPI 가 아직 한국어 locale 을 반영하지 않은 신규 기술들
- `scripts/build_moves.py` 신규 — `data/processed/moves.json` 을 `web/data/moves.json` 으로 정규화·정렬 (slug 기준). 모든 자연어 필드에 `normalize_text()` 재적용
- `scripts/build.py` 의 `write_manifest()` 가 `moves.json` 도 포함하도록 확장 (sha256·count)
- `scripts/build_corpus.py` `FILES` 에 `moves` 추가 — 최종 corpus 924 KB (keys=manifest/pokemon/items/abilities/type_chart/moves)
- `web/assets/app.js` — `loadMoves()` 데이터 로더, `moveDisplayName()`/`moveCategoryLabel()` 헬퍼 추가
- `web/assets/pokemon-detail.js` — 상세 페이지에 기술 섹션 추가 (6컬럼 테이블: 이름/타입/분류/위력/명중/PP), 클라이언트 사이드 검색 (이름·타입 부분일치, 한·영 동시), 한국어 설명을 `<td title>` 에 노출. 모든 폼 공용이므로 섹션 1개
- `web/assets/i18n.js` — `detail.moves`, `detail.movesSearch`, `detail.move.{name,type,category,power,accuracy,pp}`, `move.cat.{physical,special,status}` ko/en 추가
- `web/assets/style.css` — `.moves-controls`, `.moves-search`, `.moves-table` (sticky header, hover, tabular-nums, 모바일에서 Accuracy 컬럼 숨김) 추가
- `docs/schema.md` — `moves.json` 섹션 신규 + Pokemon 타입에 `moves: string[]` 주석 + `manifest.json` 섹션 완성 + 캐시 구조에 moves/manifest/corpus 추가
- 검증: 모든 JS 파일 `node --check` 통과, `http://localhost:8768/` 주요 엔드포인트 200 OK, 서빙된 moves.json 481건 + nameKo 446 + flavorKo 437 확인. 샘플: `flamethrower → 화염방사 (fire/special, 90/100/15)`, `thunderbolt → 10만볼트`, `earthquake → 지진`

### AI 친화 — `web/llms.txt`

- 사이트 루트에 `web/llms.txt` 신규 — Anthropic 제안 `llms.txt` 표준에 맞춰 AI 에이전트가 사이트를 사용하도록 안내
  - 프로젝트 요약 + 사용 목적 예시
  - 데이터 엔드포인트 8개 (manifest/pokemon/items/abilities/moves/type_chart/corpus) + 각 파일 용도 + 한국어 커버리지
  - 페이지 목록 + 쿼리 파라미터 문법
  - 파티 URL 인코딩 스키마 (`?p=slot1|slot2|...` + `slug:formName:abilitySlug:itemSlug`) 및 디코딩 규칙
  - 슬러그 규약(포켓몬/어빌리티/아이템/기술/타입/입수/게임) 집약
  - 파티 분석 시 UI 가 자체 계산하는 항목(공격 커버리지/방어 프로필/HOME 게임 교집합) — AI 가 중복 계산하지 않도록 명시
  - 빌드 파이프라인 명령 순서 + 라이선스
- 사용자 의도: AI 호출 시스템(서버·엔드포인트) 은 만들지 않고, 이 사이트를 외부 AI 에이전트(Claude, ChatGPT 등) 가 붙여넣기/크롤링으로 활용할 수 있게 친화적으로 노출
- 검증: `curl http://localhost:8769/llms.txt` → 200, text/plain, 7008 bytes

### Phase 4 — `README.md`

- 프로젝트 루트에 `README.md` 신규 — 외부 공개/타인 재현 대비 완결 문서
  - 빠른 시작 (`cd web && python -m http.server 8000`), 의존성 없음
  - 기능 요약 (목록/상세/파티 빌더/분석 패널)
  - AI 에이전트 사용 가이드 (`/llms.txt` + `/data/corpus.json` 활용)
  - 디렉토리 구조 (web/ / scripts/ / data/{raw,processed,manual}/ / docs/)
  - 데이터 갱신 명령 (fetch 12단계 + build 4단계, 각 소요 시간 명시)
  - 수동 오버라이드 파일 3종 설명
  - 데이터 출처, 기술 스택, 의도적 미채용 목록(프레임워크·번들러·DB)
  - 라이선스/면책 + 로컬 전용 원칙 재명시

### T13 — serebii Champions 미수집 페이지 (newabilities, updatedattacks)

- `scripts/config.py` — `NEW_ABILITIES_URL`, `MEGA_ABILITIES_URL`, `UPDATED_ATTACKS_URL` 추가
- `scripts/parser.py`
  - `NewAbility` dataclass + `parse_new_abilities()` — `table.tab` 의 2셀 행(Name/Effect) 추출. `/abilitydex/{slug}.shtml` 링크에서 serebii 슬러그 확보
  - `UpdatedAttack` dataclass + `parse_updated_attacks()` — 9셀 헤더 행(Champions 값) + 5~6셀 비교 행(S/V 기준) 중 Champions 행만 추출. PP/Power/Accuracy/Effect/Effect Chance. 명중률 sentinel `101`(absolute hit)은 `None` 으로 정규화
- `scripts/fetch_new_abilities.py` 신규 — newabilities.shtml fetch + 파싱 → `data/processed/new_abilities.json`. 현재 4건: piercingdrill, dragonize, megasol, spicyspray
- `scripts/fetch_updated_attacks.py` 신규 — updatedattacks.shtml fetch + 파싱 → `data/processed/updated_attacks.json`. 42건 (Champions 수치 변경 기술 목록)
- `scripts/build.py` `build_abilities`
  - `NEW_ABILITIES_PATH` 로드 → 각 ability 에 `isNewInChampions: bool` 플래그 주입. 4건 적용 확인
- `scripts/build_moves.py`
  - `_load_updated_attacks()` overlay 로더 추가. PokeAPI(SV) 기준 moves 에 Champions 값(PP/위력/명중)을 덮어씀. Champions 값이 None 인 필드는 변경하지 않음(부분 덮어쓰기)
  - `updatedInChampions: bool` 플래그 + `championsEffectEn` 필드 (존재 시) 추가
  - 적용 결과: 42 중 16건 (우리 Standard Moves 풀 481 에 포함된 것만). 예: crabhammer PP 10→12·acc 90→95, ironhead PP 15→16, bonerush power 25→30·PP 10→12, moonblast PP 15→16
  - 나머지 26건은 우리 포켓몬이 배우지 않아 moves.json 에 존재하지 않음 → skip
- `megaabilities.shtml` 은 현재 serebii 쪽 페이지가 플라이어 텍스트만 있는 빈 상태로 확인돼 수집 보류 (TODO 로 남김)
- `docs/schema.md` — Ability/Move 타입에 새 필드(`descriptionKo`, `gameTextKo`, `isNewInChampions`, `updatedInChampions`, `championsEffectEn`) 명시
- `web/llms.txt` — abilities/moves 커버리지에 새 플래그·건수 명시, 빌드 파이프라인에 두 fetch 단계 추가
- `README.md` — 갱신 명령에 `fetch_new_abilities`, `fetch_updated_attacks` 추가
- 재빌드 산출: abilities 192 (4 new), moves 481 (16 overlay), corpus 949 KB

### 파티 빌더 UX 개선 — 폼별 선택 + 폼별 스프라이트

- 사용자 요청: picker 모달에서 (1) 이미 파티에 있는 포켓몬은 선택 불가 처리, (2) 메가/지역폼을 동일 species 기준이 아니라 **폼 단위로 독립 엔트리** 로 보여주기, (3) 폼마다 고유 이미지 사용
- `scripts/fetch_form_sprites.py` 신규
  - `pokeapi_form_map.form_to_pokeapi_slug` 재활용해 267 폼 중 variant 81 개의 PokeAPI slug 획득
  - `/api/v2/pokemon/{slug}` 응답의 `sprites.front_default` URL 에서 PNG 를 받아 `web/assets/sprites/forms/{pokeapi_slug}.png` 로 저장
  - 결과: 60/81 성공. 나머지 21건은 PokeAPI 가 해당 variant 의 sprite URL 을 제공하지 않음(Champions 신규 메가 대부분 — scovillain-mega, glimmora-mega 등). 이들은 base form 이미지로 폴백
- `scripts/build.py`
  - `FORM_SPRITES_REL = "assets/sprites/forms"` 상수 + `from pokeapi_form_map import form_to_pokeapi_slug` import
  - 각 form payload 에 `spritePath` 주입: base 는 `{dex}.png`, variant 는 PokeAPI slug 파일이 존재하면 그걸, 없으면 base 폴백
  - 결과: 267 폼 전부 spritePath 채움 (base 186 / variant own 60 / variant fallback 21)
- `web/assets/party.js`
  - `renderPickerList()` 를 species 단위(186) → **폼 단위(267)** 로 재구성
    - 각 row 는 `{pokemon, form}` 쌍. 폼 단독 이름/이미지/타입 뱃지 표시
    - 검색은 form.nameKo / form.name / pokemon.slug 매칭, 타입 필터는 해당 폼의 types 만으로 부분집합 매칭 (이전에는 모든 폼 합산이었음)
    - 이미 파티 내 `(slug, formName)` 조합이 있으면 `picker-row--taken` 클래스 + `disabled` + "이미 파티에 있음" 뱃지 표시. 클릭 이벤트 바인딩 X
  - `pickPokemon(p)` → `pickForm(p, form)` 로 교체: 선택된 **폼** 으로 슬롯 주입 (기존에는 항상 `forms[0]` 로 들어가 메가/지역폼 직접 선택 불가)
  - 슬롯 카드 스프라이트를 `form.spritePath || pokemon.spritePath || ""` 로 변경 — 폼 셀렉터 변경 시 이미지도 따라 바뀜
- `web/assets/i18n.js` — `party.alreadyInParty` ko/en 추가
- `web/assets/style.css` — `.picker-row--taken` (opacity + not-allowed), `.picker-row__taken` pill 뱃지
- `docs/schema.md` — `Form.spritePath` 필드 명세 추가
- `web/llms.txt`, `README.md` — pokemon.json forms 필드 설명 + 빌드 파이프라인에 `fetch_form_sprites.py` 추가
- 검증: form sprite 엔드포인트 200 (charizard-mega-x, raichu-alola, zoroark-hisui, tauros-paldea-combat-breed 등), party.js `node --check` 통과

### 세션 중단 복구 메모 (2026-04-17 19:12~22:11)

- T10 작업 중 `node --check` Bash 호출이 "Tool result missing due to internal error" 로 실패하면서 어시스턴트 응답 루프가 멈춰 약 3시간 대기 상태 발생
- 작업 상태는 디스크에 전부 저장돼 있어 데이터 손실 없음 (moves.json, pokemon-detail.js 등 모두 intact)
- 사용자 확인 후 남은 작업(스모크테스트 재실행, 스키마/history 갱신, 백그라운드 서버 정리) 재개해 완료

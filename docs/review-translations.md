# 한국어 번역 반영 이력 · 출처

> 2026-04-20 재검증 라운드 결과. `data/manual/*.json` 과 PokeAPI 자동 수집을 합쳐 **모든 한국어 필드 100% 커버리지** 도달. 이 문서는 어떤 값을 어디서 가져왔는지, 이후 검증·교체가 필요할 때 어디를 참조하면 되는지 남긴다.

## 최종 커버리지

| 영역 | 상태 | 파이프라인 |
|---|---|---|
| 어빌리티 `nameKo` | **192/192** ✅ | PokeAPI 178 + manual 14 (Bulbapedia) |
| 어빌리티 `gameTextKo` | **192/192** ✅ | PokeAPI 176 + manual 16 (Fandom KR + 사용자 보정) |
| 어빌리티 `descriptionKo` | 렌더 시 비노출 | KO 모드에서 카드가 `<p>` 자체를 생략 (T17-A) |
| 기술 `nameKo` | **481/481** ✅ | PokeAPI 446 + manual 35 (Bulbapedia + 사용자 보정) |
| 기술 `flavorTextKo` | **481/481** ✅ | PokeAPI 437 + manual 44 (Fandom KR + 사용자 보정) |
| 도구 `nameKo` | **117/117** ✅ | PokeAPI 93 + manual 24 (Bulbapedia) |
| 도구 `effectKo` | **117/117** ✅ | manual 117 (Fandom KR) |
| 포켓몬 `nameKo` / 폼 `nameKo` | 전량 커버 | PokeAPI + `scripts/form_ko.py` 합성 (T15) |

## 출처 요약

### 1차 공식

| 소스 | 역할 |
|---|---|
| **PokeAPI** | 이름·flavor text·gameText 자동 수집(이 프로젝트의 `scripts/fetch_*.py` 계열) |
| **Scarlet/Violet 인게임 한국어 UI** | 최종 권위. 의심나면 여기로. |
| **Pokémon HOME 한국어 UI** | 포켓몬·도구 이름 대조용 |
| **포켓몬 코리아 공식** (https://pokemonkorea.co.kr) | 도감 · 공식 발표자료 |

### 2차 팬 위키 (이번 배치에서 실제로 사용)

| 소스 | 용도 | 메모 |
|---|---|---|
| **Bulbapedia** (영문) | 각 페이지 "In other languages" 섹션에서 공식 한국어명만 추출 | WebFetch 접근 가능. 이름에 강함, 설명은 한국어가 거의 없음 |
| **Fandom 한국어 wiki** (https://pokemon.fandom.com/ko) | `api.php?action=parse&page=<한국어 제목>` 엔드포인트로 이름·게임 설명 추출 | 브라우저 직접 접근은 403이지만 **MediaWiki parse API 는 접근 가능**. 내용에 오타 다수라 명백한 것만 보정 |

### 접근 못 한 소스

- 나무위키 (namu.wiki) — WebFetch 403 차단. 필요 시 사용자가 직접 확인
- Pokemon Korea 공식 pokedex 의 개별 포켓몬 상세 — 클라이언트 JS 렌더라 WebFetch 로 내용 안 보임
- web.archive.org — Claude Code 에서 전면 차단
- Serebii.net — Korean 명 미등재

## 이번 배치에서 확인된 교훈

1. **추정 번역은 오차율이 크다** — T19 기술 이름 35건 재검증에서 내 초기 추정의 **74% 가 공식 Bulbapedia 명칭과 달랐다**(예: `axekick` 액스킥→**발꿈치찍기**, `gigatonhammer` 대왕해머→**거대해머**, `matchagotcha` 말차샷→**휘적휘적포**, `saltcure` 소금뿌리기→**소금절이**, `stoneaxe` 바위도끼→**암석액스**, `wavecrash` 파도격돌→**웨이브태클**).
2. **Champions 고유 항목도 이미 공식 한국어명 존재** — 처음엔 "한국어판 발매 전이니 빈값 유지" 로 판단했으나 Bulbapedia 에 전부 등재돼 있었다. 사례: `dragonize`→드래곤스킨, `megasol`→메가솔라, `piercingdrill`→관통드릴, `spicyspray`→하바네로분출, 챔피언스 신규 메가스톤 23종 전부.
3. **Fandom 텍스트에도 오타가 있다** — 여러 본문에서 `편승하서/꿰뚫하는/쌍청/발쿠치/압정끼리기/불쌍한/끝죽게/붕어서/펀/열중인/쌓기스/석약/올르고` 등을 발견. 명백한 것만 한 글자 수준으로 보정했고 원문 그대로 둔 것은 `_comment` 에 기록.
4. **WebFetch 가 일부 Hangul 글자를 잘못 전달하는 경우** — `찬물끼얹기`→`찬물끼웁기`, `개척하기`→`개쓰하기`, `풀숲`→`풀쓸`, `경쾌한`→`경미한` 등. 사용자 교정으로 감지. 앞으로도 기계 fetch 결과는 한 번 더 검증.
5. **`sharpness`·`zerotohero` 처럼 Fandom 에도 설명 없는 케이스** 가 있다. 이번엔 사용자 제공 + 영문 스펙 기반 간이 작문으로 채움. 완전한 공식 확인은 향후 과제.

## 현재 남아 있는 유의점

- **zerotohero gameText** — Fandom 원문이 깨져 영문 스펙 + 우리 데이터의 "영웅의 모습" 표기를 합쳐 작문함. 공식 SV 한국어와 어순이 다를 수 있음.
- **T18 의 다수 · T20 전량 · T16 berry 다수** — Fandom 커뮤니티 번역을 기반으로 함. 공식 SV 텍스트와 1:1 일치는 아님. 내용상 오류는 없도록 주의했으나 게임에서 원문 확인 시 교체 대상.
- **charizardite-x/y effectKo** — 둘 다 `리자몽` 기준 동일 문구. 실제 공식은 `메가리자몽X`/`메가리자몽Y` 로 형태 구분할 가능성 있으나 Fandom 기본 문구에 맞춰 단일화.

## 수정이 필요할 때

1. SV/HOME 한국어판 또는 공식 출처에서 원문 확인
2. 해당 `data/manual/<파일>.json` 값 교체
3. 빌드:
   ```bash
   python scripts/build.py            # pokemon/items/abilities + manifest
   python scripts/build_moves.py      # moves
   python scripts/build_corpus.py     # corpus 묶음
   ```
4. 코드 수정은 필요 없음 — UI 는 자동으로 한국어 모드에서 새 값 사용

## 되짚어볼 핵심 규칙

- **자동 수집값이 있으면 manual 이 덮지 않도록** — `scripts/build_moves.py` 의 `fetched name_ko 가 비어 있을 때만 manual` 패턴을 따름. PokeAPI 가 추후 한국어를 반영하면 자동 흡수됨. `scripts/fetch_ability_names_ko.py --force` / `fetch_moves.py --force` 로 주기 재수집.
- **추정으로 채우지 않기** — 이번 T19 74% 오차 사례가 증명. 확정 출처 없으면 빈값 유지.
- **Champions 전용 기술·특성·도구는 `isNewInChampions` / `updatedInChampions` 플래그 유지** — AI 가 본편 지식으로 빗나가지 않도록 `web/llms.txt` 도 같은 플래그를 안내.

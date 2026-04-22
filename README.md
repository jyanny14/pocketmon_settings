# Pokémon Champions Party Builder

한국어 기반 **Pokémon Champions** 데이터 브라우저 + 파티 빌더. 포켓몬·도구·특성·기술·타입 상성을 한 곳에서 검색하고, 최대 6마리 파티를 구성해 URL 로 공유할 수 있다.

- **정적 웹앱** — 백엔드·DB 없음. GitHub Pages 로 공개 배포되며 `python -m http.server` 로도 그대로 돎
- **의존성 없는 프론트엔드** — vanilla HTML/CSS/ES module
- **한국어 우선 UI + 한·영 양쪽 검색** — 한/영 토글 가능 (localStorage 영속)
- **AI 친화 구조** — `/llms.txt` + `/data/corpus.json` 로 Claude/ChatGPT 등 AI 에이전트가 바로 활용 가능

> **비영리 팬 프로젝트**입니다. Pokémon 관련 권리는 모두 Nintendo · Creatures Inc. · GAME FREAK inc. 에 있습니다. 광고·재유통·상업적 이용은 하지 않습니다.

## 빠른 시작

### 공개 배포 (GitHub Pages)

레포 Settings → Pages → Source 를 **GitHub Actions** 로 설정한다.
`.github/workflows/pages.yml` 이 `main` 에 푸시될 때마다 `web/` 디렉토리를
Pages artifact 로 올려 `https://<username>.github.io/pocketmon_settings/` 에 배포한다.
(Pages 의 "Deploy from a branch" 는 폴더를 `/` 또는 `/docs` 로만 허용하므로
`web/` 을 그대로 쓰려면 Actions 경로가 필요하다.)
검색 엔진 인덱싱은 `web/robots.txt` 로 전면 차단.

### 로컬 실행

```bash
# 1) 저장소 루트에서 웹 디렉토리만 서빙
cd web
python -m http.server 8000

# 2) 브라우저에서 열기
#    http://localhost:8000/
```

필수 의존성 없음. Python 3 만 있으면 됨.

데이터 갱신이 필요한 경우 추가로:
```bash
pip install -r scripts/requirements.txt   # requests, beautifulsoup4, lxml
```

## 기능

- **포켓몬 목록** (`/pokemon.html`) — 한·영 검색, 타입 다중 필터, 입수 경로 필터, 도감 번호·종족값·한글명·영문명 정렬, 폼(메가/지역폼) 타입 합산 매칭
- **포켓몬 상세** (`/pokemon-detail.html?slug=...`) — 종족값 바차트, 특성 카드, 폼별 비교, 기술 테이블(검색 가능, 타입·분류·위력·명중·PP)
- **도구 목록** (`/items.html`) — 지닌 도구 / 메가스톤 / 나무열매 117 종
- **특성 목록** (`/abilities.html`) — 한·영 이름, 한국어 게임 설명, 보유 포켓몬 역인덱스
- **파티 빌더** (`/party.html`) — 최대 6슬롯
  - 포켓몬 선택(검색·타입 필터 모달) → 폼/특성/도구 드롭다운 변경
  - 분석 패널: 종족값 합계 · 타입 분포 · STAB 공격 커버리지 · 방어 프로필(약점 공유) · HOME 연동 게임 교집합
  - URL `?p=...` 쿼리로 파티 인코딩 → 링크 복사/공유
  - localStorage 에 이름 지정해 여러 파티 저장/불러오기

## AI 에이전트에게 이 사이트를 소개하려면

`/llms.txt` 하나만 주면 된다. [Anthropic 제안 `llms.txt` 표준](https://llmstxt.org/) 에 맞춰 사이트 구조·데이터·URL 인코딩·스키마·빌드 파이프라인을 markdown 으로 요약해 두었다.

예: Claude/ChatGPT 에서
> `http://localhost:8000/llms.txt` 를 읽고, 현재 파티 `http://localhost:8000/party.html?p=...` 의 약점을 분석해줘

추가로 `/data/corpus.json` (~924 KB) 은 pokemon/items/abilities/moves/type_chart/manifest 를 단일 파일로 묶은 bundle. LLM 컨텍스트에 한 번에 주입할 용도.

## 디렉토리 구조

```
pocketmon_settings/
├── web/                     # 정적 웹앱 — 이 디렉토리만 서빙하면 됨
│   ├── index.html
│   ├── pokemon.html          pokemon-detail.html
│   ├── items.html            abilities.html
│   ├── party.html
│   ├── llms.txt              # AI 에이전트 가이드
│   ├── assets/
│   │   ├── app.js i18n.js    # 공용 모듈
│   │   ├── pokemon-list.js pokemon-detail.js items-list.js
│   │   ├── abilities-list.js party.js
│   │   ├── style.css
│   │   ├── sprites/*.png     # 포켓몬 스프라이트 (PokeAPI 사본)
│   │   └── items/*.png       # 도구 아이콘 (serebii 사본)
│   └── data/
│       ├── manifest.json     # 생성 시각·sha256·파일 목록
│       ├── pokemon.json      # 186 마리 (폼·종족값·기술·sourceGames 포함)
│       ├── items.json        # 117 (지닌 도구 30 / 메가스톤 59 / 나무열매 28)
│       ├── abilities.json    # 192 (한·영·설명·보유 포켓몬)
│       ├── moves.json        # 481 (타입·위력·명중·PP·한·영 이름·설명)
│       ├── type_chart.json   # 18×18 상성 매트릭스
│       └── corpus.json       # 위 전부 + manifest 를 묶은 단일 번들
│
├── scripts/                 # Python 크롤러 + 파서 + 빌더
├── data/
│   ├── raw/                 # 원본 HTML/JSON 캐시 (gitignore)
│   ├── processed/           # 자동 수집 중간 산출물 (커밋 대상)
│   └── manual/              # 사람이 작성하는 오버라이드 (커밋 대상)
│
└── docs/
    ├── plan.md              # 프로젝트 계획 / 로드맵
    ├── schema.md            # JSON 스키마 명세
    ├── history.md           # 작업 히스토리
    └── TODO.md              # 후속 과제
```

## 데이터 갱신

전부 수동. 순서대로 실행하면 된다. 각 fetch 는 디스크 캐시되므로 중단돼도 재실행 안전.

```bash
# 1) serebii Pokémon Champions 소스 HTML
python scripts/fetch_pokemon_details.py     # ~5분 (258 페이지)
python scripts/fetch_abilities.py           # ~5분 (192 페이지)
python scripts/fetch_items_listing.py       # ~1초
python scripts/fetch_sprites.py             # ~1분 (base form 스프라이트 PNG)
python scripts/fetch_form_sprites.py        # ~40초 (메가·지역·특수폼 스프라이트)
python scripts/fetch_item_icons.py          # ~3분 (아이콘 PNG)
python scripts/fetch_new_abilities.py       # ~1초 (Champions 신규 특성 4건)
python scripts/fetch_updated_attacks.py     # ~1초 (Champions 수치 변경 기술)

# 2) PokeAPI 한국어/게임 소스/기술 메타
python scripts/fetch_ability_names_ko.py          # ~3분
python scripts/fetch_ability_descriptions_ko.py   # ~3초 (캐시 재활용)
python scripts/fetch_pokeapi_game_sources.py      # ~2.5분
python scripts/fetch_item_names_ko.py             # ~1분
python scripts/fetch_moves.py                     # ~6분 (481 기술)

# 3) 빌드 — 네트워크 호출 없이 web/data/*.json 생성
python scripts/build.py                 # pokemon/items/abilities + manifest
python scripts/build_type_chart.py      # type_chart (리터럴)
python scripts/build_moves.py           # moves (processed → web/data)
python scripts/build_corpus.py          # 위 전부 번들
```

### 수동 오버라이드

PokeAPI 가 아직 한국어를 반영하지 않은 신규 항목에 대해 `data/manual/*.json` 에 수동 매핑을 채우면 자동 수집값을 덮어씀.

- `data/manual/ability_names_ko.json` — 어빌리티 14 건 stub
- `data/manual/item_names_ko.json` — 아이템 24 건 stub (Champions 신규 메가스톤 대부분)
- `data/manual/game_sources_override.json` — Legends: Z-A 같은 PokeAPI 미반영 신작 대응

## 기술 스택

- **Python 3** + `requests` + `beautifulsoup4` + `lxml` — 크롤러 / 파서 / 빌더
- **Vanilla HTML/CSS/ES module** — 빌드 단계 없는 정적 프론트엔드
- **의도적 미채용**: 프레임워크(React/Vue), 번들러(Vite/webpack), 데이터베이스, 백엔드 API

## 데이터 출처 / 라이선스

### Pokémon 권리

- **Pokémon · 캐릭터 이름 · 게임 내 아트 © Nintendo · Creatures Inc. · GAME FREAK inc.**
- 본 프로젝트는 **비영리 팬 프로젝트**입니다. 광고·재유통·상업적 이용을 하지 않으며, GitHub Pages 무료 호스팅으로만 공개됩니다. 검색 엔진 인덱싱은 `robots.txt` 로 전면 차단.
- **권리자 요청이 있으면 해당 자원을 즉시 삭제**합니다.

### 데이터 소스

| 출처 | 용도 | 라이선스 / 비고 |
| --- | --- | --- |
| [serebii.net Pokémon Champions 섹션](https://www.serebii.net/pokemonchampions/) | Champions 고유 라인업 · 종족값 · 특성 · 기술 · 도구 · 입수 경로 · 도구 아이콘 PNG (`web/assets/items/`) | 정보 참조 (비상업 팬 프로젝트 관행). PokeAPI 가 Pokémon Champions 을 미지원하기 때문에 현재로서는 대체 불가. |
| [PokeAPI](https://pokeapi.co/) | 한국어 이름 · 설명, 기술 메타, HOME 연동 게임 소스 | BSD 3-Clause |
| [PokeAPI/sprites](https://github.com/PokeAPI/sprites) | 포켓몬 스프라이트 PNG (`web/assets/sprites/`) | 레포지토리 MIT. 원 아트 저작권은 위의 Pokémon 권리자에게 있음. |

serebii.net 의존을 줄이려 하고 있으나 Champions 고유 데이터 (Champions 에서 바뀐 기술 수치 `updatedInChampions`, 신규 특성 `isNewInChampions`, Champions 라인업 등) 는 PokeAPI 에 존재하지 않아 현재 대체가 불가합니다. PokeAPI 가 Champions 을 지원하거나 공식 자료가 공개되면 이전 검토 예정.

## 문서

- [`docs/plan.md`](docs/plan.md) — 프로젝트 계획 / 단계별 로드맵
- [`docs/schema.md`](docs/schema.md) — 모든 JSON 파일의 스키마 / 필드 / 샘플
- [`docs/history.md`](docs/history.md) — 작업 히스토리 (날짜별)
- [`docs/TODO.md`](docs/TODO.md) — 후속 과제 / 미완료 항목
- [`web/llms.txt`](web/llms.txt) — AI 에이전트용 사이트 요약 (`llms.txt` 표준)

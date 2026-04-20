# Pokemon Champions 파티 빌더 — 계획서

## 1. 목적

Pokemon Champions에 등장하는 **포켓몬 / 도구(아이템) / 특성**을 한곳에서 검색하고, 사용자가 직접 **파티(최대 6마리)** 를 구성해볼 수 있는 **로컬 전용** 정적 웹 프로젝트를 만든다. 각 포켓몬에 대해 **입수 경로**(전송 전용 / 리크루트 / 선물 등)도 함께 표시한다.

UI는 **한국어를 기본**으로 하고, 영어 이름도 함께 노출한다(검색 시 양쪽 모두 매칭).

데이터 출처:
- **serebii.net Pokemon Champions** — 등장 포켓몬, 입수 경로, 종족값, 도구
- **PokeAPI** — 한국어 이름 매핑, 스프라이트 이미지

## 2. 결과물

- **로컬 git 저장소** (현재 `pocketmon_settings`) — 외부 배포 없음
- **`web/` 정적 웹앱** — `python -m http.server` 등으로 로컬에서 열어서 사용
- **`web/data/` JSON 번들** — 사용자가 명시적으로 명령 실행 시에만 갱신 (자동 크롤링 없음). `web/` 하나만 서빙해도 완결된 정적 사이트가 되도록 배포 친화 구조
- **`assets/sprites/`** — PokeAPI 스프라이트 로컬 사본

## 3. 핵심 기능 (MVP)

### 3.1 데이터 브라우징
- **포켓몬 목록 페이지**
  - 한글 이름 / 영문 이름 / 도감번호 / 타입 / 종족값 / 특성 / 입수 경로
  - 검색은 한글·영문 양쪽 매칭
  - 필터(타입, 입수 경로) · 정렬(번호/스탯)
- **도구 목록 페이지**
  - 이름 / 효과 / 입수 위치 (현재는 리크루트 티켓 위주)
- **특성 목록 페이지**
  - 이름 / 설명 / 보유 포켓몬 (역 인덱스)

### 3.2 파티 빌더
- 최대 6마리 슬롯
- 슬롯에 포켓몬 추가 → 자동으로 종족값/타입/특성 표시
- 특성 선택 (그 포켓몬이 가질 수 있는 특성 중 하나)
- 도구 1개 장착
- **파티 분석**
  - 합계 종족값
  - 타입 커버리지 (공격형 / 약점형)
  - 중복 타입 경고
- **공유**
  - URL 쿼리스트링으로 파티 인코딩 → 링크 복사로 공유 가능
  - 로컬스토리지에 즐겨찾기 저장

### 3.3 입수 경로 표기
포켓몬 카드/디테일에 다음 라벨 중 하나 이상 표시:
- `Recruitable` — 리크루트 가능 (현재 라인업에 등장)
- `Transfer Only` — Pokemon HOME 전송 전용
- `Gift` — 게임 내 선물
- `Default` — 게임 시작부터 보유 가능 (해당 시)

## 4. 데이터 모델

```typescript
// 모든 데이터는 정적 JSON으로 빌드됨

type Pokemon = {
  number: string;          // "0006"
  slug: string;            // "charizard"
  nameEn: string;          // "Charizard"
  nameKo: string;          // "리자몽"
  forms?: { slug: string; nameEn: string; nameKo: string }[];
  types: string[];         // ["fire", "flying"]
  abilities: string[];     // ["Blaze", "Solar Power"] (영문 슬러그 키)
  baseStats: {
    hp: number; atk: number; def: number;
    spAtk: number; spDef: number; speed: number;
  };
  obtain: ObtainSource[];  // ["recruit", "transfer", "gift"] 중 하나 이상
  obtainDetail?: string;   // 자유 텍스트 (예: "이벤트 - 2026-04 라인업")
  spritePath: string;      // 'assets/sprites/006.png' (저장소 내 상대 경로)
};

type ObtainSource = "recruit" | "transfer" | "gift" | "default";

type Item = {
  slug: string;
  nameEn: string;
  nameKo?: string;         // 매핑 가능한 경우만
  effect: string;
  location: string;        // "Achievements" 등
  iconPath: string;        // 'assets/items/normal-affinity.png'
  category?: "ticket" | "battle" | "misc";
};

type Ability = {
  slug: string;
  nameEn: string;
  nameKo?: string;
  description: string;     // serebii ability dex에서 별도 수집
  pokemon: string[];       // 이 특성을 가질 수 있는 포켓몬 slug 리스트
};
```

## 5. 아키텍처

```
┌──────────────────────┐
│  serebii.net (HTML)  │──┐  manual `python scripts/main.py`
└──────────────────────┘  │
                          ▼
                   ┌──────────────┐    parse+merge   ┌──────────────┐
                   │  data/raw/   │ ───────────────▶ │  web/data/  │
                   │   *.html     │                  │   *.json     │
                   └──────────────┘                  └──────┬───────┘
┌──────────────────────┐  ▲                                 │
│  PokeAPI (KO names,  │──┘                                 │ fetch
│   sprites)           │                                    ▼
└──────────────────────┘                            ┌──────────────────┐
                                                    │  web/  (static)  │
                                                    │  로컬에서 직접 열람 │
                                                    └──────────────────┘
```

### 5.1 디렉토리 구조 (목표)

```
pocketmon_settings/
├── scripts/                  # Python 크롤러 + 파서 + 빌더
│   ├── config.py             # ✅ 완료
│   ├── fetcher.py            # ✅ 완료 (캐시 + 레이트리밋)
│   ├── parser.py             # ✅ 완료 (4개 페이지)
│   ├── ability_fetcher.py    # 🔜 특성 설명 수집 (abilitydex)
│   ├── pokeapi.py            # 🔜 PokeAPI에서 한글 이름 + 스프라이트 수집
│   ├── builder.py            # 🔜 파싱 결과를 합쳐 dist JSON 생성
│   └── main.py               # 🔜 fetch → parse → build 전체 파이프라인 (수동 실행)
├── data/
│   ├── raw/                  # 원본 HTML 캐시 (gitignore)
│   └── dist/                 # 빌드 산출물 (커밋)
│       ├── pokemon.json
│       ├── items.json
│       └── abilities.json
├── web/                      # 정적 웹앱 (로컬 전용)
│   ├── index.html
│   ├── pokemon.html
│   ├── items.html
│   ├── abilities.html
│   ├── party.html            # 파티 빌더
│   └── assets/
│       ├── app.js            # 데이터 로드 + UI 로직
│       ├── style.css
│       ├── sprites/          # PokeAPI 스프라이트 사본 (006.png 등)
│       └── items/            # 도구 아이콘 (저장소에 포함)
├── docs/
│   ├── history.md            # 작업 히스토리
│   └── plan.md               # 본 문서
└── README.md                 # 사용법 + 데이터 출처 + 라이선스 안내
```

### 5.2 로컬 실행 방식

```bash
# 데이터 갱신 (사용자가 명시적으로 실행할 때만)
python scripts/main.py

# 웹앱 실행
cd web && python -m http.server 8000
# → http://localhost:8000 에서 열람
```

## 6. 기술 스택

- **데이터 파이프라인**: Python 3, `requests`, `beautifulsoup4`, `lxml` (이미 설치됨)
- **빌드 산출물**: 순수 JSON
- **프론트엔드**: 의존성 없는 **vanilla HTML/CSS/JS**
  - 이유: 빌드 단계 없음, `python -m http.server` 로 즉시 실행, 학습 곡선 낮음
- **호스팅**: 없음 (로컬 전용). 사용자가 직접 `http.server` 또는 IDE Live Preview 실행
- **자동화**: 없음. 데이터 갱신은 사용자가 `python scripts/main.py` 실행 시에만 수행

## 7. 단계별 진행 계획

### Phase 0 — 준비 ✅ 완료
- [x] 프로젝트 초기화, history/plan 체계
- [x] HTTP 페처 (`fetcher.py`)
- [x] 4개 메인 페이지 파서 (`parser.py`)

### Phase 1 — 데이터 수집 완성
- [ ] 특성 설명 수집기 (`ability_fetcher.py`)
  - serebii.net `abilitydex/` 페이지에서 어빌리티별 설명 가져오기
- [ ] 포켓몬 상세 페이지 파서 확장
  - 베이스 스탯, 사용 가능 특성, 폼 정보 등을 `pokedex-champions/{slug}/` 에서 보강
- [ ] PokeAPI 연동 (`pokeapi.py`)
  - 도감번호 기준으로 한글 이름(`names[language=ko]`) 매핑
  - 스프라이트 PNG 다운로드 → `web/assets/sprites/{number}.png`
- [ ] 입수 경로 통합
  - 같은 포켓몬이 여러 소스에 있을 수 있음 → `obtain` 리스트로 머지
- [ ] `builder.py` — 모든 결과를 `web/data/*.json`으로 저장
- [ ] `main.py` — 전체 파이프라인 단일 명령 (수동 실행)

### Phase 2 — 정적 웹앱 (브라우징)
- [ ] `index.html` 랜딩 + 네비게이션
- [ ] `pokemon.html` 목록 (검색/필터/정렬, 한·영 매칭)
- [ ] `items.html` 도구 목록
- [ ] `abilities.html` 특성 목록 (포켓몬 역 인덱스 포함)
- [ ] 카드 컴포넌트 (포켓몬 이미지 + 입수 경로 라벨)
- [ ] 한국어 UI 카피 + 영문 이름 보조 표기

### Phase 3 — 파티 빌더 ✅ 완료 (2026-04-17)
- [x] `party.html` 6슬롯 UI
- [x] 슬롯별 포켓몬 선택 (검색·타입 필터 모달)
- [x] 폼/특성/도구 선택 드롭다운 (폼 변경 시 특성 자동 조정)
- [x] 파티 분석 패널: 종족값 합계 · 타입 분포 · STAB 공격 커버리지 · 방어 프로필(약점 공유) · HOME 연동 게임 교집합
- [x] URL 쿼리 `?p=...` 로 파티 인코딩 → 북마크/공유
- [x] 로컬스토리지 저장/불러오기(이름 지정)

### Phase 4 — 마무리
- [ ] `README.md` — 사용법, 데이터 출처, 라이선스/면책
- [ ] 데이터 갱신 가이드 (`python scripts/main.py` 실행 방법)

### Phase 5 (선택) — 고도화
- [ ] 종족값 비교 차트
- [ ] 추천 파티 (타입 커버리지 최적화 휴리스틱)
- [ ] 어드밴스드 필터 (특정 특성 보유, 종족값 범위)

## 8. 결정 사항 (확정)

| # | 항목 | 결정 |
|---|---|---|
| 1 | 언어 | **한국어 기본**, 영어 보조 표기. 검색은 한·영 양쪽 매칭 |
| 2 | 배포 | **로컬 전용**. GitHub Pages 등 외부 배포 없음 |
| 3 | 이미지 | **PokeAPI 스프라이트** (`github.com/PokeAPI/sprites`) 사용 → 저장소에 사본 포함. 이는 커뮤니티 사실상 표준이며 로컬 전용이라 위험 낮음 |
| 4 | 데이터 갱신 | **수동만**. 사용자가 `python scripts/main.py` 실행 시에만 |
| 5 | 출처 표기 | `README.md` 상단 + 웹앱 푸터에 serebii.net / PokeAPI / Pokemon ©Nintendo·Game Freak·Creatures 명시 |

### 이미지 라이선스 보충

엄밀히 말해 모든 포켓몬 스프라이트의 저작권은 Nintendo / Game Freak / Creatures Inc. 에 있다. 무료로 자유롭게 배포 가능한 "공식 무료" 포켓몬 이미지는 존재하지 않는다. 다만:

- **PokeAPI sprites 저장소**는 수많은 팬 프로젝트가 사용하는 사실상 표준이며, 비상업·교육·팬 프로젝트 용도로 광범위하게 통용된다.
- 본 프로젝트는 **로컬 전용**이므로 배포·재유통 위험이 사실상 없다.
- 그래도 README에 출처와 저작권 안내를 명시해 책임 소재를 분명히 한다.

만약 추후 **외부 공개 배포**로 방향을 바꾸게 되면, 이미지 사용 정책을 반드시 재검토해야 한다.

## 9. 참고

- 데이터 출처:
  - https://www.serebii.net/pokemonchampions/ — 등장 포켓몬, 종족값, 도구, 입수 경로
  - https://pokeapi.co/ — 한글 이름 매핑
  - https://github.com/PokeAPI/sprites — 스프라이트 이미지
- 현재 캐시된 serebii 페이지:
  - `pokemon.shtml` (전체 등장 포켓몬, 258종)
  - `transferonly.shtml` (전송 전용, 26종)
  - `recruit.shtml` (리크루트 도구, 32개)
  - `giftpokemon.shtml` (선물 포켓몬, 7종)
- 저작권: Pokémon, Pokémon character names © Nintendo / Creatures Inc. / GAME FREAK Inc.

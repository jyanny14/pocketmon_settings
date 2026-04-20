# Data Schema — `web/data/*.json`

Pokemon Champions 파티 빌더의 데이터 스키마 문서. 모든 JSON 파일의 필드·타입·의미를 정의한다. LLM 프롬프트에 그대로 붙여넣을 수 있도록 간결한 단일 문서.

- 데이터 소스: serebii.net Pokemon Champions + PokeAPI (이름·게임 소스)
- 슬러그 규약: 포켓몬/아이템은 kebab-case 또는 영문 소문자, 어빌리티/타입은 영문 소문자 연속(공백 제거). 교차 참조는 slug로만 이루어짐
- 문자열 정규화: 자연어 필드는 NFC + zero-width 제거 + HTML 엔티티 디코드 + 공백 축소
- 빌드 산출: `python scripts/build.py` 실행 시 네트워크 호출 없이 캐시된 원본 HTML/JSON을 머지해 `web/data/*.json`을 생성

---

## 공통 타입

| 타입 slug | 한국어 | 설명 |
|---|---|---|
| `normal` | 노말 | |
| `fire` | 불꽃 | |
| `water` | 물 | |
| `electric` | 전기 | |
| `grass` | 풀 | |
| `ice` | 얼음 | |
| `fighting` | 격투 | |
| `poison` | 독 | |
| `ground` | 땅 | |
| `flying` | 비행 | |
| `psychic` | 에스퍼 | |
| `bug` | 벌레 | |
| `rock` | 바위 | |
| `ghost` | 고스트 | |
| `dragon` | 드래곤 | |
| `dark` | 악 | |
| `steel` | 강철 | |
| `fairy` | 페어리 | |

## 공통 입수 경로(ObtainSource)

| 값 | 한국어 | 설명 |
|---|---|---|
| `recruit` | 리크루트 | 현재 라인업에 등장, 리크루트 가능 |
| `transfer` | 전송 전용 | Pokémon HOME 전송 전용 (리크루트 불가) |
| `gift` | 선물 | 게임 내 선물 |
| `default` | 기본 보유 | 게임 시작부터 보유 가능 |

## HOME 직접 연동 게임

| 값 | 한국어 |
|---|---|
| `sword` | 포켓몬 소드 |
| `shield` | 포켓몬 실드 |
| `brilliant-diamond` | 브릴리언트 다이아몬드 |
| `shining-pearl` | 샤이닝 펄 |
| `legends-arceus` | 레전드 아르세우스 |
| `scarlet` | 스칼렛 |
| `violet` | 바이올렛 |
| `lets-go-pikachu` | Let's Go 피카츄 |
| `lets-go-eevee` | Let's Go 이브이 |

Pokémon Bank 경유(Gen 3~7)는 현재 스키마에 포함하지 않음 (T12 후속).

---

## `pokemon.json`

배열. 각 엔트리는 하나의 포켓몬(종). 186개.

```typescript
type Pokemon = {
  number: string;          // 4자리 국가도감번호 zero-padded, 예: "0003"
  slug: string;            // serebii URL slug, 교차 참조 키. 예: "venusaur"
  nameEn: string;          // 영문 이름 (base form)
  nameKo: string;          // 한글 이름 (base form)
  types: string[];         // base form 타입 리스트. 1~2개. 예: ["grass","poison"]
  abilities: string[];     // base form의 특성 slug 리스트. abilities.json의 slug 참조
  baseStats: BaseStats;    // base form 종족값
  forms: Form[];           // 1개 이상. 단일형도 1-요소 배열. base form 포함
  obtain: ObtainSource[];  // 1개 이상. 같은 포켓몬이 여러 소스에 있을 수 있음
  spritePath: string;      // 저장소 상대 경로. 스프라이트 없으면 빈 문자열
};

type BaseStats = {
  hp: number;     // 0~255
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  speed: number;
};

type Form = {
  name: string;            // 영문 폼 이름. base form은 Pokemon.nameEn 과 동일.
                           //   변종 예: "Mega Charizard X", "Alolan Raichu",
                           //            "Hisuian Zoroark", "Blade Forme"
  nameKo: string;          // 한글 폼 이름 (scripts/form_ko.py 로 합성)
                           //   예: "메가 리자몽 X", "알로라 라이츄"
  types: string[];         // 이 폼의 타입. base와 다를 수 있음 (메가/지역폼)
  abilities: string[];     // 이 폼이 가질 수 있는 특성 slug 리스트
  baseStats: BaseStats;    // 이 폼의 종족값
  sourceGames: string[];   // HOME 연동 게임 slug. 빈 배열 = HOME 직접 연동 불가
                           // (Alolan 폼, Simipour, Castform 등)
  spritePath: string;      // 이 폼의 스프라이트 경로 (저장소 상대).
                           //   base form → assets/sprites/{dex}.png
                           //   variant → assets/sprites/forms/{pokeapi_slug}.png
                           //   (없으면 base sprite 로 폴백)
};

// Pokemon 최상위에는 `moves: string[]` 도 포함 (serebii Standard Moves 기준,
// 종 단위로 모든 폼이 공유). 각 원소는 moves.json 의 slug.

type ObtainSource = "recruit" | "transfer" | "gift" | "default";
```

### 샘플

```json
{
  "number": "0006",
  "slug": "charizard",
  "nameEn": "Charizard",
  "nameKo": "리자몽",
  "types": ["fire", "flying"],
  "abilities": ["blaze", "solarpower"],
  "baseStats": {
    "hp": 78, "atk": 84, "def": 78,
    "spAtk": 109, "spDef": 85, "speed": 100
  },
  "forms": [
    {
      "name": "Charizard",
      "nameKo": "리자몽",
      "types": ["fire", "flying"],
      "abilities": ["blaze", "solarpower"],
      "baseStats": {
        "hp": 78, "atk": 84, "def": 78,
        "spAtk": 109, "spDef": 85, "speed": 100
      },
      "sourceGames": ["lets-go-eevee", "lets-go-pikachu", "scarlet", "shield", "sword", "violet"]
    },
    {
      "name": "Mega Charizard X",
      "nameKo": "메가 리자몽 X",
      "types": ["fire", "dragon"],
      "abilities": ["toughclaws"],
      "baseStats": {
        "hp": 78, "atk": 130, "def": 111,
        "spAtk": 130, "spDef": 85, "speed": 100
      },
      "sourceGames": ["lets-go-eevee", "lets-go-pikachu", "scarlet", "shield", "sword", "violet"]
    }
  ],
  "obtain": ["recruit"],
  "spritePath": "assets/sprites/6.png"
}
```

### 주의

- `abilities` 최상위 필드는 base form의 특성과 동일 (편의 제공). 메가/지역폼의 특성은 `forms[].abilities` 에서 확인할 것
- 메가진화/지역폼의 `sourceGames` 규칙:
  - Mega: base form 과 동일 (Champions 내 진화)
  - Alolan → `[]` (SM/USUM는 HOME 직접 연동 아님)
  - Galarian → `["shield","sword"]`
  - Hisuian → `["legends-arceus"]`
  - Paldean → `["scarlet","violet"]`

---

## `items.json`

배열. 117개. Hold Items 30 + Mega Stones 59 + Berries 28.

```typescript
type Item = {
  slug: string;            // 교차 참조 키. 예: "black-belt"
  nameEn: string;          // 영문 이름
  nameKo?: string;         // 한글 이름 (현재 대부분 미수집, 후속 과제)
  effect: string;          // 영문 효과 설명 문장
  effectKo: string;        // 한글 효과 설명. `data/manual/item_effects_ko.json` 에서 병합.
                           //   빈 문자열이면 UI 한국어 모드에서도 영문 effect 폴백
  location: string;        // 입수 위치. 예: "Shop 700 VP", "Achievement - ..."
  iconPath: string;        // 저장소 상대 경로. 아이콘 없으면 빈 문자열
  category: "held" | "mega-stone" | "berry";
};
```

### 샘플

```json
{
  "slug": "black-belt",
  "nameEn": "Black Belt",
  "nameKo": "검은띠",
  "effect": "An item to be held by a Pokémon. This belt helps with focus and boosts the power of the holder's Fighting-type moves.",
  "effectKo": "포켓몬이 지닐 수 있는 도구. 집중을 돕는 벨트. 지닌 포켓몬의 격투타입 기술 위력이 올라간다.",
  "location": "Shop 700 VP",
  "iconPath": "assets/items/black-belt.png",
  "category": "held"
}
```

### 주의

- 리크루트 티켓/쿠폰은 `items.json` 에 포함되지 않음 (사용자 결정 2026-04-15). 필요해지면 `recruit_tickets.json` 로 분리 (T14)
- `nameKo` 는 일부(24개)가 아직 비어 있음 (Champions 신규 메가스톤). PokeAPI 미반영 → `data/manual/item_names_ko.json` 수동 보강 (T8b)
- `effectKo` 는 117/117 번역 완료 (2026-04-20, T16). 영문 소스는 유지

---

## `abilities.json`

배열. 192개.

```typescript
type Ability = {
  slug: string;            // 교차 참조 키. serebii 슬러그(공백·하이픈 제거).
                           //   예: "blaze", "solarpower", "toughclaws"
  nameEn: string;          // 영문 이름 (공백 유지). 예: "Solar Power"
  nameKo: string;          // 한글 이름. PokeAPI 한국어 locale 에서 수집.
                           // 빈 문자열 = PokeAPI 미반영 (Gen 9/Champions 신규)
  description: string;     // serebii "In-Depth Effect" (영문 상세 설명)
  descriptionKo: string;   // PokeAPI 한국어 effect (현재 미제공, 빈 문자열)
  gameText: string;        // serebii "Game's Text" (영문 공식 문구)
  gameTextKo: string;      // PokeAPI 한국어 flavor_text. 빈 문자열 = 미반영
  isNewInChampions: boolean; // Pokemon Champions 신규 특성인지
                             // (newabilities.shtml 기준, 현재 4건)
  pokemon: Holder[];       // 이 특성을 가질 수 있는 포켓몬+폼 리스트
};

type Holder = {
  slug: string;            // pokemon.json 의 Pokemon.slug
  form: string;            // Pokemon.forms[].name (영문 폼 이름)
};
```

### 샘플

```json
{
  "slug": "adaptability",
  "nameEn": "Adaptability",
  "nameKo": "적응력",
  "description": "Increases the Same Type Attack Bonus from *1.5 to *2.",
  "gameText": "Powers up moves of the same type as the Pokémon.",
  "pokemon": [
    {"slug": "basculegion", "form": "Basculegion"},
    {"slug": "basculegion", "form": "Female"},
    {"slug": "lucario",     "form": "Mega Lucario"}
  ]
}
```

### 주의

- `description`/`gameText` 는 현재 영문만 (한국어 설명 수집은 T11 후속)
- `nameKo` 가 빈 문자열인 14개는 PokeAPI가 한국어 번역을 반영하지 않은 Gen 9/Champions 신규 특성. 수동 override 경로: `data/manual/ability_names_ko.json`

---

## `type_chart.json`

오브젝트. 18×18 타입 상성 매트릭스. Fairy 포함 Gen 6+ 현행 규칙.

```typescript
type TypeChart = {
  types: string[];                              // 18개 타입 slug (고정 순서)
  matrix: Record<string, Record<string, Multiplier>>;
  // matrix[attacker][defender] = 배수
};

type Multiplier = 0 | 0.5 | 1 | 2;
```

모든 attacker × defender 쌍이 존재. 기본 1.

### 배수 의미

| 값 | 의미 |
|---|---|
| `0` | 무효화. 예: `matrix.normal.ghost` |
| `0.5` | 효과 없음 (절반) |
| `1` | 상성 없음 (기본) |
| `2` | 효과 뛰어남 (2배) |

### 분포

- `0`: 8 쌍 (normal↔ghost, fighting→ghost, electric→ground, ground→flying, psychic→dark, poison→steel, dragon→fairy)
- `0.5`: 61 쌍
- `1`: 204 쌍
- `2`: 51 쌍

합계 324 (18²).

### 샘플

```json
{
  "types": ["normal", "fire", "water", "..."],
  "matrix": {
    "fire": {
      "grass": 2, "water": 0.5, "ice": 2, "steel": 2, "...": 1
    },
    "fairy": {
      "dragon": 2, "dark": 2, "fighting": 2, "steel": 0.5, "...": 1
    }
  }
}
```

### 이중 타입 데미지 계산

수비측이 `types = [t1, t2]` 이면 `matrix[attacker][t1] * matrix[attacker][t2]`. 0×* = 0, 2×2 = 4배, 0.5×0.5 = 0.25배 등.

---

## `moves.json`

배열. 481개. Pokemon Champions Standard Moves 기준 모든 고유 기술.

```typescript
type Move = {
  slug: string;            // serebii 슬러그 (공백·하이픈 제거). 예: "flamethrower"
  pokeapiSlug: string;     // PokeAPI kebab slug. 예: "flamethrower", "aerial-ace"
  nameEn: string;          // 영문 이름
  nameKo: string;          // 한글 이름 (PokeAPI). 빈 문자열 = 미반영
  type: string;            // 타입 slug (18 타입 중 하나)
  category: "physical" | "special" | "status" | "";
  power: number | null;    // 위력. null 또는 0 = 미정/변화기. Champions 값 우선
  accuracy: number | null; // 명중률(1-100). null = 절대 명중. Champions 값 우선
  pp: number | null;       // PP. Champions 값이 있으면 덮어씀
  flavorTextEn: string;    // 최신 영문 게임 설명
  flavorTextKo: string;    // 최신 한글 설명 (없으면 빈 문자열)
  updatedInChampions: boolean; // 본작에서 수치/효과가 변경된 기술인지
                                // (updatedattacks.shtml 기준, 현재 16건 해당)
  championsEffectEn?: string;  // Champions 에서 변경된 효과 설명 (존재 시)
};
```

### 샘플

```json
{
  "slug": "flamethrower",
  "pokeapiSlug": "flamethrower",
  "nameEn": "Flamethrower",
  "nameKo": "화염방사",
  "type": "fire",
  "category": "special",
  "power": 90,
  "accuracy": 100,
  "pp": 15,
  "flavorTextEn": "The target is scorched with an intense blast of fire.",
  "flavorTextKo": "격렬한 불꽃을 상대에게 발사하여 공격한다."
}
```

### 커버리지

- 한글 이름 (`nameKo`): 446/481 (92.7%)
- 한글 설명 (`flavorTextKo`): 437/481 (90.9%)
- 미매칭분은 PokeAPI 가 한국어 번역을 반영하지 않은 기술들 (주로 신규)

---

## `manifest.json`

생성 시각·스키마 버전·파일 목록·해시. UI 코드 변경 없이 AI 추천 엔진이 메타만 조회 가능하게 하기 위한 단일 인덱스. `scripts/build.py` 가 매 빌드의 마지막 step 으로 생성.

```typescript
type Manifest = {
  generatedAt: string;   // ISO-8601 (UTC)
  schemaVersion: string; // semver, 현재 "1.0.0"
  sources: { [key: string]: string };  // 원본 출처 URL
  files: { name: string; path: string; count: number; sha256: string }[];
};
```

포함 파일: pokemon / items / abilities / type_chart / moves. `corpus.json` 은 이 파일들의 bundle 이므로 자기 참조 방지를 위해 manifest 에 포함하지 않음.

---

## 캐시/빌드 구조 참고

```
data/
├─ raw/                     # 원본 HTML/JSON 캐시 (서브도메인별)
├─ processed/               # 자동 수집 중간 산출물
│  ├─ ability_names_ko.json         # T4 결과
│  └─ pokemon_game_sources.json     # T5 결과
└─ manual/                  # 사람 작업 오버라이드 (커밋 대상)
   ├─ ability_names_ko.json         # T4b 수동 보강
   └─ game_sources_override.json    # T6 수동 오버라이드

web/data/                   # 최종 배포 JSON
├─ pokemon.json
├─ items.json
├─ abilities.json
├─ type_chart.json
├─ moves.json
├─ manifest.json
└─ corpus.json              # 위 모든 파일 + manifest 를 bundle 한 단일 파일
```

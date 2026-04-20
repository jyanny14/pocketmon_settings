# 파티 빌더 → Google Sheets 연동 계획

## 1. 목적

파티 빌더(`web/party.html`)에서 구성한 파티를 **Google Sheets로 옮겨**
통계·메모·밸런스 비교 등 스프레드시트 고유의 편집·공유 워크플로우에서 이어
다룰 수 있게 한다.

## 2. 제약 조건 (반드시 지킨다)

- **로컬 전용 정적 사이트** — 외부 배포/백엔드/서버 계정 없음 (README §5–6).
- **프론트엔드 의존성 없음** — vanilla ES module 유지.
- 기존 **URL 스킴 `?p=slug:formName:abilitySlug:itemSlug|…`** 는 변경하지 않는다 (이미 공유 링크로 배포된 파티 호환성 유지).
- 구글 계정은 **사용자 개인 계정**을 전제로 하고, 프로젝트 차원의 OAuth 클라이언트/서비스 계정은 두지 않는다.

## 3. 전체 구상 — 3단계

계정/인프라 요구도가 낮은 순서로 단계를 쌓아, 단계마다 독립적으로 사용 가능하게 한다.

| 단계 | 결과물 | 사용자 계정 필요 | 네트워크 필요 |
|---|---|---|---|
| 1. TSV 내보내기 버튼 | party.html에 "시트로 복사" 버튼 | 없음 | 없음 |
| 2. Apps Script 파서 | Sheets 사이드바 · 파티 URL 붙여넣기 → 자동 전개 | 구글 계정 | Drive에 corpus.json 업로드 시 1회 |
| 3. Python CLI | `scripts/party_to_csv.py <url>` | 없음 | 없음 |

**최소 목표는 1단계**. 2·3단계는 선택 항목.

---

## 4. 단계 1 — TSV 내보내기 버튼 (권장 기본값)

### 4.1 UX

- `web/party.html` 의 `.party-actions` 영역에 **"시트로 복사"** 버튼 추가.
- 클릭 시 현재 파티를 **TSV(탭 구분)** 문자열로 만들어 clipboard에 복사.
- 사용자는 Google Sheets 셀에 그대로 `Ctrl+V` → 컬럼이 자동 분리됨(TSV 붙여넣기 동작).

### 4.2 출력 스키마 (1행 = 1슬롯, 헤더 포함)

| 컬럼 | 값 | 출처 |
|---|---|---|
| `slot` | 1–6 | 슬롯 인덱스 |
| `dex` | 도감번호 | `pokemon.json` |
| `name_ko` / `name_en` | 한·영 이름 | pokemon + form |
| `form` | 폼 이름 (base면 공란) | form |
| `types` | `불꽃,비행` 쉼표 결합 | form.types |
| `ability_ko` / `ability_en` | 선택 특성 | abilities.json |
| `item_ko` / `item_en` | 장착 도구 (없으면 공란) | items.json |
| `hp,atk,def,spa,spd,spe` | 종족값 6컬럼 | form.stats |
| `bst` | 종족값 합 | 계산 |
| `share_url` | 1행에만 현재 파티 URL | location.href |

빈 슬롯은 행 자체를 생성하지 않는다(사용자가 원치 않으면 시트에서 행 추가).

### 4.3 구현 지점

- `web/assets/party.js`
  - `partyToTsv(state)` 함수 신설 — 기존 `slotToString` / analysis 로직에서 이미 계산하는 값 재사용.
  - `copyPartyTsv()` — clipboard 실패 시 `<textarea>` 선택 fallback (기존 `copyShareUrl` 패턴 답습).
- `web/party.html` — 버튼 1개 + `data-i18n` 키 `party.copyTsv`.
- `web/assets/i18n.js` (또는 현행 번역 소스) — 한·영 라벨.
- 접근성: aria-label, 복사 완료 시 2초간 "복사됨" 토글 (기존 URL 복사 버튼 UX 동일).

### 4.4 수용 기준

- 6마리 파티 TSV 복사 → Google Sheets에 붙여넣기 시 12컬럼 × 7행(헤더+6)으로 정확히 분리.
- 폼이 있는 포켓몬(메가·지역폼)도 올바른 종족값/타입이 반영.
- 도구 미장착 슬롯은 `item_*` 2컬럼이 빈 문자열.
- 한글 이름 · 특수문자(어포스트로피 등)가 깨지지 않음.

### 4.5 예상 작업량

약 1–2시간. 신규 데이터 없음, 기존 상태에서 문자열 조립만 추가.

---

## 5. 단계 2 — Google Apps Script 파서 (선택)

단계 1은 "스냅샷 한 번 옮기기"에는 충분하지만, **공유 URL만 보고 시트가 자동으로 채워지길** 원하는 경우를 위한 보조 단계.

### 5.1 구조

```
Google Sheet (사용자 소유)
 ├─ 시트1: "Party" — A1에 파티 URL 붙여넣기, 이후 자동 전개
 └─ Apps Script (컨테이너 바인딩)
     ├─ onOpen() — "포켓몬" 커스텀 메뉴 추가
     ├─ importPartyFromUrl() — A1 값 파싱 → 슬롯 전개
     └─ (1회) loadCorpus() — Drive의 corpus.json 캐시
```

### 5.2 데이터 전달 방식

- **원칙**: 로컬 사이트이므로 Apps Script가 localhost를 fetch할 수 없다.
- **선택 A (권장)**: 사용자가 `web/data/corpus.json` 을 본인 Google Drive에 업로드 →
  Drive 파일 ID를 Apps Script `PropertiesService` 에 저장 → `DriveApp.getFileById().getBlob()` 로 읽어 `CacheService` 에 1시간 캐시.
- **선택 B**: corpus.json을 Apps Script 내부에 `const CORPUS = {...}` 로 임베드.
  - 장점: 네트워크 0. 단점: 약 924 KB → Apps Script 파일 1개 최대 크기에 근접, 데이터 갱신 시 재배포 수동.
- **선택 C (비채택)**: 사이트를 공개 URL로 올리고 `UrlFetchApp` — "외부 배포 없음" 원칙 위배.

### 5.3 파싱 로직 (Apps Script 측)

단계 1의 TSV 생성기와 **같은 규칙**이 Apps Script 쪽에도 필요.
코드 중복을 피하기 위해:

- `web/assets/party-encode.js` 에 `decodePartyString(encoded, corpus)` 순수 함수를 분리.
- Apps Script는 이 함수의 **내용을 수동 포팅**(Apps Script는 ES module import 미지원).
- 분리 이후 **프론트엔드 party.js 도 이 함수를 사용** → 진실의 소스 1개.

### 5.4 수용 기준

- Sheets 셀에 `http://localhost:8000/party.html?p=…` 붙여넣기 → 메뉴 "포켓몬 → 파티 가져오기" → 단계 1과 동일한 12컬럼이 자동으로 채워진다.
- URL 변경 없이 재실행 가능(덮어쓰기).
- corpus.json 버전(`manifest.generatedAt`) 을 A1 근처에 주석 셀로 표시.

### 5.5 예상 작업량

4–6시간 (Apps Script 초기 설정 + Drive 연동 + 포팅 + 스프레드시트 템플릿 공유 방법 문서화).

---

## 6. 단계 3 — Python CLI (선택, 오프라인 케이스)

스프레드시트 없이 **CSV 파일로 버전관리**하고 싶거나,
사내 자동화 파이프라인에 넣고 싶을 때.

```bash
python scripts/party_to_csv.py "http://localhost:8000/party.html?p=..." > party.csv
# 또는
python scripts/party_to_csv.py --url "..." --format tsv --out party.tsv
```

- `web/data/corpus.json` 을 직접 읽어 단계 1과 동일 스키마로 출력.
- 의존성 0 (urllib + json + csv — 모두 표준 라이브러리).
- `scripts/build.py` 류 기존 파이프라인과 같은 스타일(top-level CLI, argparse).

### 수용 기준

- `--format` 에 `csv` / `tsv` / `json` 지원.
- 잘못된 slug · 없는 item → 오류 메시지 후 exit 1 (파티 빌더의 "fallback 무시" 와 구분).

예상 작업량: 2–3시간.

---

## 7. 권장 진행 순서

1. **단계 1만 먼저** 구현·머지. 이 시점에서 "파티 → 시트" 수요 80% 해결.
2. 사용 피드백 수집 (어떤 컬럼이 부족한지, 정렬/추가 분석 필요한지).
3. 필요 시 단계 2 또는 3 중 **실제로 막히는 쪽**을 이어서 구현.

단계 1 구현 전 확인할 점 (사용자 결정 필요):

- 컬럼 스키마 — §4.2 그대로 갈지, 또는 `sourceGames` / STAB 커버리지 같은 분석 필드까지 포함할지.
- 빈 슬롯 — 행 생략(현안)이 맞는지, 빈 행으로 6행 고정이 시트 가공에 더 편한지.
- 언어 — 시트에도 i18n 토글 반영(현재 UI 언어에 맞춰 헤더/이름 언어 결정)할지, 항상 한·영 양쪽 컬럼으로 고정할지.

## 8. 비고 — 하지 않을 것들

- **Google Sheets API 사용한 푸시 방식** — 프로젝트 차원의 OAuth 클라이언트가 필요해 "계정 없음" 원칙과 충돌.
- **사이트 공개 배포** — 같은 이유로 비채택.
- **실시간 양방향 동기화** — 시트에서 편집한 값을 다시 파티 빌더로 가져오는 방향은 현재 요구 범위 밖.

# Legends: Z-A 전용 폼 목록

Pokémon Legends: Z-A **에서만** 얻을 수 있는 폼을 기록한다.
같은 종의 다른 폼(예: 일반 브리가론) 은 SV 등 타 타이틀에서도 얻을 수 있으므로 여기 포함하지 않는다.

이 목록은 `data/manual/game_sources_override.json` 에 반영돼 있어야 하며,
해당 폼의 `sourceGames` 는 `["legends-z-a"]` 단일 원소여야 한다.

## 기준

- Legends: Z-A 외 타이틀에서 **획득·등장이 불가능**한 폼만 여기 적는다.
- 예: 메가진화는 원칙적으로 전작(XY/ORAS) 및 SV DLC 에도 분포하지만,
  신규 메가(예: 메가 브리가론) 나 특정 신규 폼은 Z-A 에서만 존재.
- 추가될 때마다 이 파일 + `game_sources_override.json` 양쪽을 갱신한다.

## 현재 목록

| base slug | 폼 (EN) | 폼 (KO) | 비고 |
| --- | --- | --- | --- |
| `floette` | Eternal Floette | 영원의 꽃 플라엣테 | AZ 이벤트 계열, SV 미등장 |
| `floette` | Mega Floette | 메가 플라엣테 | Z-A 신규 메가 |
| `chesnaught` | Mega Chesnaught | 메가 브리가론 | Z-A 신규 메가 |
| `delphox` | Mega Delphox | 메가 마폭시 | Z-A 신규 메가 |
| `greninja` | Mega Greninja | 메가 개굴닌자 | Z-A 신규 메가 (애쉬 개굴닌자와 별개) |

## 추가 절차

1. 이 표에 한 행 추가.
2. `data/manual/game_sources_override.json` 의 해당 `base_slug` 블록에서
   해당 폼의 배열을 `["legends-z-a"]` 로 축소 (기본 폼은 건드리지 않음).
3. `python scripts/build.py` 실행 → `web/data/pokemon.json` · `corpus.json` 갱신 확인.
4. `docs/history.md` 당일 섹션에 변경 기록.

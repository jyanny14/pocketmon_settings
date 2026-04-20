"""PokeAPI 캐시에서 어빌리티 한국어 설명 추출.

T4 에서 이미 `ability/{slug}/` 엔드포인트를 전부 호출해 캐시에 저장했으므로
네트워크 호출 없이 캐시만 읽어 flavor_text_entries 와 effect_entries 의
한국어 항목을 뽑는다.

- `flavor_text_entries[lang=ko]`: 게임 내 짧은 문구 ("gameTextKo" 로 매핑)
- `effect_entries[lang=ko]`: 상세 효과 설명 ("descriptionKo" 로 매핑) — 존재하는 경우만

같은 ability 에 여러 버전의 flavor_text 가 있으면 가장 최근(latest-first) 항목을 선택.
effect_entries 는 보통 1건.

입력:  data/raw/pokeapi.co/api_v2_ability_*.json (T4 캐시)
출력:  data/processed/ability_descriptions_ko.json
       { slug: { descriptionKo?: str, gameTextKo?: str } }

serebii slug ↔ PokeAPI slug 매핑은 T4 스크립트와 동일 방식으로 역추적.
파이썬 함수 `derive_pokeapi_slug` 를 재사용한다.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time

from config import POKEAPI_BASE, PROJECT_ROOT
from fetcher import fetch_json
from fetch_ability_names_ko import derive_pokeapi_slug
from normalize import normalize_text

log = logging.getLogger("fetch_ability_descriptions_ko")

ABILITIES_JSON = PROJECT_ROOT / "web" / "data" / "abilities.json"
OUT_PATH = PROJECT_ROOT / "data" / "processed" / "ability_descriptions_ko.json"


def extract_ko_flavor(payload: dict) -> str | None:
    # flavor_text_entries 는 보통 여러 버전이 쌓임. 한국어 항목 중
    # 목록 마지막(가장 최신 게임)을 선호.
    candidates = [
        e.get("flavor_text", "")
        for e in payload.get("flavor_text_entries", []) or []
        if (e.get("language") or {}).get("name") == "ko"
    ]
    candidates = [c for c in candidates if c]
    return normalize_text(candidates[-1]) if candidates else None


def extract_ko_effect(payload: dict) -> str | None:
    for e in payload.get("effect_entries", []) or []:
        if (e.get("language") or {}).get("name") == "ko":
            txt = normalize_text(e.get("effect") or e.get("short_effect") or "")
            if txt:
                return txt
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--force", action="store_true", help="캐시 무시(재호출)")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    abilities = json.loads(ABILITIES_JSON.read_text(encoding="utf-8"))
    if args.limit:
        abilities = abilities[: args.limit]
    total = len(abilities)
    log.info("어빌리티 %d개 처리 시작 (캐시 재사용)", total)

    result: dict[str, dict[str, str]] = {}
    empty_both = 0
    started = time.monotonic()

    for i, ab in enumerate(abilities, 1):
        serebii_slug = ab["slug"]
        pokeapi_slug = derive_pokeapi_slug(serebii_slug, ab["nameEn"])
        url = f"{POKEAPI_BASE}/ability/{pokeapi_slug}/"
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.warning("[%d/%d] %s FETCH FAIL (%s)", i, total, pokeapi_slug, exc)
            continue

        entry: dict[str, str] = {}
        flavor = extract_ko_flavor(payload)
        if flavor:
            entry["gameTextKo"] = flavor
        effect = extract_ko_effect(payload)
        if effect:
            entry["descriptionKo"] = effect

        if entry:
            result[serebii_slug] = entry
        else:
            empty_both += 1
        if i % 30 == 0 or i == total:
            log.info("[%d/%d] %s keys=%s", i, total, serebii_slug, list(entry.keys()))

    elapsed = time.monotonic() - started
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    log.info(
        "완료: %d 어빌리티에 한국어 설명 추출, %d 무한국어, %.1fs 경과 → %s",
        len(result), empty_both, elapsed, OUT_PATH,
    )
    # Summary by field coverage
    with_flavor = sum(1 for v in result.values() if "gameTextKo" in v)
    with_effect = sum(1 for v in result.values() if "descriptionKo" in v)
    log.info("커버리지: gameTextKo=%d, descriptionKo=%d", with_flavor, with_effect)
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""PokeAPI에서 어빌리티 한글명 수집.

serebii ability slug를 PokeAPI slug로 변환해 `ability/{slug}/`를 호출하고,
`names[language.name='ko'].name`을 추출해 매핑 파일을 생성한다.

입력:  web/data/abilities.json (slug + nameEn)
출력:  data/processed/ability_names_ko.json  ({serebii_slug: nameKo})

사용법:
    python scripts/fetch_ability_names_ko.py            # 전체 (~40초)
    python scripts/fetch_ability_names_ko.py --limit 5  # dry-run
    python scripts/fetch_ability_names_ko.py --force    # PokeAPI 캐시 무시
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

from config import POKEAPI_BASE, PROJECT_ROOT
from fetcher import fetch_json

log = logging.getLogger("fetch_ability_names_ko")

ABILITIES_JSON = PROJECT_ROOT / "web" / "data" / "abilities.json"
OUT_PATH = PROJECT_ROOT / "data" / "processed" / "ability_names_ko.json"

# serebii slug → PokeAPI slug. 자동 변환(nameEn.lower().replace(" ","-"))이 통하지 않는 항목만.
SLUG_OVERRIDES: dict[str, str] = {
    "compoundeyes": "compound-eyes",
}


def derive_pokeapi_slug(serebii_slug: str, name_en: str) -> str:
    if serebii_slug in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[serebii_slug]
    return name_en.lower().replace(" ", "-").replace("'", "")


def extract_ko(payload: dict) -> str | None:
    for n in payload.get("names", []):
        if n.get("language", {}).get("name") == "ko":
            return n.get("name")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="처음 N개만 처리 (0=전체)")
    ap.add_argument("--force", action="store_true", help="PokeAPI 캐시 무시")
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
    log.info("어빌리티 %d개 처리 시작", total)

    result: dict[str, str] = {}
    failures: list[tuple[str, str, str]] = []  # (serebii_slug, pokeapi_slug, reason)
    started = time.monotonic()

    for i, ab in enumerate(abilities, 1):
        serebii_slug = ab["slug"]
        name_en = ab["nameEn"]
        pokeapi_slug = derive_pokeapi_slug(serebii_slug, name_en)
        url = f"{POKEAPI_BASE}/ability/{pokeapi_slug}/"
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.warning("[%d/%d] %s ← FETCH FAIL (%s)", i, total, pokeapi_slug, exc)
            failures.append((serebii_slug, pokeapi_slug, f"fetch: {exc}"))
            continue

        ko = extract_ko(payload)
        if not ko:
            log.warning("[%d/%d] %s ← no Korean name", i, total, pokeapi_slug)
            failures.append((serebii_slug, pokeapi_slug, "no ko name"))
            continue

        result[serebii_slug] = ko
        if i % 20 == 0 or i == total:
            log.info("[%d/%d] %s → %s (%s)", i, total, serebii_slug, ko, pokeapi_slug)

    elapsed = time.monotonic() - started
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    log.info(
        "완료: %d/%d 성공, %d 실패, %.1fs 경과 → %s",
        len(result), total, len(failures), elapsed, OUT_PATH,
    )
    if failures:
        log.warning("실패 목록:")
        for s, p, r in failures:
            log.warning("  %s (pokeapi=%s): %s", s, p, r)
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())

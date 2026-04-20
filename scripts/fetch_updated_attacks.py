"""serebii Pokémon Champions updatedattacks.shtml 수집.

PokeAPI 가 제공하는 수치는 SV 기준이라 Champions 에서 PP/위력/명중/효과가
바뀐 기술 42건을 별도로 수집해 moves.json 값에 덮어씌워야 한다.
build_moves.py 가 이 파일을 오버레이 레이어로 사용한다.

캐시된 HTML 을 파싱해 `data/processed/updated_attacks.json` 을 만든다.

사용법:
    python scripts/fetch_updated_attacks.py
    python scripts/fetch_updated_attacks.py --force
"""
from __future__ import annotations

import argparse
import json
import logging
import sys

from config import PROJECT_ROOT, UPDATED_ATTACKS_URL
from fetcher import fetch
from parser import parse_updated_attacks

log = logging.getLogger("fetch_updated_attacks")

OUT_PATH = PROJECT_ROOT / "data" / "processed" / "updated_attacks.json"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    html = fetch(UPDATED_ATTACKS_URL, force=args.force)
    entries = parse_updated_attacks(html)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(
            [
                {
                    "slug": e.slug,
                    "nameEn": e.name_en,
                    "pp": e.pp,
                    "power": e.power,
                    "accuracy": e.accuracy,
                    "effectEn": e.effect_en,
                    "effectChance": e.effect_chance,
                }
                for e in entries
            ],
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    log.info("수치 변경 기술 %d건 저장 → %s", len(entries), OUT_PATH)
    for e in entries:
        log.info("  %-25s pp=%s power=%s acc=%s", e.slug, e.pp, e.power, e.accuracy)
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""serebii Pokémon Champions newabilities.shtml 수집.

Champions 신규 특성 목록(현재 4종 — Piercing Drill, Dragonize, Mega Sol,
Spicy Spray). build.py 가 이 결과를 이용해 abilities.json 의 각 항목에
`isNewInChampions: bool` 플래그를 세팅한다.

캐시된 HTML 을 파싱해 `data/processed/new_abilities.json` 을 만든다.
    [{"slug": "piercingdrill", "nameEn": "Piercing Drill", "effectEn": "..."}]

사용법:
    python scripts/fetch_new_abilities.py
    python scripts/fetch_new_abilities.py --force
"""
from __future__ import annotations

import argparse
import json
import logging
import sys

from config import NEW_ABILITIES_URL, PROJECT_ROOT
from fetcher import fetch
from parser import parse_new_abilities

log = logging.getLogger("fetch_new_abilities")

OUT_PATH = PROJECT_ROOT / "data" / "processed" / "new_abilities.json"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    html = fetch(NEW_ABILITIES_URL, force=args.force)
    entries = parse_new_abilities(html)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(
            [
                {"slug": e.slug, "nameEn": e.name_en, "effectEn": e.effect_en}
                for e in entries
            ],
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    log.info("신규 특성 %d건 저장 → %s", len(entries), OUT_PATH)
    for e in entries:
        log.info("  %s (%s)", e.slug, e.name_en)
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""성격(Nature) 카탈로그 빌드 — `web/data/natures.json`.

전제: `python scripts/fetch_natures.py` 선행 실행으로
`data/processed/natures.json` 이 존재해야 한다.

입력:  data/processed/natures.json  (list[{slug, nameEn, nameKo, increased, decreased}])
출력:  web/data/natures.json         (동일 shape, slug 기준 정렬, 문자열 정규화)

사용법:
    python scripts/build_natures.py
"""
from __future__ import annotations

import json
import logging
import sys

from config import PROJECT_ROOT
from normalize import normalize_text as N

log = logging.getLogger("build_natures")

SRC = PROJECT_ROOT / "data" / "processed" / "natures.json"
OUT = PROJECT_ROOT / "web" / "data" / "natures.json"


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    if not SRC.exists():
        log.error("missing %s — run scripts/fetch_natures.py first", SRC)
        return 1
    data = json.loads(SRC.read_text(encoding="utf-8"))
    rows: list[dict] = []
    for e in data:
        rows.append({
            "slug": e["slug"],
            "nameEn": N(e.get("nameEn", "")),
            "nameKo": N(e.get("nameKo", "")),
            "increased": e.get("increased") or None,
            "decreased": e.get("decreased") or None,
        })
    rows.sort(key=lambda r: r["slug"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log.info("wrote %d natures → %s", len(rows), OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())

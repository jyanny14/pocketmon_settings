"""기술 카탈로그 빌드 — `web/data/moves.json`.

전제: `python scripts/fetch_moves.py` 선행 실행으로
`data/processed/moves.json` 이 존재해야 한다.

입력:  data/processed/moves.json  ({slug: fields})
출력:  web/data/moves.json         (list[dict], slug 기준 정렬)

자연어 필드는 `normalize_text()` 한 번 더 통과시켜 공백/HTML 엔티티/zero-width 정리.

사용법:
    python scripts/build_moves.py
"""
from __future__ import annotations

import json
import logging
import sys

from config import PROJECT_ROOT
from normalize import normalize_text as N

log = logging.getLogger("build_moves")

SRC = PROJECT_ROOT / "data" / "processed" / "moves.json"
UPDATED_ATTACKS_PATH = PROJECT_ROOT / "data" / "processed" / "updated_attacks.json"
OUT = PROJECT_ROOT / "web" / "data" / "moves.json"


def _load_updated_attacks() -> dict[str, dict]:
    """{slug: {pp, power, accuracy, effectEn, effectChance}} — Champions 수치."""
    if not UPDATED_ATTACKS_PATH.exists():
        return {}
    try:
        data = json.loads(UPDATED_ATTACKS_PATH.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        log.warning("updated_attacks read failed: %s", exc)
        return {}
    return {e["slug"]: e for e in data if isinstance(e, dict) and e.get("slug")}


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    if not SRC.exists():
        log.error("missing %s — run scripts/fetch_moves.py first", SRC)
        return 1
    data = json.loads(SRC.read_text(encoding="utf-8"))
    overlay = _load_updated_attacks()
    updated = 0
    rows: list[dict] = []
    for slug in sorted(data):
        e = data[slug]
        row = {
            "slug": slug,
            "pokeapiSlug": e.get("pokeapiSlug", ""),
            "nameEn": N(e.get("nameEn", "")),
            "nameKo": N(e.get("nameKo", "")),
            "type": e.get("type", ""),
            "category": e.get("category", ""),
            "power": e.get("power"),
            "accuracy": e.get("accuracy"),
            "pp": e.get("pp"),
            "flavorTextEn": N(e.get("flavorTextEn", "")),
            "flavorTextKo": N(e.get("flavorTextKo", "")),
            "updatedInChampions": False,
        }
        if slug in overlay:
            o = overlay[slug]
            # Only replace values where the Champions listing provides a number.
            # (serebii leaves some cells blank for moves whose stats are unchanged
            # but that appear on the page for other reasons.)
            if o.get("pp") is not None:
                row["pp"] = o["pp"]
            if o.get("power") is not None:
                row["power"] = o["power"]
            if o.get("accuracy") is not None:
                row["accuracy"] = o["accuracy"]
            # Effect text in the listing is short; keep it as championsEffectEn
            if o.get("effectEn"):
                row["championsEffectEn"] = N(o["effectEn"])
            row["updatedInChampions"] = True
            updated += 1
        rows.append(row)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("wrote %d moves (Champions overlay applied to %d) → %s", len(rows), updated, OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())

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
# Manual Korean-name override, filled in for moves whose PokeAPI entry has no
# Korean name yet (Gen 9 and later). Shape: {slug: nameKo}.
MOVE_NAMES_KO_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "move_names_ko.json"
# Manual Korean flavor-text override. Shape: {slug: flavorTextKo}.
MOVE_FLAVORS_KO_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "move_flavors_ko.json"

# ja/zh — produced by scripts/fetch_names_i18n.py --target move --lang {ja|zh}
MOVE_NAMES_JA_PATH = PROJECT_ROOT / "data" / "processed" / "move_names_ja.json"
MOVE_NAMES_JA_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "move_names_ja.json"
MOVE_NAMES_ZH_PATH = PROJECT_ROOT / "data" / "processed" / "move_names_zh.json"
MOVE_NAMES_ZH_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "move_names_zh.json"

# ja/zh flavor text — PokeAPI move flavor_text. scripts/fetch_flavors_i18n.py 산출물.
MOVE_FLAVORS_JA_PATH = PROJECT_ROOT / "data" / "processed" / "move_flavorText_ja.json"
MOVE_FLAVORS_JA_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "move_flavorText_ja.json"
MOVE_FLAVORS_ZH_PATH = PROJECT_ROOT / "data" / "processed" / "move_flavorText_zh.json"
MOVE_FLAVORS_ZH_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "move_flavorText_zh.json"

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


def _load_slug_map(path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        log.warning("read failed (%s): %s", path, exc)
        return {}
    if not isinstance(data, dict):
        return {}
    return {k: v for k, v in data.items() if v and not k.startswith("_")}


def _load_move_names_ko() -> dict[str, str]:
    return _load_slug_map(MOVE_NAMES_KO_OVERRIDE_PATH)


def _load_move_flavors_ko() -> dict[str, str]:
    return _load_slug_map(MOVE_FLAVORS_KO_OVERRIDE_PATH)


def _load_merged(*paths) -> dict[str, str]:
    """여러 파일에서 슬러그 맵을 읽어 뒤에 올수록 우선순위 높게 병합."""
    merged: dict[str, str] = {}
    for p in paths:
        merged.update(_load_slug_map(p))
    return merged


def _load_move_names_ja() -> dict[str, str]:
    return _load_merged(MOVE_NAMES_JA_PATH, MOVE_NAMES_JA_OVERRIDE_PATH)


def _load_move_names_zh() -> dict[str, str]:
    return _load_merged(MOVE_NAMES_ZH_PATH, MOVE_NAMES_ZH_OVERRIDE_PATH)


def _load_move_flavors_ja() -> dict[str, str]:
    return _load_merged(MOVE_FLAVORS_JA_PATH, MOVE_FLAVORS_JA_OVERRIDE_PATH)


def _load_move_flavors_zh() -> dict[str, str]:
    return _load_merged(MOVE_FLAVORS_ZH_PATH, MOVE_FLAVORS_ZH_OVERRIDE_PATH)


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
    names_ko_override = _load_move_names_ko()
    flavors_ko_override = _load_move_flavors_ko()
    names_ja = _load_move_names_ja()
    names_zh = _load_move_names_zh()
    flavors_ja = _load_move_flavors_ja()
    flavors_zh = _load_move_flavors_zh()
    manual_name_applied = 0
    manual_flavor_applied = 0
    updated = 0
    rows: list[dict] = []
    for slug in sorted(data):
        e = data[slug]
        fetched_name_ko = N(e.get("nameKo", ""))
        name_ko = fetched_name_ko
        if not name_ko and slug in names_ko_override:
            name_ko = N(names_ko_override[slug])
            manual_name_applied += 1
        fetched_flavor_ko = N(e.get("flavorTextKo", ""))
        flavor_ko = fetched_flavor_ko
        if not flavor_ko and slug in flavors_ko_override:
            flavor_ko = N(flavors_ko_override[slug])
            manual_flavor_applied += 1
        row = {
            "slug": slug,
            "pokeapiSlug": e.get("pokeapiSlug", ""),
            "nameEn": N(e.get("nameEn", "")),
            "nameKo": name_ko,
            "nameJa": N(names_ja.get(slug, "")),
            "nameZh": N(names_zh.get(slug, "")),
            "type": e.get("type", ""),
            "category": e.get("category", ""),
            "power": e.get("power"),
            "accuracy": e.get("accuracy"),
            "pp": e.get("pp"),
            "flavorTextEn": N(e.get("flavorTextEn", "")),
            "flavorTextKo": flavor_ko,
            "flavorTextJa": N(flavors_ja.get(slug, "")),
            "flavorTextZh": N(flavors_zh.get(slug, "")),
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
    log.info(
        "wrote %d moves (Champions overlay=%d, manual nameKo=%d, manual flavorKo=%d) → %s",
        len(rows),
        updated,
        manual_name_applied,
        manual_flavor_applied,
        OUT,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

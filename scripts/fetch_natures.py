"""PokeAPI 에서 Nature(성격) 25종 수집.

본편 시리즈와 동일한 25 natures 는 Champions 에도 그대로 적용되므로 별도
수동 오버라이드 없이 PokeAPI `/nature/{slug}/` 응답을 그대로 사용한다.

입력:  (없음 — 25 natures 슬러그는 아래 상수로 고정)
출력:  data/processed/natures.json
        [
          {
            "slug": "adamant",
            "nameEn": "Adamant",
            "nameKo": "고집",
            "increased": "atk",
            "decreased": "spAtk"
          },
          ... (중립 5종은 increased/decreased 가 null)
        ]

사용법:
    python scripts/fetch_natures.py          # 전체 (~10초)
    python scripts/fetch_natures.py --force  # PokeAPI 캐시 무시
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

log = logging.getLogger("fetch_natures")

OUT_PATH = PROJECT_ROOT / "data" / "processed" / "natures.json"

# 25 natures — canonical PokeAPI slugs. Order: increased stat (none/atk/def/spe/spa/spd).
NATURE_SLUGS: list[str] = [
    # neutral (5)
    "hardy", "docile", "serious", "bashful", "quirky",
    # +atk
    "lonely", "brave", "adamant", "naughty",
    # +def
    "bold", "relaxed", "impish", "lax",
    # +speed
    "timid", "hasty", "jolly", "naive",
    # +spAtk
    "modest", "mild", "quiet", "rash",
    # +spDef
    "calm", "gentle", "sassy", "careful",
]

# PokeAPI stat slug → our baseStats key
POKEAPI_STAT_TO_OUR: dict[str, str] = {
    "attack": "atk",
    "defense": "def",
    "special-attack": "spAtk",
    "special-defense": "spDef",
    "speed": "speed",
    "hp": "hp",  # no nature actually affects hp, kept for safety
}


def extract_name(payload: dict, lang: str) -> str | None:
    for n in payload.get("names", []):
        if n.get("language", {}).get("name") == lang:
            return n.get("name")
    return None


def extract_stat(payload: dict, key: str) -> str | None:
    """key ∈ {'increased_stat', 'decreased_stat'}. PokeAPI returns null for neutral natures."""
    stat_obj = payload.get(key)
    if not stat_obj:
        return None
    api_slug = stat_obj.get("name")
    if not api_slug:
        return None
    mapped = POKEAPI_STAT_TO_OUR.get(api_slug)
    if mapped is None:
        log.warning("unknown stat slug from PokeAPI: %s", api_slug)
    return mapped


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="PokeAPI 캐시 무시")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    total = len(NATURE_SLUGS)
    log.info("nature %d종 처리 시작", total)

    results: list[dict] = []
    failures: list[tuple[str, str]] = []
    started = time.monotonic()

    for i, slug in enumerate(NATURE_SLUGS, 1):
        url = f"{POKEAPI_BASE}/nature/{slug}/"
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.warning("[%d/%d] %s ← FETCH FAIL (%s)", i, total, slug, exc)
            failures.append((slug, f"fetch: {exc}"))
            continue

        name_en = extract_name(payload, "en") or slug.title()
        name_ko = extract_name(payload, "ko") or ""
        increased = extract_stat(payload, "increased_stat")
        decreased = extract_stat(payload, "decreased_stat")

        results.append({
            "slug": slug,
            "nameEn": name_en,
            "nameKo": name_ko,
            "increased": increased,
            "decreased": decreased,
        })
        log.info("[%d/%d] %s: %s / %s  (+%s / -%s)",
                 i, total, slug, name_en, name_ko, increased, decreased)

    elapsed = time.monotonic() - started
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    results.sort(key=lambda n: n["slug"])
    OUT_PATH.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log.info("완료: %d/%d 성공, %d 실패, %.1fs → %s",
             len(results), total, len(failures), elapsed, OUT_PATH)
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())

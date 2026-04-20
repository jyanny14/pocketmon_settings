"""Download PokeAPI sprite PNGs for every pokemon with a detail page cached.

Uses the national dex number parsed from each detail HTML, then grabs the
sprite from github.com/PokeAPI/sprites at
  sprites/pokemon/{dex}.png

Usage:
    python scripts/fetch_sprites.py
    python scripts/fetch_sprites.py --limit 5
    python scripts/fetch_sprites.py --force
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from config import POKEAPI_SPRITE_URL, PROJECT_ROOT, RAW_DIR
from fetcher import fetch_binary
from parser import parse_pokemon_detail


log = logging.getLogger("fetch_sprites")

SPRITES_DIR = PROJECT_ROOT / "web" / "assets" / "sprites"
DETAIL_GLOB = "pokedex-champions_*.html"


def iter_dex_numbers() -> list[tuple[str, str]]:
    """(slug, dex_number_no_leading_zeros) pairs from cached detail pages."""
    detail_dir = RAW_DIR / "www.serebii.net"
    out: dict[str, str] = {}
    for html_file in sorted(detail_dir.glob(DETAIL_GLOB)):
        # slug lives in filename: pokedex-champions_charizard_<hash>.html
        stem = html_file.stem  # pokedex-champions_charizard_26e32d95
        parts = stem.split("_")
        if len(parts) < 3:
            continue
        slug = "_".join(parts[1:-1])
        try:
            detail = parse_pokemon_detail(
                html_file.read_text(encoding="utf-8"), slug
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("skip %s: parse failed (%s)", slug, exc)
            continue
        if not detail.national_dex:
            continue
        dex = detail.national_dex.lstrip("0") or "0"
        out[slug] = dex
    return sorted(out.items())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("fetcher").setLevel(logging.WARNING)

    pairs = iter_dex_numbers()
    if not pairs:
        log.error("no dex numbers — run fetch_pokemon_details.py first")
        return 2
    if args.limit:
        pairs = pairs[: args.limit]

    total = len(pairs)
    log.info("downloading %d sprites → %s", total, SPRITES_DIR)

    start = time.monotonic()
    failures: list[tuple[str, str]] = []
    for i, (slug, dex) in enumerate(pairs, 1):
        url = POKEAPI_SPRITE_URL.format(id=dex)
        dest = SPRITES_DIR / f"{dex}.png"
        try:
            fetch_binary(url, dest, force=args.force)
            log.info("[%d/%d] ok %s → %s.png", i, total, slug, dex)
        except Exception as exc:  # noqa: BLE001
            log.error("[%d/%d] FAIL %s: %s", i, total, slug, exc)
            failures.append((slug, str(exc)))

    elapsed = time.monotonic() - start
    log.info("done in %.1fs — %d ok, %d failed", elapsed, total - len(failures), len(failures))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

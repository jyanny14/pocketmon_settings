"""Fetch abilitydex pages for every ability referenced by cached pokemon details.

Requires fetch_pokemon_details.py to have run first (reads cached detail HTML).

Usage:
    python scripts/fetch_abilities.py
    python scripts/fetch_abilities.py --limit 5
    python scripts/fetch_abilities.py --force
"""
from __future__ import annotations

import argparse
import logging
import re
import sys
import time
from pathlib import Path

from config import ABILITYDEX_URL, RAW_DIR
from fetcher import fetch


log = logging.getLogger("fetch_abilities")

DETAIL_GLOB = "pokedex-champions_*.html"
ABILITY_LINK_RE = re.compile(r'/abilitydex/([^/."\']+)\.shtml')


def collect_ability_slugs() -> list[str]:
    """Scan cached pokemon detail HTML files for unique ability slugs."""
    detail_dir = RAW_DIR / "www.serebii.net"
    slugs: set[str] = set()
    for html_file in detail_dir.glob(DETAIL_GLOB):
        text = html_file.read_text(encoding="utf-8", errors="ignore")
        slugs.update(ABILITY_LINK_RE.findall(text))
    return sorted(slugs)


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

    slugs = collect_ability_slugs()
    if not slugs:
        log.error(
            "no ability slugs found — run fetch_pokemon_details.py first so that "
            "detail pages are cached in data/raw/www.serebii.net/"
        )
        return 2

    if args.limit:
        slugs = slugs[: args.limit]

    total = len(slugs)
    log.info("fetching %d abilitydex pages", total)

    start = time.monotonic()
    failures: list[tuple[str, str]] = []
    for i, slug in enumerate(slugs, 1):
        url = ABILITYDEX_URL.format(slug=slug)
        try:
            fetch(url, force=args.force)
            log.info("[%d/%d] ok %s", i, total, slug)
        except Exception as exc:  # noqa: BLE001
            log.error("[%d/%d] FAIL %s: %s", i, total, slug, exc)
            failures.append((slug, str(exc)))

    elapsed = time.monotonic() - start
    log.info("done in %.1fs — %d ok, %d failed", elapsed, total - len(failures), len(failures))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

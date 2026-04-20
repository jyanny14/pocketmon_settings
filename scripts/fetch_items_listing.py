"""Fetch serebii's pokemonchampions/items.shtml page (Hold Items / Mega Stones
/ Berries / Miscellaneous).

This replaces the earlier recruit.shtml-only flow. Recruit tickets are
excluded from the parsed output per product decision.

Usage:
    python scripts/fetch_items_listing.py
    python scripts/fetch_items_listing.py --force
"""
from __future__ import annotations

import argparse
import logging
import sys
from collections import Counter

from config import ITEMS_LISTING_URL
from fetcher import fetch
from parser import parse_items_listing


log = logging.getLogger("fetch_items_listing")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    html = fetch(ITEMS_LISTING_URL, force=args.force)
    items = parse_items_listing(html)
    by_cat = Counter(it.category for it in items)
    log.info("parsed %d items: %s", len(items), dict(by_cat))
    return 0


if __name__ == "__main__":
    sys.exit(main())

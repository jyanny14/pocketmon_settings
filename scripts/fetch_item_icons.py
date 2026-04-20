"""Download serebii item icons into web/assets/items/ so the web app does not
hotlink serebii (deployment friendliness + licensing).

Source: pokemonchampions/items.shtml parsed by `parse_items_listing`.
Scope: Hold Items + Mega Stones + Berries. Recruit tickets are excluded.

Usage:
    python scripts/fetch_items_listing.py   # must run first (caches HTML)
    python scripts/fetch_item_icons.py
    python scripts/fetch_item_icons.py --force
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

from config import BASE_URL, ITEMS_LISTING_URL, PROJECT_ROOT
from fetcher import fetch, fetch_binary
from parser import parse_items_listing


log = logging.getLogger("fetch_item_icons")

ITEMS_DIR = PROJECT_ROOT / "web" / "assets" / "items"


def _slug(name: str) -> str:
    return name.lower().replace(" ", "-").replace("'", "").replace(".", "")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("fetcher").setLevel(logging.WARNING)

    html = fetch(ITEMS_LISTING_URL)  # cached from fetch_items_listing.py
    items = parse_items_listing(html)

    log.info("downloading %d item icons → %s", len(items), ITEMS_DIR)
    start = time.monotonic()
    failures: list[tuple[str, str]] = []
    total = len(items)
    for i, it in enumerate(items, 1):
        if not it.icon_url:
            log.warning("[%d/%d] SKIP %s (no icon_url)", i, total, it.name)
            continue
        url = urljoin(BASE_URL, it.icon_url)
        dest = ITEMS_DIR / f"{_slug(it.name)}.png"
        try:
            fetch_binary(url, dest, force=args.force)
            log.info("[%d/%d] ok %s", i, total, dest.name)
        except Exception as exc:  # noqa: BLE001
            log.error("[%d/%d] FAIL %s: %s", i, total, it.name, exc)
            failures.append((it.name, str(exc)))

    log.info(
        "done in %.1fs — %d ok, %d failed",
        time.monotonic() - start,
        total - len(failures),
        len(failures),
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

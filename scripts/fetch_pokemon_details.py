"""Fetch every pokedex-champions/{slug}/ detail page listed in pokemon.shtml.

Usage:
    python scripts/fetch_pokemon_details.py              # full run (all slugs)
    python scripts/fetch_pokemon_details.py --limit 5    # dry-run first N
    python scripts/fetch_pokemon_details.py --force      # ignore cache, refetch

Cached pages go to data/raw/www.serebii.net/. Safe to re-run.
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

from config import POKEMON_DETAIL_URL, POKEMON_LIST_URL, RAW_DIR
from fetcher import fetch
from parser import parse_pokemon_list


log = logging.getLogger("fetch_details")


def find_cached_list() -> str | None:
    matches = sorted((RAW_DIR / "www.serebii.net").glob("pokemonchampions_pokemon.shtml_*.html"))
    return matches[0].read_text(encoding="utf-8") if matches else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="only fetch first N slugs")
    ap.add_argument("--force", action="store_true", help="ignore cache")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    # Silence the per-request INFO from fetcher; we print our own progress.
    logging.getLogger("fetcher").setLevel(logging.WARNING)

    html = find_cached_list() or fetch(POKEMON_LIST_URL)
    pokemons = parse_pokemon_list(html)
    seen: set[str] = set()
    slugs: list[str] = []
    for p in pokemons:
        if p.slug and p.slug not in seen:
            seen.add(p.slug)
            slugs.append(p.slug)

    if args.limit:
        slugs = slugs[: args.limit]

    total = len(slugs)
    log.info("fetching %d detail pages", total)

    start = time.monotonic()
    failures: list[tuple[str, str]] = []
    for i, slug in enumerate(slugs, 1):
        url = POKEMON_DETAIL_URL.format(slug=slug)
        try:
            fetch(url, force=args.force)
            log.info("[%d/%d] ok %s", i, total, slug)
        except Exception as exc:  # noqa: BLE001
            log.error("[%d/%d] FAIL %s: %s", i, total, slug, exc)
            failures.append((slug, str(exc)))

    elapsed = time.monotonic() - start
    log.info("done in %.1fs — %d ok, %d failed", elapsed, total - len(failures), len(failures))
    if failures:
        for slug, err in failures:
            log.error("  %s: %s", slug, err)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

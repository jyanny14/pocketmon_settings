"""메가·지역·특수폼 전용 스프라이트 수집.

T5a `pokeapi_form_map.form_to_pokeapi_slug` 로 각 폼의 PokeAPI variant slug 를
얻고, `/api/v2/pokemon/{slug}` 응답의 `sprites.front_default` URL 에서
PNG 를 받아 `web/assets/sprites/forms/{pokeapi_slug}.png` 로 저장한다.

기본 폼(`form.name == pokemon.nameEn`)은 이미 `assets/sprites/{dex}.png`
로 저장돼 있으므로 스킵한다.

사용법:
    python scripts/fetch_form_sprites.py              # 전체 (~40초)
    python scripts/fetch_form_sprites.py --limit 10   # dry-run
    python scripts/fetch_form_sprites.py --force      # PokeAPI JSON·PNG 캐시 무시
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

from config import POKEAPI_BASE, PROJECT_ROOT
from fetcher import fetch_binary, fetch_json
from pokeapi_form_map import form_to_pokeapi_slug

log = logging.getLogger("fetch_form_sprites")

POKEMON_JSON = PROJECT_ROOT / "web" / "data" / "pokemon.json"
FORM_SPRITES_DIR = PROJECT_ROOT / "web" / "assets" / "sprites" / "forms"


def _extract_sprite_url(payload: dict) -> str | None:
    sprites = payload.get("sprites") or {}
    url = sprites.get("front_default")
    return url or None


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

    pokemon = json.loads(POKEMON_JSON.read_text(encoding="utf-8"))

    # Collect (pokeapi_slug, label) for variant forms only (skip base).
    tasks: list[tuple[str, str]] = []  # (pokeapi_slug, label)
    seen_slugs: set[str] = set()
    for p in pokemon:
        base_name = p["nameEn"]
        for form in p["forms"]:
            if form["name"] == base_name:
                continue  # base form — already covered by fetch_sprites.py
            pa_slug = form_to_pokeapi_slug(p["slug"], base_name, form["name"])
            if not pa_slug or pa_slug in seen_slugs:
                continue
            seen_slugs.add(pa_slug)
            tasks.append((pa_slug, f"{p['slug']} / {form['name']}"))

    if args.limit:
        tasks = tasks[: args.limit]
    total = len(tasks)
    log.info("폼 스프라이트 %d건 → %s", total, FORM_SPRITES_DIR)

    start = time.monotonic()
    failures: list[tuple[str, str]] = []
    skipped = 0
    for i, (pa_slug, label) in enumerate(tasks, 1):
        dest = FORM_SPRITES_DIR / f"{pa_slug}.png"
        if dest.exists() and not args.force:
            skipped += 1
            continue
        url = f"{POKEAPI_BASE}/pokemon/{pa_slug}/"
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.error("[%d/%d] JSON FAIL %s: %s", i, total, pa_slug, exc)
            failures.append((pa_slug, f"json: {exc}"))
            continue

        sprite_url = _extract_sprite_url(payload)
        if not sprite_url:
            log.warning("[%d/%d] no sprite url for %s", i, total, pa_slug)
            failures.append((pa_slug, "no sprite url"))
            continue

        try:
            fetch_binary(sprite_url, dest, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.error("[%d/%d] PNG FAIL %s: %s", i, total, pa_slug, exc)
            failures.append((pa_slug, f"png: {exc}"))
            continue

        if i % 10 == 0 or i == total:
            log.info("[%d/%d] %s  ← %s", i, total, pa_slug, label)

    elapsed = time.monotonic() - start
    log.info(
        "완료 %.1fs — 저장 %d, 스킵(기존파일) %d, 실패 %d",
        elapsed, total - skipped - len(failures), skipped, len(failures),
    )
    if failures:
        log.warning("실패 목록:")
        for s, r in failures:
            log.warning("  %s: %s", s, r)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

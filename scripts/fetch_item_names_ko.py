"""PokeAPI 에서 아이템 한글명 수집.

items.json slug 는 이미 kebab-case 로 PokeAPI 와 호환. 변환 불필요.

입력:  web/data/items.json
출력:  data/processed/item_names_ko.json  ({slug: nameKo})

사용법:
    python scripts/fetch_item_names_ko.py             # 전체 (~25초)
    python scripts/fetch_item_names_ko.py --limit 5   # dry-run
    python scripts/fetch_item_names_ko.py --force     # 캐시 무시
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time

from config import POKEAPI_BASE, PROJECT_ROOT
from fetcher import fetch_json

log = logging.getLogger("fetch_item_names_ko")

ITEMS_JSON = PROJECT_ROOT / "web" / "data" / "items.json"
OUT_PATH = PROJECT_ROOT / "data" / "processed" / "item_names_ko.json"


def extract_ko(payload: dict) -> str | None:
    for n in payload.get("names", []):
        if n.get("language", {}).get("name") == "ko":
            return n.get("name")
    return None


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

    items = json.loads(ITEMS_JSON.read_text(encoding="utf-8"))
    if args.limit:
        items = items[: args.limit]
    total = len(items)
    log.info("아이템 %d개 처리 시작", total)

    result: dict[str, str] = {}
    failures: list[tuple[str, str]] = []
    started = time.monotonic()

    for i, it in enumerate(items, 1):
        slug = it["slug"]
        url = f"{POKEAPI_BASE}/item/{slug}/"
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.warning("[%d/%d] %s FETCH FAIL (%s)", i, total, slug, exc)
            failures.append((slug, f"fetch: {exc}"))
            continue
        ko = extract_ko(payload)
        if not ko:
            failures.append((slug, "no ko name"))
            continue
        result[slug] = ko
        if i % 20 == 0 or i == total:
            log.info("[%d/%d] %s → %s", i, total, slug, ko)

    elapsed = time.monotonic() - started
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    log.info(
        "완료: %d/%d 성공, %d 실패, %.1fs 경과 → %s",
        len(result), total, len(failures), elapsed, OUT_PATH,
    )
    if failures:
        log.warning("실패 목록:")
        for slug, reason in failures:
            log.warning("  %s: %s", slug, reason)
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())

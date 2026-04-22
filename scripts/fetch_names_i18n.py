"""PokeAPI 에서 포켓몬·특성·도구·기술 이름을 언어별로 수집.

기존 `fetch_ability_names_ko.py` / `fetch_item_names_ko.py` 의 통합·다국어 버전.
`--target` 으로 대상을, `--lang` 으로 언어를 선택한다. ko 는 기존 스크립트와
출력 호환 — 다만 기본 수집 파이프라인은 기존 스크립트를 유지하고 여기서는 신규
ja / zh 만 돌리는 것을 권장 (리팩터 리스크 차단).

입력:
  - target=pokemon   → web/data/pokemon.json (slug)
  - target=ability   → web/data/abilities.json (slug + nameEn, SLUG_OVERRIDES)
  - target=item      → web/data/items.json (slug)
  - target=move      → web/data/moves.json (slug + pokeapiSlug)

출력:  data/processed/{target}_names_{lang}.json  ({serebii_slug: name})

사용법:
    python scripts/fetch_names_i18n.py --target ability --lang ja
    python scripts/fetch_names_i18n.py --target pokemon --lang zh --limit 5
    python scripts/fetch_names_i18n.py --target item --lang ja --force
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

from config import POKEAPI_BASE, POKEAPI_LANG_CODES, PROJECT_ROOT
from fetcher import fetch_json

log = logging.getLogger("fetch_names_i18n")


# ── 대상별 입력·URL 규칙 ─────────────────────────────────────────

POKEMON_JSON = PROJECT_ROOT / "web" / "data" / "pokemon.json"
ABILITIES_JSON = PROJECT_ROOT / "web" / "data" / "abilities.json"
ITEMS_JSON = PROJECT_ROOT / "web" / "data" / "items.json"
MOVES_JSON = PROJECT_ROOT / "web" / "data" / "moves.json"

# serebii ability slug → PokeAPI slug. 자동 변환이 통하지 않는 항목만.
ABILITY_SLUG_OVERRIDES: dict[str, str] = {
    "compoundeyes": "compound-eyes",
}

# serebii pokemon slug → PokeAPI slug.
# 대부분 동일하지만 마침표가 포함된 케이스 등 예외가 있음.
POKEMON_SLUG_OVERRIDES: dict[str, str] = {
    "mr.rime": "mr-rime",
    "mr.mime": "mr-mime",
    "mime.jr.": "mime-jr",
    "mime.jr": "mime-jr",
    "porygon-z": "porygon-z",  # 이미 호환이지만 명시
    "type:null": "type-null",
    "jangmo-o": "jangmo-o",
    "hakamo-o": "hakamo-o",
    "kommo-o": "kommo-o",
    "tapukoko": "tapu-koko",
    "tapulele": "tapu-lele",
    "tapubulu": "tapu-bulu",
    "tapufini": "tapu-fini",
}


def _load_entries(target: str) -> list[dict]:
    if target == "pokemon":
        return json.loads(POKEMON_JSON.read_text(encoding="utf-8"))
    if target == "ability":
        return json.loads(ABILITIES_JSON.read_text(encoding="utf-8"))
    if target == "item":
        return json.loads(ITEMS_JSON.read_text(encoding="utf-8"))
    if target == "move":
        return json.loads(MOVES_JSON.read_text(encoding="utf-8"))
    raise ValueError(f"unknown target: {target}")


def _pokeapi_slug(target: str, entry: dict) -> str:
    serebii_slug = entry["slug"]
    name_en = entry.get("nameEn", "")
    if target == "pokemon":
        if serebii_slug in POKEMON_SLUG_OVERRIDES:
            return POKEMON_SLUG_OVERRIDES[serebii_slug]
        # pokemon-species 는 기본 slug 로 접근 가능 (venusaur, charizard ...)
        return serebii_slug
    if target == "ability":
        if serebii_slug in ABILITY_SLUG_OVERRIDES:
            return ABILITY_SLUG_OVERRIDES[serebii_slug]
        return name_en.lower().replace(" ", "-").replace("'", "")
    if target == "item":
        # items.json slug 는 이미 kebab-case PokeAPI 호환
        return serebii_slug
    if target == "move":
        # moves.json 에 pokeapiSlug 필드가 이미 있음
        return entry.get("pokeapiSlug") or serebii_slug
    raise ValueError(target)


def _endpoint(target: str, pokeapi_slug: str) -> str:
    root = {
        "pokemon": "pokemon-species",
        "ability": "ability",
        "item": "item",
        "move": "move",
    }[target]
    return f"{POKEAPI_BASE}/{root}/{pokeapi_slug}/"


def _extract_name(payload: dict, pokeapi_lang: str) -> str | None:
    for n in payload.get("names", []) or []:
        if (n.get("language") or {}).get("name") == pokeapi_lang:
            name = n.get("name") or ""
            return name or None
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--target",
        required=True,
        choices=["pokemon", "ability", "item", "move"],
        help="수집 대상",
    )
    ap.add_argument(
        "--lang",
        required=True,
        choices=sorted(POKEAPI_LANG_CODES.keys()),
        help="내부 언어 코드 (ko|ja|zh)",
    )
    ap.add_argument("--limit", type=int, default=0, help="처음 N개만 처리 (0=전체)")
    ap.add_argument("--force", action="store_true", help="PokeAPI 캐시 무시")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    pokeapi_lang = POKEAPI_LANG_CODES[args.lang]
    entries = _load_entries(args.target)
    if args.limit:
        entries = entries[: args.limit]
    total = len(entries)
    log.info(
        "target=%s lang=%s(%s) — %d개 처리 시작",
        args.target, args.lang, pokeapi_lang, total,
    )

    out_path = (
        PROJECT_ROOT / "data" / "processed" / f"{args.target}_names_{args.lang}.json"
    )

    result: dict[str, str] = {}
    failures: list[tuple[str, str, str]] = []  # (serebii_slug, pokeapi_slug, reason)
    started = time.monotonic()

    for i, entry in enumerate(entries, 1):
        serebii_slug = entry["slug"]
        try:
            pokeapi_slug = _pokeapi_slug(args.target, entry)
        except Exception as exc:  # noqa: BLE001
            failures.append((serebii_slug, "", f"slug: {exc}"))
            continue
        url = _endpoint(args.target, pokeapi_slug)
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.warning(
                "[%d/%d] %s ← FETCH FAIL (%s)", i, total, pokeapi_slug, exc,
            )
            failures.append((serebii_slug, pokeapi_slug, f"fetch: {exc}"))
            continue

        name = _extract_name(payload, pokeapi_lang)
        if not name:
            failures.append((serebii_slug, pokeapi_slug, f"no {pokeapi_lang} name"))
            continue

        result[serebii_slug] = name
        if i % 30 == 0 or i == total:
            log.info("[%d/%d] %s → %s (%s)", i, total, serebii_slug, name, pokeapi_slug)

    elapsed = time.monotonic() - started
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    log.info(
        "완료: %d/%d 성공, %d 실패, %.1fs 경과 → %s",
        len(result), total, len(failures), elapsed, out_path,
    )
    if failures:
        log.warning("실패 목록 (%d):", len(failures))
        for s, p, r in failures[:30]:
            log.warning("  %s (pokeapi=%s): %s", s, p, r)
        if len(failures) > 30:
            log.warning("  ... +%d more", len(failures) - 30)
    # 이름 수집은 부분 실패가 흔함 (Champions 신규는 PokeAPI 에 없음).
    # exit code 는 성공 0 으로 고정 — 검증은 별도 validate_names_i18n.py 에서.
    return 0


if __name__ == "__main__":
    sys.exit(main())

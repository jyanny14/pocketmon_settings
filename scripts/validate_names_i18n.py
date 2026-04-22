"""i18n 이름 필드 검증 스크립트.

`web/data/*.json` 에서 `nameJa` / `nameZh` 가 (a) 빈 문자열이거나
(b) `nameEn` 과 동일한 경우 "누락" 으로 플래그. 누락된 항목이
**Champions 신규** 에 해당하지 않으면 빌드 실패 (exit 1).

Champions 신규 판정:
  - abilities: `isNewInChampions == true`
  - items: `data/manual/item_names_ko.json` 의 키(= ko 도 수동 override 로 채웠다는 뜻).
    이 파일에 있는 slug 는 PokeAPI 에 없는 Champions 신규 메가스톤·도구로 본다.
  - pokemon / move: 자동 판정 어려움 — 누락이 있으면 그냥 경고로 나열.
    정말로 신규인 경우 `data/manual/*_names_{lang}.json` 에 직접 채워 넣으면 통과.

입력: web/data/pokemon.json · abilities.json · items.json · moves.json
출력: stdout 리포트 · exit 0/1

사용법:
    python scripts/validate_names_i18n.py --lang ja
    python scripts/validate_names_i18n.py --lang zh --strict
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from config import POKEAPI_LANG_CODES, PROJECT_ROOT

log = logging.getLogger("validate_names_i18n")


WEB_DATA = PROJECT_ROOT / "web" / "data"
MANUAL_DIR = PROJECT_ROOT / "data" / "manual"


def _is_missing(entry: dict, lang: str) -> bool:
    key = f"name{lang.capitalize()}"
    val = entry.get(key, "")
    if not val:
        return True
    # 영어 원문과 동일하면 PokeAPI 에서 해당 언어 값이 없어 폴백된 셈.
    # (단 실제로 그런 경우는 build 단계에서 ""로 두므로 이 체크는 안전망.)
    if val.strip().lower() == (entry.get("nameEn") or "").strip().lower():
        return True
    return False


def _load_champions_new_items() -> set[str]:
    """Champions 신규 아이템 — `item_names_ko.json` 에 수동 값이 있는 slug 들."""
    path = MANUAL_DIR / "item_names_ko.json"
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return {k for k in data.keys() if not k.startswith("_")}


def _load_manual_override(target: str, lang: str) -> set[str]:
    """해당 언어의 수동 override 파일에 값이 채워진 slug 집합."""
    path = MANUAL_DIR / f"{target}_names_{lang}.json"
    if not path.exists():
        return set()
    data = json.loads(path.read_text(encoding="utf-8"))
    return {k for k, v in data.items() if not k.startswith("_") and v}


def _check(target: str, entries: list[dict], lang: str, whitelist: set[str],
           manual_slugs: set[str]) -> tuple[list[dict], list[dict]]:
    """Returns (whitelisted_missing, unwhitelisted_missing)."""
    white: list[dict] = []
    unwhite: list[dict] = []
    for e in entries:
        slug = e["slug"]
        if not _is_missing(e, lang):
            continue
        # 수동으로 채운 항목이 여전히 missing 플래그되면 로직 문제 — 경고로만
        if slug in manual_slugs:
            continue
        if slug in whitelist:
            white.append(e)
        else:
            unwhite.append(e)
    return white, unwhite


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True, choices=sorted(POKEAPI_LANG_CODES.keys()),
                    help="검증할 언어 코드")
    ap.add_argument("--strict", action="store_true",
                    help="화이트리스트 밖 누락이 있으면 exit 1")
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    lang = args.lang
    if lang == "ko":
        log.info("ko 는 기존 파이프라인 전용 — 검증 대상 아님.")
        return 0

    pokemon = json.loads((WEB_DATA / "pokemon.json").read_text(encoding="utf-8"))
    abilities = json.loads((WEB_DATA / "abilities.json").read_text(encoding="utf-8"))
    items = json.loads((WEB_DATA / "items.json").read_text(encoding="utf-8"))
    moves = json.loads((WEB_DATA / "moves.json").read_text(encoding="utf-8"))

    # 화이트리스트: Champions 신규로 간주할 slug 집합
    new_ability_slugs = {a["slug"] for a in abilities if a.get("isNewInChampions")}
    new_item_slugs = _load_champions_new_items()

    total_unwhitelisted = 0
    total_whitelisted = 0

    checks = [
        ("pokemon", pokemon, set()),           # 포켓몬은 화이트리스트 없음
        ("ability", abilities, new_ability_slugs),
        ("item", items, new_item_slugs),
        ("move", moves, set()),                # 기술도 화이트리스트 없음
    ]

    log.info("=== i18n 이름 검증 — lang=%s ===", lang)
    for target, entries, whitelist in checks:
        manual_slugs = _load_manual_override(target, lang)
        white, unwhite = _check(target, entries, lang, whitelist, manual_slugs)
        total_whitelisted += len(white)
        total_unwhitelisted += len(unwhite)
        log.info(
            "%-8s  total=%-4d  missing=%-3d  (Champions-new=%d, 미확인=%d, manual=%d)",
            target, len(entries), len(white) + len(unwhite),
            len(white), len(unwhite), len(manual_slugs),
        )
        if unwhite:
            log.info("  미확인 누락 (manual override 필요):")
            for e in unwhite[:30]:
                log.info("    %s (nameEn=%s)", e["slug"], e.get("nameEn", ""))
            if len(unwhite) > 30:
                log.info("    ... +%d more", len(unwhite) - 30)

    log.info("---")
    log.info("합계: Champions-new=%d · 미확인=%d", total_whitelisted, total_unwhitelisted)

    if total_unwhitelisted > 0 and args.strict:
        log.error("--strict: 미확인 누락이 존재해 실패.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

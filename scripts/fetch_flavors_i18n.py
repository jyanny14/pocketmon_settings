"""PokeAPI 캐시에서 flavor_text 를 ja/zh 로 추출해 저장.

이름(names) 과 달리 flavor_text_entries 는 대부분 ko/ja/zh-hans/zh-hant 전부 수록돼
있어 PokeAPI 만으로 커버 가능. 현재 `fetch_ability_descriptions_ko.py` 가 ko 전용으로
같은 일을 하지만 여러 언어·여러 대상을 일반화한 버전이 이 스크립트.

대상과 매핑:
  - ability: flavor_text → gameText{Ja|Zh}  (짧은 게임 내 설명)
             effect_entries → description — ja/zh 없으므로 대상 아님 (LLM 번역 예정)
  - item:    flavor_text → effect{Ja|Zh}     (아이템은 effect 가 PokeAPI 에 없어 flavor 사용)
  - move:    flavor_text → flavorText{Ja|Zh}

입력:  data/raw/pokeapi.co/api_v2_{target}_*.json  (기존 캐시, force=False)
출력:  data/processed/{target}_{field}_{lang}.json  ({serebii_slug: text})

사용법:
    python scripts/fetch_flavors_i18n.py --target ability --field gameText --lang ja
    python scripts/fetch_flavors_i18n.py --target item --field effect --lang zh
    python scripts/fetch_flavors_i18n.py --target move --field flavorText --lang ja

    # 한 번에 전부 (6 조합):
    python scripts/fetch_flavors_i18n.py --all
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
from normalize import normalize_text

log = logging.getLogger("fetch_flavors_i18n")


POKEMON_JSON = PROJECT_ROOT / "web" / "data" / "pokemon.json"
ABILITIES_JSON = PROJECT_ROOT / "web" / "data" / "abilities.json"
ITEMS_JSON = PROJECT_ROOT / "web" / "data" / "items.json"
MOVES_JSON = PROJECT_ROOT / "web" / "data" / "moves.json"


ABILITY_SLUG_OVERRIDES: dict[str, str] = {
    "compoundeyes": "compound-eyes",
}


def _load_entries(target: str) -> list[dict]:
    path = {
        "ability": ABILITIES_JSON,
        "item": ITEMS_JSON,
        "move": MOVES_JSON,
    }[target]
    return json.loads(path.read_text(encoding="utf-8"))


def _pokeapi_slug(target: str, entry: dict) -> str:
    serebii_slug = entry["slug"]
    if target == "ability":
        if serebii_slug in ABILITY_SLUG_OVERRIDES:
            return ABILITY_SLUG_OVERRIDES[serebii_slug]
        return entry.get("nameEn", "").lower().replace(" ", "-").replace("'", "")
    if target == "item":
        return serebii_slug
    if target == "move":
        return entry.get("pokeapiSlug") or serebii_slug
    raise ValueError(target)


def _endpoint(target: str, pokeapi_slug: str) -> str:
    return f"{POKEAPI_BASE}/{target}/{pokeapi_slug}/"


def _pick_flavor(payload: dict, pokeapi_lang: str) -> str | None:
    # flavor_text_entries 는 게임 버전별로 여러 항목 존재. 해당 언어의 *마지막* 항목을
    # 최신으로 간주 (기존 fetch_ability_descriptions_ko 와 동일 규칙).
    # Note: `/ability/` + `/move/` 는 `flavor_text` 키, `/item/` 은 `text` 키를 쓴다.
    # 두 키 모두 시도.
    candidates: list[str] = []
    for e in payload.get("flavor_text_entries", []) or []:
        if (e.get("language") or {}).get("name") != pokeapi_lang:
            continue
        txt = e.get("flavor_text") or e.get("text") or ""
        if txt:
            candidates.append(txt)
    if not candidates:
        return None
    return normalize_text(candidates[-1])


def process(target: str, lang: str, force: bool) -> int:
    pokeapi_lang = POKEAPI_LANG_CODES[lang]
    entries = _load_entries(target)
    log.info("target=%s lang=%s(%s) — %d 건 처리", target, lang, pokeapi_lang, len(entries))

    result: dict[str, str] = {}
    failures: list[str] = []
    started = time.monotonic()

    for i, entry in enumerate(entries, 1):
        serebii_slug = entry["slug"]
        try:
            pokeapi_slug = _pokeapi_slug(target, entry)
        except Exception:
            failures.append(serebii_slug)
            continue
        url = _endpoint(target, pokeapi_slug)
        try:
            payload = fetch_json(url, force=force)
        except Exception as exc:  # noqa: BLE001
            log.warning("  [%d/%d] %s ← FETCH FAIL (%s)", i, len(entries), pokeapi_slug, exc)
            failures.append(serebii_slug)
            continue

        text = _pick_flavor(payload, pokeapi_lang)
        if not text:
            failures.append(serebii_slug)
            continue

        result[serebii_slug] = text
        if i % 60 == 0 or i == len(entries):
            log.info("  [%d/%d] %s → %s…",
                     i, len(entries), serebii_slug, text[:40])

    elapsed = time.monotonic() - started
    # 파일명은 어떤 도메인 필드에 적재될지가 드러나도록 `{field}_{lang}` 규칙을 사용.
    field = _target_to_field(target)
    out_path = (
        PROJECT_ROOT / "data" / "processed" / f"{target}_{field}_{lang}.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    log.info("  → %d/%d 채움, %d 실패, %.1fs · %s",
             len(result), len(entries), len(failures), elapsed, out_path)
    return 0


def _target_to_field(target: str) -> str:
    # ability.gameText / item.effect / move.flavorText 로 각각 매핑.
    return {
        "ability": "gameText",
        "item": "effect",
        "move": "flavorText",
    }[target]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["ability", "item", "move"],
                    help="대상. --all 이면 생략")
    ap.add_argument("--lang", choices=["ja", "zh"],
                    help="언어. --all 이면 생략")
    ap.add_argument("--all", action="store_true",
                    help="3 target × 2 lang 전부 실행")
    ap.add_argument("--force", action="store_true", help="PokeAPI 캐시 무시")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    if args.all:
        pairs = [(t, l) for t in ("ability", "item", "move") for l in ("ja", "zh")]
    else:
        if not args.target or not args.lang:
            ap.error("--target and --lang required unless --all")
        pairs = [(args.target, args.lang)]

    for target, lang in pairs:
        process(target, lang, args.force)
    return 0


if __name__ == "__main__":
    sys.exit(main())

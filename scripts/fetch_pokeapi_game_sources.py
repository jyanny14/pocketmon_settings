"""PokeAPI `pokemon-species/{slug}/` 에서 HOME 연동 게임 소스 수집.

목적: "유저가 HOME 을 통해 Champions 로 이 포켓몬을 옮겨오려면 어느 게임을
플레이하면 되는가"를 AI 추천 엔진이 활용할 수 있도록 pokemon.json 에 주입.

전략 (2026-04-17 변경):
  초기에는 `pokemon/{slug}.game_indices` 를 사용하려 했으나, 이 필드는
  Gen 6+ 게임(Sword/Shield, SV 등)을 거의 채우지 않는 것으로 확인됨.
  따라서 `pokemon-species/{slug}.pokedex_numbers` 의 지역 도감 엔트리를
  게임으로 역매핑한다.

pokedex → HOME 직접 연동 게임 매핑:
    letsgo-kanto                                    → lets-go-pikachu, lets-go-eevee
    galar, isle-of-armor, crown-tundra              → sword, shield
    hisui                                           → legends-arceus
    paldea, kitakami, blueberry                     → scarlet, violet
    original-sinnoh, extended-sinnoh                → brilliant-diamond, shining-pearl

form 별 규칙 (species 호출 결과를 기반으로 form 타입별 가공):
    - Base form, 특수폼(Blade/Midnight/Dusk/Hero/Female/Variety/Alternate):
      species 결과 그대로
    - Mega: base form 과 동일 (메가진화는 Champions 내 기능이므로)
    - Regional prefix:
        Alolan  → [] (HOME 직접 연동 불가 — Bank 경유는 T12 후속)
        Galarian → [sword, shield]
        Hisuian  → [legends-arceus]
        Paldean  → [scarlet, violet]

입력:  web/data/pokemon.json
출력:  data/processed/pokemon_game_sources.json
       { base_slug: { form_name_en: [game_slug, ...] } }

사용법:
    python scripts/fetch_pokeapi_game_sources.py             # 전체 (~40초)
    python scripts/fetch_pokeapi_game_sources.py --limit 10  # dry-run
    python scripts/fetch_pokeapi_game_sources.py --force     # 캐시 무시
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

from config import POKEAPI_BASE, PROJECT_ROOT
from fetcher import fetch_json

log = logging.getLogger("fetch_pokeapi_game_sources")

POKEMON_JSON = PROJECT_ROOT / "web" / "data" / "pokemon.json"
OUT_PATH = PROJECT_ROOT / "data" / "processed" / "pokemon_game_sources.json"

# 지역 도감 이름 → HOME 직접 연동 게임 slug 리스트.
POKEDEX_TO_GAMES: dict[str, list[str]] = {
    "letsgo-kanto": ["lets-go-eevee", "lets-go-pikachu"],
    "galar": ["shield", "sword"],
    "isle-of-armor": ["shield", "sword"],
    "crown-tundra": ["shield", "sword"],
    "hisui": ["legends-arceus"],
    "paldea": ["scarlet", "violet"],
    "kitakami": ["scarlet", "violet"],
    "blueberry": ["scarlet", "violet"],
    "original-sinnoh": ["brilliant-diamond", "shining-pearl"],
    "extended-sinnoh": ["brilliant-diamond", "shining-pearl"],
}

# Regional form prefix → form 자체가 해당 지역 게임에서만 등장.
REGIONAL_FORM_GAMES: dict[str, list[str]] = {
    "Alolan ": [],  # SM/USUM 은 HOME 직접 연동 아님 (T12)
    "Galarian ": ["shield", "sword"],
    "Hisuian ": ["legends-arceus"],
    "Paldean ": ["scarlet", "violet"],
}


def species_slug(base_slug: str) -> str:
    # PokeAPI species URL 은 점(.) 을 허용하지 않음 (mr.rime → mr-rime)
    return base_slug.replace(".", "-")


def extract_games_from_species(payload: dict) -> list[str]:
    games: set[str] = set()
    for entry in payload.get("pokedex_numbers", []) or []:
        name = (entry.get("pokedex") or {}).get("name")
        if name in POKEDEX_TO_GAMES:
            games.update(POKEDEX_TO_GAMES[name])
    return sorted(games)


def games_for_form(
    form_name: str,
    base_name_en: str,
    base_games: list[str],
) -> list[str]:
    if not form_name or form_name == base_name_en:
        return list(base_games)
    for prefix, games in REGIONAL_FORM_GAMES.items():
        if form_name.startswith(prefix):
            return list(games)
    # Mega / 특수폼 (Blade/Midnight/Dusk/Hero/Female/Variety/Alternate) → base 동일
    return list(base_games)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="처음 N개 포켓몬만")
    ap.add_argument("--force", action="store_true", help="PokeAPI 캐시 무시")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    pokemon = json.loads(POKEMON_JSON.read_text(encoding="utf-8"))
    if args.limit:
        pokemon = pokemon[: args.limit]
    total = len(pokemon)
    log.info("포켓몬 %d종(species) 처리 시작", total)

    result: dict[str, dict[str, list[str]]] = {}
    failures: list[tuple[str, str]] = []
    started = time.monotonic()

    for i, p in enumerate(pokemon, 1):
        slug = p["slug"]
        sp_slug = species_slug(slug)
        url = f"{POKEAPI_BASE}/pokemon-species/{sp_slug}/"
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            log.warning("[%d/%d] %s FETCH FAIL (%s)", i, total, sp_slug, exc)
            failures.append((slug, f"fetch: {exc}"))
            continue

        base_games = extract_games_from_species(payload)
        form_map: dict[str, list[str]] = {}
        for form in p.get("forms", []):
            form_map[form["name"]] = games_for_form(
                form["name"], p["nameEn"], base_games
            )
        result[slug] = form_map

        if i % 30 == 0 or i == total:
            log.info("[%d/%d] %s → base=%s", i, total, slug, base_games)

    elapsed = time.monotonic() - started
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    log.info(
        "완료: %d/%d species, %d 실패, %.1fs 경과 → %s",
        len(result), total, len(failures), elapsed, OUT_PATH,
    )
    if failures:
        log.warning("실패 목록:")
        for slug, reason in failures:
            log.warning("  %s: %s", slug, reason)
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())

"""Build web/data/*.json from cached HTML. No network calls.

The output goes directly under web/ so that deploying the web directory
alone (GitHub Pages, Netlify, etc.) yields a fully working static site.

Produces:
    web/data/pokemon.json    list of Pokemon with name/types/stats/abilities/obtain/forms
    web/data/items.json      Hold Items / Mega Stones / Berries with local iconPath
    web/data/abilities.json  ability descriptions + reverse index (holders)

Run prerequisites:
    python scripts/fetch_pokemon_details.py
    python scripts/fetch_abilities.py
    python scripts/fetch_sprites.py
    python scripts/fetch_items_listing.py
    python scripts/fetch_item_icons.py

Usage:
    python scripts/build.py
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import logging
import sys
from pathlib import Path

SCHEMA_VERSION = "1.0.0"

SOURCE_URLS = {
    "serebii_champions": "https://www.serebii.net/pokemonchampions/",
    "pokeapi": "https://pokeapi.co/api/v2",
    "pokeapi_sprites": "https://github.com/PokeAPI/sprites",
}

from config import PROJECT_ROOT, RAW_DIR
from form_ko import form_name_to_ko
from normalize import normalize_text as N
from parser import (
    parse_ability_detail,
    parse_gift_pokemon,
    parse_items_listing,
    parse_pokemon_detail,
    parse_pokemon_list,
    parse_transfer_only,
)
from pokeapi_form_map import form_to_pokeapi_slug


log = logging.getLogger("build")

WEB_DIR = PROJECT_ROOT / "web"
DIST_DIR = WEB_DIR / "data"
SEREBII_DIR = RAW_DIR / "www.serebii.net"
SPRITES_REL = "assets/sprites"  # relative to web/
FORM_SPRITES_REL = "assets/sprites/forms"
ITEMS_REL = "assets/items"      # relative to web/

# Mapping {serebii_slug: nameKo} produced by scripts/fetch_ability_names_ko.py
ABILITY_NAMES_KO_PATH = PROJECT_ROOT / "data" / "processed" / "ability_names_ko.json"
# Optional manual overrides (same shape). Wins over the fetched mapping.
ABILITY_NAMES_KO_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "ability_names_ko.json"

# {slug: nameKo} produced by scripts/fetch_item_names_ko.py + manual override
ITEM_NAMES_KO_PATH = PROJECT_ROOT / "data" / "processed" / "item_names_ko.json"
ITEM_NAMES_KO_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "item_names_ko.json"

# {slug: effectKo} — manual Korean translations of item effect text. No automated
# source: PokeAPI has per-item flavor text but not complete Korean item "effect".
ITEM_EFFECTS_KO_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "item_effects_ko.json"

# {slug: {gameTextKo?, descriptionKo?}} — fetch_ability_descriptions_ko.py
ABILITY_DESC_KO_PATH = PROJECT_ROOT / "data" / "processed" / "ability_descriptions_ko.json"
# Optional manual overrides (same shape). Manual values win per-field.
ABILITY_DESC_KO_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "ability_descriptions_ko.json"

# Champions-only new abilities list (from newabilities.shtml)
NEW_ABILITIES_PATH = PROJECT_ROOT / "data" / "processed" / "new_abilities.json"

# {base_slug: {form_name_en: [game_slug...]}} produced by
# scripts/fetch_pokeapi_game_sources.py
GAME_SOURCES_PATH = PROJECT_ROOT / "data" / "processed" / "pokemon_game_sources.json"
# Optional manual overrides (same shape).
# Values there replace PokeAPI-derived values entirely.
GAME_SOURCES_OVERRIDE_PATH = PROJECT_ROOT / "data" / "manual" / "game_sources_override.json"


def _load_string_map(*paths: Path) -> dict[str, str]:
    merged: dict[str, str] = {}
    for path in paths:
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            log.warning("read failed (%s): %s", path, exc)
            continue
        if isinstance(data, dict):
            merged.update(
                {k: v for k, v in data.items() if v and not k.startswith("_")}
            )
    return merged


def _load_ability_names_ko() -> dict[str, str]:
    return _load_string_map(ABILITY_NAMES_KO_PATH, ABILITY_NAMES_KO_OVERRIDE_PATH)


def _load_item_names_ko() -> dict[str, str]:
    return _load_string_map(ITEM_NAMES_KO_PATH, ITEM_NAMES_KO_OVERRIDE_PATH)


def _load_item_effects_ko() -> dict[str, str]:
    return _load_string_map(ITEM_EFFECTS_KO_OVERRIDE_PATH)


def _load_ability_descriptions_ko() -> dict[str, dict[str, str]]:
    merged: dict[str, dict[str, str]] = {}
    for path in (ABILITY_DESC_KO_PATH, ABILITY_DESC_KO_OVERRIDE_PATH):
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            log.warning("ability descriptions read failed (%s): %s", path, exc)
            continue
        if not isinstance(data, dict):
            continue
        for slug, entry in data.items():
            if slug.startswith("_") or not isinstance(entry, dict):
                continue
            bucket = merged.setdefault(slug, {})
            bucket.update({k: v for k, v in entry.items() if v})
    return merged


def _load_game_sources() -> dict[str, dict[str, list[str]]]:
    """Load PokeAPI-derived + manual-override game source mappings.

    Shape: {base_slug: {form_name_en: [game_slug, ...]}}.
    Override values replace the PokeAPI list wholesale (per-form).
    """
    merged: dict[str, dict[str, list[str]]] = {}
    for path in (GAME_SOURCES_PATH, GAME_SOURCES_OVERRIDE_PATH):
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            log.warning("game sources read failed (%s): %s", path, exc)
            continue
        if not isinstance(data, dict):
            continue
        for slug, forms in data.items():
            if slug.startswith("_") or not isinstance(forms, dict):
                continue
            bucket = merged.setdefault(slug, {})
            for name, games in forms.items():
                if not isinstance(games, list):
                    continue
                bucket[name] = sorted(set(str(g) for g in games))
    return merged


def _read(pattern: str) -> str | None:
    matches = sorted(SEREBII_DIR.glob(pattern))
    return matches[0].read_text(encoding="utf-8") if matches else None


def _slug_from_detail_file(stem: str) -> str:
    parts = stem.split("_")
    return "_".join(parts[1:-1]) if len(parts) >= 3 else ""


def build_pokemon(obtain_index: dict[str, list[str]]) -> list[dict]:
    """Merge detail pages into a single list."""
    game_sources = _load_game_sources()
    results: list[dict] = []
    for html_file in sorted(SEREBII_DIR.glob("pokedex-champions_*.html")):
        slug = _slug_from_detail_file(html_file.stem)
        if not slug:
            continue
        try:
            d = parse_pokemon_detail(html_file.read_text(encoding="utf-8"), slug)
        except Exception as exc:  # noqa: BLE001
            log.warning("skip %s: %s", slug, exc)
            continue

        dex_trim = d.national_dex.lstrip("0") or "0"
        sprite_rel = f"{SPRITES_REL}/{dex_trim}.png"
        sprite_exists = (PROJECT_ROOT / "web" / sprite_rel).exists()

        sources_for_slug = game_sources.get(d.slug, {})
        base_name_ko = N(d.name_ko)
        base_name_en = N(d.name_en)
        form_payload = []
        for fm in d.forms:
            # Pick a sprite file:
            #  - base form reuses assets/sprites/{dex}.png (already served)
            #  - variant forms use assets/sprites/forms/{pokeapi_slug}.png
            #    if present; fall back to base sprite, then "".
            if fm.name == d.name_en:
                form_sprite = sprite_rel if sprite_exists else ""
            else:
                pa_slug = form_to_pokeapi_slug(d.slug, d.name_en, fm.name)
                candidate_rel = (
                    f"{FORM_SPRITES_REL}/{pa_slug}.png" if pa_slug else ""
                )
                candidate_abs = (
                    PROJECT_ROOT / "web" / candidate_rel if candidate_rel else None
                )
                if candidate_abs and candidate_abs.exists():
                    form_sprite = candidate_rel
                else:
                    form_sprite = sprite_rel if sprite_exists else ""
            form_payload.append({
                "name": N(fm.name),
                "nameKo": N(form_name_to_ko(fm.name, base_name_ko, base_name_en)),
                "types": fm.types,
                "abilities": [a.slug for a in fm.abilities],
                "baseStats": fm.base_stats,
                "sourceGames": sources_for_slug.get(fm.name, []),
                "spritePath": form_sprite,
            })

        results.append({
            "number": d.national_dex,
            "slug": d.slug,
            "nameEn": base_name_en,
            "nameKo": base_name_ko,
            "types": d.types,
            "abilities": [a.slug for a in d.abilities],
            "baseStats": d.base_stats,
            "forms": form_payload,
            "obtain": sorted(obtain_index.get(d.slug, [])) or ["recruit"],
            "spritePath": sprite_rel if sprite_exists else "",
            "moves": list(d.moves),
        })
    results.sort(key=lambda p: (p["number"], p["slug"]))
    return results


def build_obtain_index() -> dict[str, list[str]]:
    """slug → list of obtain sources based on transfer/gift/recruit pages."""
    index: dict[str, set[str]] = {}

    # Recruit list (main pokemon.shtml lists recruit-capable pokemon)
    list_html = _read("pokemonchampions_pokemon.shtml_*.html")
    if list_html:
        for p in parse_pokemon_list(list_html):
            if p.slug:
                index.setdefault(p.slug, set()).add("recruit")

    transfer_html = _read("pokemonchampions_transferonly.shtml_*.html")
    if transfer_html:
        for p in parse_transfer_only(transfer_html):
            if p.slug:
                # transfer-only: drop the recruit default
                index.setdefault(p.slug, set()).discard("recruit")
                index.setdefault(p.slug, set()).add("transfer")

    gift_html = _read("pokemonchampions_giftpokemon.shtml_*.html")
    if gift_html:
        for g in parse_gift_pokemon(gift_html):
            slug = g.name.lower().replace(" ", "-")
            index.setdefault(slug, set()).add("gift")

    return {k: sorted(v) for k, v in index.items()}


def _item_slug(name: str) -> str:
    return name.lower().replace(" ", "-").replace("'", "").replace(".", "")


def build_items() -> list[dict]:
    html = _read("pokemonchampions_items.shtml_*.html")
    if not html:
        return []
    items = parse_items_listing(html)
    names_ko = _load_item_names_ko()
    effects_ko = _load_item_effects_ko()
    results: list[dict] = []
    for it in items:
        slug = _item_slug(it.name)
        icon_rel = f"{ITEMS_REL}/{slug}.png"
        icon_exists = (WEB_DIR / icon_rel).exists()
        results.append({
            "slug": slug,
            "nameEn": N(it.name),
            "nameKo": N(names_ko.get(slug, "")),
            "effect": N(it.effect),
            "effectKo": N(effects_ko.get(slug, "")),
            "location": N(it.location),
            "iconPath": icon_rel if icon_exists else "",
            "category": it.category,
        })
    # Stable ordering: by category, then name
    cat_order = {"held": 0, "mega-stone": 1, "berry": 2}
    results.sort(key=lambda r: (cat_order.get(r["category"], 99), r["nameEn"]))
    return results


def build_abilities(pokemon: list[dict]) -> list[dict]:
    """Combine abilitydex pages with reverse {slug, form} holder index."""
    holders: dict[str, list[dict]] = {}
    seen: dict[str, set[tuple[str, str]]] = {}
    for p in pokemon:
        for form in p.get("forms", []):
            for ab_slug in form["abilities"]:
                key = (p["slug"], form["name"])
                if key in seen.setdefault(ab_slug, set()):
                    continue
                seen[ab_slug].add(key)
                holders.setdefault(ab_slug, []).append(
                    {"slug": p["slug"], "form": form["name"]}
                )

    # stable ordering: by pokemon slug, then form name
    for lst in holders.values():
        lst.sort(key=lambda h: (h["slug"], h["form"]))

    names_ko = _load_ability_names_ko()
    desc_ko = _load_ability_descriptions_ko()
    new_ability_slugs: set[str] = set()
    if NEW_ABILITIES_PATH.exists():
        try:
            new_data = json.loads(NEW_ABILITIES_PATH.read_text(encoding="utf-8"))
            new_ability_slugs = {e["slug"] for e in new_data if isinstance(e, dict)}
        except Exception as exc:  # noqa: BLE001
            log.warning("new_abilities read failed: %s", exc)

    results: list[dict] = []
    for html_file in sorted(SEREBII_DIR.glob("abilitydex_*.html")):
        stem = html_file.stem  # abilitydex_blaze.shtml_<hash>
        parts = stem.split("_")
        if len(parts) < 3:
            continue
        slug = "_".join(parts[1:-1]).removesuffix(".shtml")
        try:
            d = parse_ability_detail(html_file.read_text(encoding="utf-8"), slug)
        except Exception as exc:  # noqa: BLE001
            log.warning("skip ability %s: %s", slug, exc)
            continue
        ko_fields = desc_ko.get(d.slug, {})
        results.append({
            "slug": d.slug,
            "nameEn": N(d.name_en),
            "nameKo": N(names_ko.get(d.slug, "")),
            "description": N(d.in_depth),
            "descriptionKo": N(ko_fields.get("descriptionKo", "")),
            "gameText": N(d.game_text),
            "gameTextKo": N(ko_fields.get("gameTextKo", "")),
            "isNewInChampions": d.slug in new_ability_slugs,
            "pokemon": holders.get(d.slug, []),
        })
    results.sort(key=lambda a: a["slug"])
    return results


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    DIST_DIR.mkdir(parents=True, exist_ok=True)

    obtain = build_obtain_index()
    pokemon = build_pokemon(obtain)
    items = build_items()
    abilities = build_abilities(pokemon)

    (DIST_DIR / "pokemon.json").write_text(
        json.dumps(pokemon, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DIST_DIR / "items.json").write_text(
        json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (DIST_DIR / "abilities.json").write_text(
        json.dumps(abilities, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    write_manifest(pokemon, items, abilities)

    log.info(
        "built %d pokemon, %d items, %d abilities → %s",
        len(pokemon), len(items), len(abilities), DIST_DIR,
    )
    return 0


def _file_entry(name: str, count: int) -> dict:
    path_rel = f"{name}.json"
    blob = (DIST_DIR / path_rel).read_bytes()
    return {
        "name": name,
        "path": path_rel,
        "count": count,
        "sha256": hashlib.sha256(blob).hexdigest(),
    }


def write_manifest(
    pokemon: list[dict],
    items: list[dict],
    abilities: list[dict],
) -> None:
    files = [
        _file_entry("pokemon", len(pokemon)),
        _file_entry("items", len(items)),
        _file_entry("abilities", len(abilities)),
    ]
    # type_chart.json is generated by a separate script — include if present.
    type_chart_path = DIST_DIR / "type_chart.json"
    if type_chart_path.exists():
        try:
            data = json.loads(type_chart_path.read_text(encoding="utf-8"))
            types_count = len(data.get("types", []))
        except Exception:  # noqa: BLE001
            types_count = 0
        files.append(_file_entry("type_chart", types_count))

    # moves.json is generated by build_moves.py — include if present.
    moves_path = DIST_DIR / "moves.json"
    if moves_path.exists():
        try:
            moves_data = json.loads(moves_path.read_text(encoding="utf-8"))
            moves_count = len(moves_data) if isinstance(moves_data, list) else 0
        except Exception:  # noqa: BLE001
            moves_count = 0
        files.append(_file_entry("moves", moves_count))

    # Note: corpus.json is a bundle OF the files above (produced by
    # scripts/build_corpus.py) and intentionally excluded from the manifest
    # to keep this manifest the single source of truth for per-file hashes.

    payload = {
        "generatedAt": _dt.datetime.now(_dt.timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        ),
        "schemaVersion": SCHEMA_VERSION,
        "sources": SOURCE_URLS,
        "files": files,
    }
    (DIST_DIR / "manifest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    sys.exit(main())

"""serebii 폼 이름 → PokeAPI 포켓몬 slug 매핑.

PokeAPI의 `pokemon/{slug}` 엔트리는 폼별로 쪼개져 있는데
slug 규칙이 serebii 표기와 다르다. 이 모듈은 둘 사이의 변환을 담당한다.

자동 규칙 (prefix를 suffix로 이동):
    Mega <Base>              → <base>-mega
    Mega <Base> X|Y          → <base>-mega-x | <base>-mega-y
    Alolan <Base>            → <base>-alola
    Galarian <Base>          → <base>-galar
    Hisuian <Base>           → <base>-hisui
    Paldean <Base>           → <base>-paldea

특수폼 (자동 규칙 미적용) 은 _SUFFIX_TO_POKEAPI 에서 직접 매핑.
Tauros Paldean, Rotom Alternate Forms 처럼 PokeAPI에서 여러 엔트리로
쪼개진 경우는 대표 1건만 등록 (게임 소스는 같으므로 충분).
"""
from __future__ import annotations

from typing import Optional


# serebii form suffix (prefix 제거 후 남는 꼬리표) → PokeAPI slug suffix
# "{base}" placeholder 는 베이스 슬러그로 치환된다.
_SPECIAL_FORM: dict[str, str] = {
    "Blade Forme": "{base}-blade",
    "Midnight Form": "{base}-midnight",
    "Dusk Form": "{base}-dusk",
    "Hero Form": "{base}-hero",
    "Female": "{base}-female",
    "Small Variety": "{base}-small",
    "Large Variety": "{base}-large",
    "Jumbo Variety": "{base}-super",
}

_PREFIX_TO_SUFFIX = {
    "Alolan": "alola",
    "Galarian": "galar",
    "Hisuian": "hisui",
    "Paldean": "paldea",
}

# (base_slug, serebii_form_name) → PokeAPI slug 수동 매핑.
# 자동 규칙으로 풀리지 않는 케이스를 여기서 직접 지정. 최우선.
# - Paldean Tauros: PokeAPI 는 combat/blaze/aqua 세 breed 로 쪼개져 있으나
#   HOME 게임 소스는 동일하므로 combat-breed 를 대표로 사용.
# - Rotom 가전 5종: parser.py 에서 "Alternate Forms" 를 5개로 분해하므로
#   각각 별도 매핑. PokeAPI slug 가 정확히 이렇게 존재함.
_OVERRIDES: dict[tuple[str, str], str] = {
    ("tauros", "Paldean Tauros"): "tauros-paldea-combat-breed",
    ("rotom", "Heat Rotom"): "rotom-heat",
    ("rotom", "Wash Rotom"): "rotom-wash",
    ("rotom", "Frost Rotom"): "rotom-frost",
    ("rotom", "Fan Rotom"): "rotom-fan",
    ("rotom", "Mow Rotom"): "rotom-mow",
}

# PokeAPI 가 base form 자체도 variant slug 로만 제공하는 포켓몬.
# 여기 있는 base slug 는 그 자체로 존재하지 않으므로 기본 variant 슬러그로
# 치환한다. HEAD 요청으로 확인된 슬러그만 등록.
_BASE_FORM_ALIASES: dict[str, str] = {
    "aegislash": "aegislash-shield",
    "basculegion": "basculegion-male",
    "gourgeist": "gourgeist-average",
    "lycanroc": "lycanroc-midday",
    "maushold": "maushold-family-of-four",
    "meowstic": "meowstic-male",
    "mimikyu": "mimikyu-disguised",
    "morpeko": "morpeko-full-belly",
    "mr.rime": "mr-rime",
    "palafin": "palafin-zero",
}


def form_to_pokeapi_slug(
    base_slug: str,
    base_name_en: str,
    form_name_en: str,
) -> Optional[str]:
    """Convert (base slug, base English name, form English name) → PokeAPI slug.

    Returns None if mapping cannot be determined. Callers may fall back to the
    base slug in that case (since HOME game availability usually mirrors the
    base form anyway).
    """
    form = (form_name_en or "").strip()
    if not form:
        return _BASE_FORM_ALIASES.get(base_slug, base_slug)

    # Explicit override (highest priority — wins over base-form match)
    if (base_slug, form) in _OVERRIDES:
        return _OVERRIDES[(base_slug, form)]

    # Base form itself — may need an alias if PokeAPI has no bare entry
    if base_name_en and form == base_name_en:
        return _BASE_FORM_ALIASES.get(base_slug, base_slug)

    # Mega — with optional X/Y tag
    if form.startswith("Mega "):
        rem = form[len("Mega "):]
        if base_name_en and rem == base_name_en:
            return f"{base_slug}-mega"
        if base_name_en and rem.startswith(base_name_en + " "):
            tag = rem[len(base_name_en) + 1:].strip().lower()
            return f"{base_slug}-mega-{tag}" if tag else f"{base_slug}-mega"
        return None

    # Regional prefixes (Alolan / Galarian / Hisuian / Paldean)
    for prefix, suffix in _PREFIX_TO_SUFFIX.items():
        head = f"{prefix} "
        if form.startswith(head):
            return f"{base_slug}-{suffix}"

    # Special-form suffix (Blade Forme / Midnight Form / Small Variety / ...)
    if form in _SPECIAL_FORM:
        return _SPECIAL_FORM[form].format(base=base_slug)

    return None

"""Form name Korean synthesis.

Pure pattern composition — no PokeAPI dependency.
PokeAPI `pokemon-form/{slug}` Korean data is incomplete
(Hisuian/Galarian/Paldean/Hero/Female variants frequently missing,
and Mega uses glued form `메가리자몽X` rather than the project's
spaced convention `메가 리자몽 X`). So we synthesize here.

Usage:
    from form_ko import form_name_to_ko
    form_name_to_ko("Mega Charizard X", "리자몽")  # "메가 리자몽 X"
    form_name_to_ko("Alolan Raichu",    "라이츄")  # "알로라 라이츄"
    form_name_to_ko("Blade Forme",      "킬가르도")  # "킬가르도 블레이드폼"
"""
from __future__ import annotations

import re


# Prefix: applied to the base Korean name with a space.
# Order matters only for display reasoning; matching is exact.
_PREFIX_KO = {
    "Mega": "메가",
    "Alolan": "알로라",
    "Galarian": "가라르",
    "Hisuian": "히스이",
    "Paldean": "팔데아",
    "Eternal": "영원의 꽃",  # Floette only (Eternal Flower form)
}

# Pure suffix / special-form names (where the form_name does NOT repeat the
# base English name). These render as `{nameKo} {korean_suffix}`.
_SUFFIX_KO = {
    "Blade Forme": "블레이드폼",
    "Midnight Form": "한밤중의 모습",
    "Dusk Form": "황혼의 모습",
    "Hero Form": "영웅의 모습",
    "Female": "(암컷)",
    "Small Variety": "(S 사이즈)",
    "Large Variety": "(L 사이즈)",
    "Jumbo Variety": "(특대 사이즈)",
    "Alternate Forms": "다른 폼",
}


def form_name_to_ko(form_name_en: str, base_name_ko: str, base_name_en: str = "") -> str:
    """Synthesize Korean form name from English form name + base Korean name.

    Rules (checked in order):
    1. If form_name == base English name → base nameKo unchanged.
    2. Pure suffix form (exact match in _SUFFIX_KO) → `{nameKo} {suffix}`.
    3. Prefix + base English name → `{prefix_ko} {nameKo}` (plus optional
       trailing tag like ` X` / ` Y` for Mega Charizard X/Y).
    4. Fallback: return form_name_en unchanged (visible signal for missed cases).
    """
    form = (form_name_en or "").strip()
    if not form:
        return base_name_ko

    # Base form
    if base_name_en and form == base_name_en:
        return base_name_ko

    # Pure suffix / special forms
    if form in _SUFFIX_KO:
        return f"{base_name_ko} {_SUFFIX_KO[form]}"

    # Prefix + base + optional trailing tag
    for prefix_en, prefix_ko in _PREFIX_KO.items():
        head = f"{prefix_en} "
        if not form.startswith(head):
            continue
        remainder = form[len(head):]
        # Expect `<BaseEn>` or `<BaseEn> X` / `<BaseEn> Y` (Mega Charizard X/Y)
        if base_name_en and remainder == base_name_en:
            return f"{prefix_ko} {base_name_ko}"
        if base_name_en and remainder.startswith(base_name_en + " "):
            tag = remainder[len(base_name_en) + 1:].strip()
            if re.fullmatch(r"[A-Z]", tag):
                return f"{prefix_ko} {base_name_ko} {tag}"
            return f"{prefix_ko} {base_name_ko} {tag}"
        # base_name_en unknown — best effort: strip prefix only
        return f"{prefix_ko} {base_name_ko}"

    return form

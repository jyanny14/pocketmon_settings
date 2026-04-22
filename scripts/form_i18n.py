"""Form name i18n synthesis for ja / zh.

`form_ko.py` 의 다국어 확장판. 메가·지역·특수 폼 이름을 각 언어로 합성한다.
PokeAPI `pokemon-form/{slug}` ja/zh 가 비어 있는 경우가 많아 패턴 합성이 더 안정적.

이름(고유 명사) 자체는 PokeAPI 공식 값이고, **접두어·접미어만 언어별 공식 표기**
(예: メガ·알로라·超级) 를 적용한다. 임의 번역이 아니라 게임 내에서 실제로
그렇게 불리는 패턴을 그대로 사용.

사용법:
    from form_i18n import form_name_to_ja, form_name_to_zh
    form_name_to_ja("Mega Charizard X", "リザードン")  # "メガリザードンX"
    form_name_to_zh("Alolan Raichu",    "雷丘")         # "阿罗拉 雷丘"
"""
from __future__ import annotations

import re


# ── 일본어 (ja) ─────────────────────────────────────────────────

# 일본어는 "メガフシギバナ" 처럼 공백 없이 붙이는 공식 표기 관행.
_PREFIX_JA = {
    "Mega": "メガ",
    "Alolan": "アローラ",     # e.g. アローラライチュウ
    "Galarian": "ガラル",     # e.g. ガラルヤドキング
    "Hisuian": "ヒスイ",       # e.g. ヒスイウインディ
    "Paldean": "パルデア",
    "Eternal": "永遠の花",   # Floette Eternal Flower Forme
}

_SUFFIX_JA = {
    "Blade Forme": "ブレードフォルム",
    "Midnight Form": "まよなかのすがた",
    "Dusk Form": "たそがれのすがた",
    "Hero Form": "えいゆうのすがた",
    "Female": "(メス)",
    "Small Variety": "(Sサイズ)",
    "Large Variety": "(Lサイズ)",
    "Jumbo Variety": "(とくだいサイズ)",
    "Alternate Forms": "別のすがた",
}

_FULL_NAME_JA = {
    "Heat Rotom": "ヒートロトム",
    "Wash Rotom": "ウォッシュロトム",
    "Frost Rotom": "フロストロトム",
    "Fan Rotom": "スピンロトム",
    "Mow Rotom": "カットロトム",
}


# ── 중국어 간체 (zh) ───────────────────────────────────────────

# 중국어 간체는 "超级妙蛙花" 처럼 접두어 + 이름 (공백 있/없음 혼재, 공식은
# 보통 공백 없음). Bulbapedia zh 및 공식 포털 표기를 따른다.
_PREFIX_ZH = {
    "Mega": "超级",            # 超级喷火龙 · 超级妙蛙花
    "Alolan": "阿罗拉",        # 阿罗拉雷丘 (공식 한자어 표기)
    "Galarian": "伽勒尔",
    "Hisuian": "洗翠",
    "Paldean": "帕底亚",
    "Eternal": "永恒之花",
}

_SUFFIX_ZH = {
    "Blade Forme": "利刃形态",
    "Midnight Form": "黄昏之姿",   # Lycanroc 한밤중
    "Dusk Form": "黎明之姿",
    "Hero Form": "英雄之姿",
    "Female": "(母)",
    "Small Variety": "(小)",
    "Large Variety": "(大)",
    "Jumbo Variety": "(特大)",
    "Alternate Forms": "其他形态",
}

_FULL_NAME_ZH = {
    "Heat Rotom": "加热洛托姆",
    "Wash Rotom": "清洗洛托姆",
    "Frost Rotom": "结冰洛托姆",
    "Fan Rotom": "旋转洛托姆",
    "Mow Rotom": "切割洛托姆",
}


def _synthesize(
    form_name_en: str,
    base_name: str,
    base_name_en: str,
    prefixes: dict[str, str],
    suffixes: dict[str, str],
    full_names: dict[str, str],
    prefix_joiner: str = "",
    suffix_joiner: str = " ",
) -> str:
    """공통 합성 로직. 언어별 구두점/조인만 파라미터로 차이."""
    form = (form_name_en or "").strip()
    if not form or not base_name:
        return base_name or form

    if form in full_names:
        return full_names[form]

    if base_name_en and form == base_name_en:
        return base_name

    if form in suffixes:
        return f"{base_name}{suffix_joiner}{suffixes[form]}"

    for prefix_en, prefix_native in prefixes.items():
        head = f"{prefix_en} "
        if not form.startswith(head):
            continue
        remainder = form[len(head):]
        if base_name_en and remainder == base_name_en:
            return f"{prefix_native}{prefix_joiner}{base_name}"
        if base_name_en and remainder.startswith(base_name_en + " "):
            tag = remainder[len(base_name_en) + 1:].strip()
            if re.fullmatch(r"[A-Z]", tag):
                return f"{prefix_native}{prefix_joiner}{base_name}{tag}"
            return f"{prefix_native}{prefix_joiner}{base_name} {tag}"
        return f"{prefix_native}{prefix_joiner}{base_name}"

    # 알 수 없는 패턴 — 영어 원문 반환 (눈에 띄게)
    return form


def form_name_to_ja(form_name_en: str, base_name_ja: str, base_name_en: str = "") -> str:
    """일본어는 접두·접미 모두 공백 없이 붙임 (공식 표기 관행)."""
    return _synthesize(
        form_name_en, base_name_ja, base_name_en,
        _PREFIX_JA, _SUFFIX_JA, _FULL_NAME_JA,
        prefix_joiner="", suffix_joiner="",
    )


def form_name_to_zh(form_name_en: str, base_name_zh: str, base_name_en: str = "") -> str:
    """중국어 간체도 접두·접미 공백 없이 붙임 (Bulbapedia zh 표기 기준)."""
    return _synthesize(
        form_name_en, base_name_zh, base_name_en,
        _PREFIX_ZH, _SUFFIX_ZH, _FULL_NAME_ZH,
        prefix_joiner="", suffix_joiner="",
    )

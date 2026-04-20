"""문자열 정규화 유틸.

빌드 단계에서 모든 자연어 필드에 적용한다. LLM 컨텍스트에 넣었을 때
diff-noise / 토크나이즈 사고를 줄이기 위한 최소 보정.

규칙:
1. NFC 정규화 (합성형 통일)
2. HTML 엔티티 디코드 (`&amp;` → `&` 등)
3. zero-width / BOM / soft-hyphen 제거 (\u200B, \u200C, \u200D, \uFEFF, \u00AD)
4. NBSP(\u00A0) → 일반 공백
5. 연속 공백을 단일 공백으로 축소
6. 앞뒤 공백 strip
"""
from __future__ import annotations

import html
import re
import unicodedata

_STRIP_CHARS = dict.fromkeys(
    ord(c) for c in ("\u200B", "\u200C", "\u200D", "\uFEFF", "\u00AD")
)
_WS_RE = re.compile(r"\s+")


def normalize_text(value: str | None) -> str:
    """Normalize a natural-language string. Safe on None (returns "")."""
    if value is None:
        return ""
    # 1. NFC
    s = unicodedata.normalize("NFC", str(value))
    # 2. HTML entities
    s = html.unescape(s)
    # 3. zero-width + BOM + soft-hyphen
    s = s.translate(_STRIP_CHARS)
    # 4. NBSP → space
    s = s.replace("\u00A0", " ")
    # 5 + 6. collapse whitespace and strip
    return _WS_RE.sub(" ", s).strip()

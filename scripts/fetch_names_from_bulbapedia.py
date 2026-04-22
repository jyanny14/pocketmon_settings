"""Bulbapedia 에서 ja / zh-Hans 공식 이름을 긁어 누락 항목을 채운다.

PokeAPI 가 ja/zh 값을 제공하지 않는 항목(Champions 신규·9세대 일부) 에 대해
Bulbapedia 페이지를 파싱해 공식 지역화 이름을 수집한다.

### Bulbapedia 페이지 구조 (2026-04 실측)

- **첫 문단**: `<b>{Name}</b> (Japanese: <b>{日本語}</b> <i>{romaji/meaning}</i>)` ...
  → 일본어 공식명을 `<b>...</b>` 에서 추출.

- **"In other languages" 섹션**: `<span id="In_other_languages">` 이후의 테이블에
  각 언어별 행이 있음. Chinese 는 `rowspan="2"` 로 Cantonese/Mandarin 두 행.
  Mandarin 행의 `<td>` 가 "Taiwan and mainland China" — 이 값이 간체 (zh-Hans).
  Korean 은 단일 행. 일본어는 이 표에는 없고 첫 문단에 있음.

### 페이지 URL 규칙

| target | URL 패턴 | 예시 |
| --- | --- | --- |
| ability | `/wiki/{Name}_(Ability)` | `Supersweet_Syrup_(Ability)` |
| move    | `/wiki/{Name}_(move)`    | `Earthquake_(move)` |
| item    | `/wiki/{Name}`            | `Chandelurite` |
| pokemon | `/wiki/{Name}_(Pokémon)`  | `Bulbasaur_(Pok%C3%A9mon)` |

### 철칙

이 스크립트가 쓰는 Bulbapedia 값은 공식 게임 내 표기를 위키가 수록한 것이라
"공식 출처 크로스체크" 로 간주한다. 결과는 `data/manual/*_names_{lang}.json`
에 기록되며 파일 `_verified_sources` 에 "Bulbapedia 페이지 URL + 수집 일자" 가 남는다.
LLM 번역·임의 변형 전혀 없음.

### 사용법

    # 검증 스크립트로 누락 확인
    python scripts/validate_names_i18n.py --lang ja
    python scripts/validate_names_i18n.py --lang zh

    # Bulbapedia 에서 누락 항목 일괄 수집 · 여러 target 동시 지원
    python scripts/fetch_names_from_bulbapedia.py --lang ja
    python scripts/fetch_names_from_bulbapedia.py --lang zh
    python scripts/fetch_names_from_bulbapedia.py --lang ja --target ability
    python scripts/fetch_names_from_bulbapedia.py --limit 3  # dry-run
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from datetime import date
from pathlib import Path

from config import PROJECT_ROOT
from fetcher import fetch as fetch_text  # fetcher.fetch returns HTML text

log = logging.getLogger("fetch_names_from_bulbapedia")

BULBAPEDIA = "https://bulbapedia.bulbagarden.net"
WEB_DATA = PROJECT_ROOT / "web" / "data"
MANUAL_DIR = PROJECT_ROOT / "data" / "manual"


# ── 페이지 URL 생성 ──────────────────────────────────────────────

def _title_case(name: str) -> str:
    """Bulbapedia 페이지 제목은 대부분 Title Case + 언더스코어."""
    return "_".join(p[:1].upper() + p[1:].lower() for p in re.split(r"\s+", name.strip()) if p)


# 대문자 유지 예외 (e.g. Mr. Mime, Z-A).
def _normalize_page_title(name: str) -> str:
    # `Mr. Mime` → `Mr._Mime`, 그대로 두는 쪽이 Bulbapedia 규칙과 맞음.
    parts = name.strip().split()
    return "_".join(parts)


def _page_url(target: str, name_en: str) -> str:
    title = _normalize_page_title(name_en)
    # URL 인코딩은 requests 가 알아서 처리하지만 Pokémon 의 é 는 명시적으로.
    title = title.replace("é", "%C3%A9").replace("É", "%C3%89")
    if target == "ability":
        return f"{BULBAPEDIA}/wiki/{title}_(Ability)"
    if target == "move":
        return f"{BULBAPEDIA}/wiki/{title}_(move)"
    if target == "item":
        return f"{BULBAPEDIA}/wiki/{title}"
    if target == "pokemon":
        return f"{BULBAPEDIA}/wiki/{title}_(Pok%C3%A9mon)"
    raise ValueError(target)


# ── 파싱 ─────────────────────────────────────────────────────────

# 첫 문단의 `(Japanese: <b>...</b>` 또는 `(Japanese: ...` 형태.
JA_PATTERN = re.compile(
    r"Japanese:\s*<b>([^<]+)</b>",
    re.DOTALL,
)
# 섹션 시작 앵커
OTHER_LANG_ANCHOR = 'id="In_other_languages"'


def _extract_ja(html: str) -> str | None:
    m = JA_PATTERN.search(html)
    if not m:
        return None
    return m.group(1).strip()


# Mandarin 행 앵커. Bulbapedia 구조:
#   <td><span class="explain" title="Taiwan and mainland China">Mandarin</span></td>
#   <td>简体名 <i>...</i></td>
# `Mandarin</span>` 은 페이지 내 유일.
MANDARIN_PATTERN = re.compile(
    r"Mandarin</span>\s*</td>\s*<td[^>]*>(.*?)</td>",
    re.DOTALL,
)

# 일부 페이지는 Chinese 단일 행 (Cantonese/Mandarin 구분 없음). 이 경우
# <td><a ...>Chinese</a></td> <td>简体名 <i>...</i></td> 형식. 단 Cantonese 하위
# 행이 있는 경우엔 이게 Cantonese 를 잘못 매치하므로 MANDARIN 을 우선 시도.
CHINESE_SINGLE_ROW_PATTERN = re.compile(
    r">Chinese</a>\s*</td>\s*<td[^>]*>(.*?)</td>",
    re.DOTALL,
)
# 이 `<td>` 에 `Cantonese` 가 들어 있으면 단일 행 패턴이 아닌 2-행 구조.
# (페이지마다 구조 일관성 없음을 보정.)


def _strip_tags(s: str) -> str:
    # <i>, <span>, <br> 등 제거. 텍스트 노드의 공백/개행 정돈.
    txt = re.sub(r"<[^>]+>", "", s)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def _extract_zh(html: str) -> str | None:
    idx = html.find(OTHER_LANG_ANCHOR)
    if idx < 0:
        return None
    chunk = html[idx : idx + 12000]

    # 1) Mandarin 행을 먼저 시도 (rowspan=2 으로 Cantonese 와 분리된 구조).
    m = MANDARIN_PATTERN.search(chunk)
    if not m:
        # 2) Chinese 단일 행 구조 — `<td>Cantonese</span>` 가 포함된 행은 스킵.
        for cand in CHINESE_SINGLE_ROW_PATTERN.finditer(chunk):
            cell = cand.group(1)
            if "Cantonese" in cell:
                continue
            m = cand
            break
    if not m:
        return None
    raw = _strip_tags(m.group(1))
    # Bulbapedia 관행:
    #   - 단일 표기: `甘露之蜜 Gānlù zhī Mì`    → 앞 단어(한자) 취함.
    #   - 번체/간체 분리: `反芻 / 反刍 Fǎnchú`  → 슬래시 뒤(간체) 취함.
    # 슬래시(/)로 분리돼 있고 양쪽이 한자 형태면 뒤쪽(간체) 선택.
    if " / " in raw:
        parts = [p.strip() for p in raw.split(" / ")]
        # 마지막이 로마자/영문이면(즉 발음) 제외.
        # 일반적으로 parts = [번체, 간체 + 병음...] — 두 번째에서 앞 토큰 취함.
        if len(parts) >= 2:
            second = parts[1]
            m2 = re.match(r"^([^\s]+)", second)
            return m2.group(1) if m2 else second
    # 슬래시 없음 — 앞 토큰만.
    m2 = re.match(r"^([^\s]+)", raw)
    return m2.group(1) if m2 else raw


# ── 누락 엔트리 로드 ─────────────────────────────────────────────

def _is_missing(entry: dict, lang: str) -> bool:
    key = f"name{lang.capitalize()}"
    val = entry.get(key, "")
    if not val:
        return True
    return val.strip().lower() == (entry.get("nameEn") or "").strip().lower()


def _load_missing(target: str, lang: str) -> list[dict]:
    path = WEB_DATA / f"{target}s.json" if target != "ability" else WEB_DATA / "abilities.json"
    # pokemon 은 pokemon.json, abilities/items/moves 는 복수형
    file_map = {
        "pokemon": "pokemon.json",
        "ability": "abilities.json",
        "item": "items.json",
        "move": "moves.json",
    }
    data = json.loads((WEB_DATA / file_map[target]).read_text(encoding="utf-8"))
    return [e for e in data if _is_missing(e, lang)]


# ── 기존 manual override 병합 ────────────────────────────────────

def _load_manual(target: str, lang: str) -> dict:
    path = MANUAL_DIR / f"{target}_names_{lang}.json"
    if not path.exists():
        return {"_comment": "", "_verified_sources": []}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"_comment": "", "_verified_sources": []}


def _save_manual(target: str, lang: str, data: dict) -> Path:
    path = MANUAL_DIR / f"{target}_names_{lang}.json"
    # _comment / _verified_sources 먼저, 슬러그는 정렬된 순서.
    ordered: dict = {}
    for k in ("_comment", "_verified_sources"):
        if k in data:
            ordered[k] = data[k]
    for k in sorted(k for k in data if not k.startswith("_")):
        ordered[k] = data[k]
    path.write_text(
        json.dumps(ordered, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


# ── 메인 로직 ────────────────────────────────────────────────────

TARGETS = ["pokemon", "ability", "item", "move"]


def process(target: str, lang: str, limit: int, force: bool) -> tuple[int, int, list[str]]:
    """한 (target, lang) 조합을 처리. returns (filled, failed, failed_slugs)."""
    missing = _load_missing(target, lang)
    if limit:
        missing = missing[:limit]
    log.info("target=%s lang=%s — 누락 %d건 처리", target, lang, len(missing))

    manual = _load_manual(target, lang)
    verified = manual.setdefault("_verified_sources", [])
    if not isinstance(verified, list):
        verified = []
        manual["_verified_sources"] = verified

    filled = 0
    failed_slugs: list[str] = []
    today = date.today().isoformat()

    for i, entry in enumerate(missing, 1):
        slug = entry["slug"]
        name_en = entry.get("nameEn", "")
        if not name_en:
            failed_slugs.append(slug)
            continue
        try:
            url = _page_url(target, name_en)
        except Exception as exc:  # noqa: BLE001
            log.warning("  %s: page url 생성 실패 (%s)", slug, exc)
            failed_slugs.append(slug)
            continue
        try:
            html = fetch_text(url, force=force)
        except Exception as exc:  # noqa: BLE001
            log.warning("  [%d/%d] %s ← FETCH FAIL (%s)", i, len(missing), slug, exc)
            failed_slugs.append(slug)
            continue

        if lang == "ja":
            value = _extract_ja(html)
        elif lang == "zh":
            value = _extract_zh(html)
        else:
            value = None

        if not value:
            log.warning("  [%d/%d] %s ← 파싱 실패 (%s)", i, len(missing), slug, url)
            failed_slugs.append(slug)
            continue

        manual[slug] = value
        filled += 1
        if i % 10 == 0 or i == len(missing):
            log.info("  [%d/%d] %s → %s", i, len(missing), slug, value)

    if filled > 0:
        verified.append(
            f"Bulbapedia 'In other languages' 섹션 + 첫 문단 Japanese ({today}) — "
            f"{filled}건 추가"
        )
        manual["_verified_sources"] = verified
        if not manual.get("_comment"):
            manual["_comment"] = (
                f"PokeAPI 에 없는 항목의 {lang} 공식명을 Bulbapedia 'In other languages' "
                f"섹션(중국어 Mandarin) + 첫 문단 Japanese 에서 자동 수집. LLM 번역 없음. "
                f"직접 기입 시 동일 원칙 유지."
            )
        path = _save_manual(target, lang, manual)
        log.info("  → %d 건 채움 · 저장 %s", filled, path)

    return filled, len(failed_slugs), failed_slugs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["ja", "zh"], help="언어. 생략 시 둘 다")
    ap.add_argument("--target", choices=TARGETS, help="대상. 생략 시 모두")
    ap.add_argument("--limit", type=int, default=0, help="각 조합당 처음 N건")
    ap.add_argument("--force", action="store_true", help="Bulbapedia 캐시 무시")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    langs = [args.lang] if args.lang else ["ja", "zh"]
    targets = [args.target] if args.target else TARGETS

    total_filled = 0
    total_failed = 0
    failed_by_combo: dict[tuple[str, str], list[str]] = {}

    started = time.monotonic()
    for lang in langs:
        for target in targets:
            filled, failed, slugs = process(target, lang, args.limit, args.force)
            total_filled += filled
            total_failed += failed
            if slugs:
                failed_by_combo[(target, lang)] = slugs

    elapsed = time.monotonic() - started
    log.info("─── 완료 · 채움=%d · 실패=%d · %.1fs ───",
             total_filled, total_failed, elapsed)
    if failed_by_combo:
        log.warning("실패 상세:")
        for (t, l), slugs in failed_by_combo.items():
            log.warning("  %s %s: %s", t, l, " · ".join(slugs[:20]))
    return 0


if __name__ == "__main__":
    sys.exit(main())

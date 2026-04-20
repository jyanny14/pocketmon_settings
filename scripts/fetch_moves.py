"""PokeAPI 에서 기술 메타데이터 수집.

입력:  web/data/pokemon.json 의 각 포켓몬 moves (serebii slug)
절차:
  1. PokeAPI `/move?limit=2000` 로 전체 move 목록을 받아
     정규화 키(lower + 하이픈/아포스트로피 제거) → PokeAPI slug 매핑 생성
  2. 각 serebii slug 를 PokeAPI slug 로 매핑
  3. `/move/{slug}/` 호출 → 타입 / damage_class / power / accuracy / pp
     / flavor_text(ko 우선) / name(ko/en) 수집

출력:  data/processed/moves.json
  {
    serebii_slug: {
      pokeapiSlug, nameEn, nameKo, type, category, power, accuracy, pp,
      flavorTextEn, flavorTextKo
    }, ...
  }

사용법:
    python scripts/fetch_moves.py              # 전체 (~100초)
    python scripts/fetch_moves.py --limit 10   # dry-run
    python scripts/fetch_moves.py --force      # 캐시 무시
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time

from config import POKEAPI_BASE, PROJECT_ROOT
from fetcher import fetch_json
from normalize import normalize_text

log = logging.getLogger("fetch_moves")

POKEMON_JSON = PROJECT_ROOT / "web" / "data" / "pokemon.json"
OUT_PATH = PROJECT_ROOT / "data" / "processed" / "moves.json"


def _norm_key(s: str) -> str:
    return s.replace("-", "").replace("'", "").lower()


def build_slug_map(force: bool) -> dict[str, str]:
    """serebii-style normalized key → PokeAPI slug."""
    idx = fetch_json(f"{POKEAPI_BASE}/move?limit=2000", force=force)
    mapping: dict[str, str] = {}
    for entry in idx.get("results", []):
        name = entry.get("name")
        if not name:
            continue
        mapping.setdefault(_norm_key(name), name)
    return mapping


def _pick_latest_ko_flavor(payload: dict) -> str | None:
    kos = [
        e.get("flavor_text", "")
        for e in payload.get("flavor_text_entries", []) or []
        if (e.get("language") or {}).get("name") == "ko"
    ]
    kos = [k for k in kos if k]
    return normalize_text(kos[-1]) if kos else None


def _pick_latest_en_flavor(payload: dict) -> str | None:
    ens = [
        e.get("flavor_text", "")
        for e in payload.get("flavor_text_entries", []) or []
        if (e.get("language") or {}).get("name") == "en"
    ]
    ens = [e for e in ens if e]
    return normalize_text(ens[-1]) if ens else None


def _pick_name(payload: dict, lang: str) -> str | None:
    for n in payload.get("names", []) or []:
        if (n.get("language") or {}).get("name") == lang:
            return n.get("name")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    pokemon = json.loads(POKEMON_JSON.read_text(encoding="utf-8"))
    serebii_slugs = sorted({m for p in pokemon for m in p.get("moves", [])})
    if args.limit:
        serebii_slugs = serebii_slugs[: args.limit]
    total = len(serebii_slugs)
    log.info("기술 %d개 처리 시작", total)

    log.info("PokeAPI 기술 인덱스 로딩…")
    slug_map = build_slug_map(args.force)
    log.info("인덱스 %d건", len(slug_map))

    result: dict[str, dict] = {}
    failures: list[tuple[str, str]] = []
    unmapped: list[str] = []
    started = time.monotonic()

    for i, s in enumerate(serebii_slugs, 1):
        key = _norm_key(s)
        pa_slug = slug_map.get(key)
        if not pa_slug:
            unmapped.append(s)
            continue
        url = f"{POKEAPI_BASE}/move/{pa_slug}/"
        try:
            payload = fetch_json(url, force=args.force)
        except Exception as exc:  # noqa: BLE001
            failures.append((s, f"fetch: {exc}"))
            continue

        entry = {
            "pokeapiSlug": pa_slug,
            "nameEn": _pick_name(payload, "en") or payload.get("name", pa_slug),
            "nameKo": _pick_name(payload, "ko") or "",
            "type": (payload.get("type") or {}).get("name") or "",
            "category": (payload.get("damage_class") or {}).get("name") or "",
            "power": payload.get("power"),
            "accuracy": payload.get("accuracy"),
            "pp": payload.get("pp"),
            "flavorTextEn": _pick_latest_en_flavor(payload) or "",
            "flavorTextKo": _pick_latest_ko_flavor(payload) or "",
        }
        result[s] = entry
        if i % 50 == 0 or i == total:
            log.info("[%d/%d] %s → %s (%s)", i, total, s, entry["nameKo"] or entry["nameEn"], pa_slug)

    elapsed = time.monotonic() - started
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    log.info(
        "완료: %d/%d 수집, %d 매핑실패, %d 호출실패, %.1fs → %s",
        len(result), total, len(unmapped), len(failures), elapsed, OUT_PATH,
    )
    ko_count = sum(1 for e in result.values() if e["nameKo"])
    flavor_ko = sum(1 for e in result.values() if e["flavorTextKo"])
    log.info("한국어 이름 커버리지: %d/%d, 한국어 설명: %d/%d", ko_count, len(result), flavor_ko, len(result))
    if unmapped:
        log.warning("매핑 실패(serebii slug → PokeAPI 변환 불가):")
        for s in unmapped[:20]:
            log.warning("  %s", s)
    if failures:
        log.warning("호출 실패:")
        for s, r in failures[:20]:
            log.warning("  %s: %s", s, r)
    return 0 if not failures and not unmapped else 1


if __name__ == "__main__":
    sys.exit(main())

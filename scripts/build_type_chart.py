"""타입 상성 매트릭스 생성 — `web/data/type_chart.json`.

네트워크 호출 없이 리터럴 매핑만 사용. 1세대 이후 현행 규칙(Fairy 포함 Gen 6+,
Steel 상성 패치 포함)을 반영한다.

스키마:
    {
      "types": [18 slug in canonical order],
      "matrix": {
        "<attacker>": {"<defender>": 0 | 0.5 | 1 | 2, ...},
        ...
      }
    }

모든 attacker × defender 쌍이 matrix 에 존재하며 기본값 1. `0` 은 무효화.
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

from config import PROJECT_ROOT

log = logging.getLogger("build_type_chart")

OUT_PATH = PROJECT_ROOT / "web" / "data" / "type_chart.json"

TYPES: list[str] = [
    "normal", "fire", "water", "electric", "grass", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy",
]

# (attacker, set_of_defenders, multiplier) 3-튜플 리스트로 정의.
# 누락된 쌍은 배수 1 (상성 없음).
_RULES: list[tuple[str, set[str], float]] = [
    # normal
    ("normal", {"rock", "steel"}, 0.5),
    ("normal", {"ghost"}, 0),
    # fire
    ("fire", {"grass", "ice", "bug", "steel"}, 2),
    ("fire", {"fire", "water", "rock", "dragon"}, 0.5),
    # water
    ("water", {"fire", "ground", "rock"}, 2),
    ("water", {"water", "grass", "dragon"}, 0.5),
    # electric
    ("electric", {"water", "flying"}, 2),
    ("electric", {"electric", "grass", "dragon"}, 0.5),
    ("electric", {"ground"}, 0),
    # grass
    ("grass", {"water", "ground", "rock"}, 2),
    ("grass", {"fire", "grass", "poison", "flying", "bug", "dragon", "steel"}, 0.5),
    # ice
    ("ice", {"grass", "ground", "flying", "dragon"}, 2),
    ("ice", {"fire", "water", "ice", "steel"}, 0.5),
    # fighting
    ("fighting", {"normal", "ice", "rock", "dark", "steel"}, 2),
    ("fighting", {"poison", "flying", "psychic", "bug", "fairy"}, 0.5),
    ("fighting", {"ghost"}, 0),
    # poison
    ("poison", {"grass", "fairy"}, 2),
    ("poison", {"poison", "ground", "rock", "ghost"}, 0.5),
    ("poison", {"steel"}, 0),
    # ground
    ("ground", {"fire", "electric", "poison", "rock", "steel"}, 2),
    ("ground", {"grass", "bug"}, 0.5),
    ("ground", {"flying"}, 0),
    # flying
    ("flying", {"grass", "fighting", "bug"}, 2),
    ("flying", {"electric", "rock", "steel"}, 0.5),
    # psychic
    ("psychic", {"fighting", "poison"}, 2),
    ("psychic", {"psychic", "steel"}, 0.5),
    ("psychic", {"dark"}, 0),
    # bug
    ("bug", {"grass", "psychic", "dark"}, 2),
    ("bug", {"fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"}, 0.5),
    # rock
    ("rock", {"fire", "ice", "flying", "bug"}, 2),
    ("rock", {"fighting", "ground", "steel"}, 0.5),
    # ghost
    ("ghost", {"psychic", "ghost"}, 2),
    ("ghost", {"dark"}, 0.5),
    ("ghost", {"normal"}, 0),
    # dragon
    ("dragon", {"dragon"}, 2),
    ("dragon", {"steel"}, 0.5),
    ("dragon", {"fairy"}, 0),
    # dark
    ("dark", {"psychic", "ghost"}, 2),
    ("dark", {"fighting", "dark", "fairy"}, 0.5),
    # steel
    ("steel", {"ice", "rock", "fairy"}, 2),
    ("steel", {"fire", "water", "electric", "steel"}, 0.5),
    # fairy
    ("fairy", {"fighting", "dragon", "dark"}, 2),
    ("fairy", {"fire", "poison", "steel"}, 0.5),
]


def build_matrix() -> dict[str, dict[str, float]]:
    matrix: dict[str, dict[str, float]] = {
        a: {d: 1 for d in TYPES} for a in TYPES
    }
    for attacker, defenders, mult in _RULES:
        for d in defenders:
            matrix[attacker][d] = mult
    return matrix


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    payload = {"types": TYPES, "matrix": build_matrix()}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log.info(
        "타입 상성 매트릭스 저장: %d 타입 × %d 타입 → %s",
        len(TYPES), len(TYPES), OUT_PATH,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

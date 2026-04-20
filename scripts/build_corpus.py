"""통합 코퍼스 생성 — `web/data/corpus.json`.

LLM 컨텍스트에 한 파일만 주입하면 전체 데이터셋을 사용할 수 있도록
pokemon/items/abilities/type_chart + manifest 를 단일 JSON 으로 묶는다.

전제: `python scripts/build.py` 및 `python scripts/build_type_chart.py` 가
먼저 실행되어 `web/data/*.json` 이 존재해야 한다.

출력:
    web/data/corpus.json

스키마:
    {
      "manifest": {...},
      "pokemon":   [...],
      "items":     [...],
      "abilities": [...],
      "type_chart": {...}
    }
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

from config import PROJECT_ROOT

log = logging.getLogger("build_corpus")

DIST_DIR = PROJECT_ROOT / "web" / "data"
OUT_PATH = DIST_DIR / "corpus.json"

FILES = ["manifest", "pokemon", "items", "abilities", "type_chart", "moves"]


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )

    corpus: dict = {}
    for name in FILES:
        path = DIST_DIR / f"{name}.json"
        if not path.exists():
            log.warning("missing %s, skip", path)
            continue
        corpus[name] = json.loads(path.read_text(encoding="utf-8"))

    OUT_PATH.write_text(
        json.dumps(corpus, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    size_kb = OUT_PATH.stat().st_size / 1024
    log.info(
        "corpus: %s (%.0f KB, keys=%s)",
        OUT_PATH, size_kb, list(corpus.keys()),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

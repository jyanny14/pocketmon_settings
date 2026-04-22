"""공통 설정: URL, 경로, 크롤링 파라미터."""
from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"

BASE_URL = "https://www.serebii.net"

POKEMON_LIST_URL = f"{BASE_URL}/pokemonchampions/pokemon.shtml"
RECRUIT_URL = f"{BASE_URL}/pokemonchampions/recruit.shtml"
TRANSFER_URL = f"{BASE_URL}/pokemonchampions/transferonly.shtml"
GIFT_URL = f"{BASE_URL}/pokemonchampions/giftpokemon.shtml"
ITEMS_LISTING_URL = f"{BASE_URL}/pokemonchampions/items.shtml"
NEW_ABILITIES_URL = f"{BASE_URL}/pokemonchampions/newabilities.shtml"
MEGA_ABILITIES_URL = f"{BASE_URL}/pokemonchampions/megaabilities.shtml"
UPDATED_ATTACKS_URL = f"{BASE_URL}/pokemonchampions/updatedattacks.shtml"

POKEMON_DETAIL_URL = f"{BASE_URL}/pokedex-champions/{{slug}}/"
ABILITYDEX_URL = f"{BASE_URL}/abilitydex/{{slug}}.shtml"

POKEAPI_BASE = "https://pokeapi.co/api/v2"
POKEAPI_SPRITE_URL = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png"
)

# 프로젝트 내부 언어 코드 → PokeAPI 의 `names[].language.name` 매핑.
# 실측(2026-04-22): pokemon-species / ability / item / move 4 엔드포인트 모두 동일.
# `ja` 와 `ja-hrkt` 는 이름(name) 필드에서 값이 같음 — 더 표준인 `ja` 사용.
# 번체(`zh-hant`) 는 Phase 1 범위 밖.
POKEAPI_LANG_CODES: dict[str, str] = {
    "ko": "ko",
    "ja": "ja",
    "zh": "zh-hans",
}

# 도메인별 요청 간격(초). 없으면 DEFAULT 사용.
REQUEST_DELAY_BY_HOST: dict[str, float] = {
    "www.serebii.net": 1.5,
    "pokeapi.co": 0.2,
    "raw.githubusercontent.com": 0.1,
    # Bulbapedia robots.txt 는 Crawl-delay: 5 지정. 준수.
    "bulbapedia.bulbagarden.net": 5.0,
}
DEFAULT_REQUEST_DELAY_SECONDS = 1.0
REQUEST_TIMEOUT_SECONDS = 20
USER_AGENT = (
    "pocketmon_settings-scraper/0.1 "
    "(+https://github.com/; educational project)"
)

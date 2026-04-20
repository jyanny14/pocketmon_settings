"""HTML fetcher with disk cache, rate limiting, and retries."""
from __future__ import annotations

import hashlib
import logging
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

from config import (
    DEFAULT_REQUEST_DELAY_SECONDS,
    RAW_DIR,
    REQUEST_DELAY_BY_HOST,
    REQUEST_TIMEOUT_SECONDS,
    USER_AGENT,
)

log = logging.getLogger(__name__)

_last_request_at: dict[str, float] = {}


def _cache_path(url: str, *, suffix: str = ".html") -> Path:
    parsed = urlparse(url)
    host = parsed.netloc.replace(":", "_")
    path = parsed.path.strip("/").replace("/", "_") or "index"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return RAW_DIR / host / f"{path}_{digest}{suffix}"


def _throttle(host: str) -> None:
    delay = REQUEST_DELAY_BY_HOST.get(host, DEFAULT_REQUEST_DELAY_SECONDS)
    last = _last_request_at.get(host, 0.0)
    wait = delay - (time.monotonic() - last)
    if wait > 0:
        time.sleep(wait)
    _last_request_at[host] = time.monotonic()


def _request(url: str, *, retries: int) -> requests.Response:
    host = urlparse(url).netloc
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        _throttle(host)
        try:
            log.info("GET %s (attempt %d)", url, attempt)
            resp = requests.get(
                url,
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:
            last_exc = exc
            log.warning("fetch failed (%s) attempt %d/%d", exc, attempt, retries)
            time.sleep(2 * attempt)
    raise RuntimeError(f"failed to fetch {url}: {last_exc}")


def fetch(url: str, *, force: bool = False, retries: int = 3) -> str:
    """Fetch URL returning text. Caches to disk; respects per-host rate limit."""
    cache_file = _cache_path(url)
    if cache_file.exists() and not force:
        log.debug("cache hit %s", url)
        return cache_file.read_text(encoding="utf-8")

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    resp = _request(url, retries=retries)
    text = resp.text
    cache_file.write_text(text, encoding="utf-8")
    return text


def fetch_json(url: str, *, force: bool = False, retries: int = 3):
    """Fetch URL returning JSON. Caches to disk as .json."""
    import json

    cache_file = _cache_path(url, suffix=".json")
    if cache_file.exists() and not force:
        return json.loads(cache_file.read_text(encoding="utf-8"))

    cache_file.parent.mkdir(parents=True, exist_ok=True)
    resp = _request(url, retries=retries)
    data = resp.json()
    cache_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def fetch_binary(url: str, dest: Path, *, force: bool = False, retries: int = 3) -> Path:
    """Fetch URL and write bytes to dest. Skips if dest already exists."""
    if dest.exists() and not force:
        log.debug("binary cache hit %s", dest)
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    resp = _request(url, retries=retries)
    dest.write_bytes(resp.content)
    return dest


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    target = sys.argv[1] if len(sys.argv) > 1 else "https://www.serebii.net/pokemonchampions/"
    html = fetch(target)
    print(f"OK {len(html)} bytes -> {_cache_path(target)}")

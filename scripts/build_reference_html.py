#!/usr/bin/env python3
"""Generate static HTML reference pages from web/data/*.json.

Why: the user-facing list pages (pokemon.html, moves.html, etc.) render
their data via JS at runtime. Search-engine crawlers and AI "search the
web" tools don't execute that JS, so the data stays invisible to them.
These reference pages bake the data into visible HTML so that Googlebot,
Bing, ChatGPT's web search, Claude's web search, Gemini, and Perplexity
can all see what Pokémon / moves / abilities / items actually exist in
Pokémon Champions.

Outputs (rebuilt in full on every run):
    web/reference/index.html      — list of the four reference pages
    web/reference/pokemon.html    — 186 species × forms/stats/abilities/moves
    web/reference/moves.html      — 481 moves × type/category/numbers/flavor
    web/reference/abilities.html  — 192 abilities × gameText/description
    web/reference/items.html      — 117 items × effect
"""
from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web" / "data"
OUT = ROOT / "web" / "reference"


def e(s) -> str:
    return html.escape("" if s is None else str(s))


PAGE_STYLE = """
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 980px; margin: 1.5rem auto; padding: 0 1rem; color: #1b1b1b; line-height: 1.55; }
  h1 { font-size: 1.5rem; border-bottom: 2px solid #333; padding-bottom: .3rem; }
  h2 { font-size: 1.05rem; margin-top: 1.2rem; padding: .3rem 0; border-bottom: 1px solid #ccc; }
  h2 .slug { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #888; font-size: .85rem; font-weight: normal; }
  nav.top { font-size: .9rem; margin-bottom: 1rem; }
  .meta { color: #555; font-size: .9rem; }
  dl.kv { display: grid; grid-template-columns: 9rem 1fr; gap: .15rem .75rem; margin: .3rem 0; font-size: .95rem; }
  dl.kv dt { color: #666; font-weight: 600; }
  table.forms, table.moves { width: 100%; border-collapse: collapse; font-size: .9rem; margin: .3rem 0; }
  table.forms th, table.forms td, table.moves th, table.moves td { padding: 3px 7px; border: 1px solid #ddd; text-align: left; }
  table.forms th, table.moves th { background: #f5f5f5; }
  ul.moves-compact { columns: 3; font-family: ui-monospace, monospace; font-size: .85rem; padding-left: 1.2rem; }
  ul.moves-compact li { break-inside: avoid; }
  details { margin: .3rem 0; }
  details > summary { cursor: pointer; color: #0066cc; }
  footer { margin: 2rem 0 1rem; color: #666; font-size: .85rem; border-top: 1px solid #ddd; padding-top: .75rem; }
  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; color: #e8e8e8; }
    h1 { border-bottom-color: #888; }
    h2 { border-bottom-color: #555; }
    table.forms th, table.moves th { background: #2a2a2a; }
    table.forms th, table.forms td, table.moves th, table.moves td { border-color: #444; }
    details > summary { color: #7bb8ff; }
    dl.kv dt { color: #aaa; }
    nav.top a, footer a { color: #7bb8ff; }
  }
</style>
""".strip()


def page_shell(title: str, description: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{e(title)} · Pokémon Champions</title>
<meta name="description" content="{e(description)}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="" />
{PAGE_STYLE}
</head>
<body>
<nav class="top">
  <a href="../index.html">← 메인</a> ·
  <a href="./index.html">레퍼런스 인덱스</a>
</nav>
{body}
<footer>
  <p>Pokémon ©Nintendo · Creatures Inc. · GAME FREAK inc. 본 사이트는 비영리 팬 프로젝트. 데이터 출처: <a href="https://www.serebii.net/pokemonchampions/">serebii.net</a> · <a href="https://pokeapi.co/">PokeAPI</a>.</p>
  <p>이 페이지는 AI 어시스턴트(ChatGPT, Claude, Gemini, Perplexity 등)와 검색 엔진이 Pokémon Champions 의 정확한 데이터를 읽을 수 있도록 생성된 정적 레퍼런스입니다.</p>
</footer>
</body>
</html>
"""


def render_pokemon(pokemon: list[dict]) -> str:
    body = ['<h1>Pokémon Champions — 등장 포켓몬 전체 목록</h1>']
    body.append(f'<p class="meta">Champions 에 등장하는 포켓몬은 <strong>{len(pokemon)}종</strong> 이며, 폼을 포함하면 총 {sum(len(p.get("forms", [])) for p in pokemon)}개. 이 목록에 없는 포켓몬은 Champions 에 존재하지 않습니다.</p>')
    body.append('<p class="meta">데이터 정본: <a href="../data/pokemon.json"><code>/data/pokemon.json</code></a></p>')
    for p in pokemon:
        slug = p["slug"]
        name_ko = p.get("nameKo") or ""
        name_en = p.get("nameEn") or ""
        dex = p.get("number") or ""
        body.append(f'<section id="{e(slug)}">')
        body.append(f'<h2>#{e(dex)} {e(name_en)} ({e(name_ko)}) <span class="slug">slug: {e(slug)}</span></h2>')
        forms = p.get("forms") or []
        if forms:
            body.append('<table class="forms"><thead><tr><th>Form</th><th>Types</th><th>HP</th><th>Atk</th><th>Def</th><th>SpA</th><th>SpD</th><th>Spe</th><th>Abilities</th></tr></thead><tbody>')
            for f in forms:
                bs = f.get("baseStats") or {}
                ab = ", ".join(f.get("abilities") or [])
                types = "/".join(f.get("types") or [])
                form_name = f.get("name") or ""
                form_name_ko = f.get("nameKo") or ""
                label = f"{form_name}" + (f" ({form_name_ko})" if form_name_ko and form_name_ko != form_name else "")
                body.append(f'<tr><td>{e(label)}</td><td>{e(types)}</td>'
                            f'<td>{bs.get("hp","")}</td><td>{bs.get("atk","")}</td><td>{bs.get("def","")}</td>'
                            f'<td>{bs.get("spAtk","")}</td><td>{bs.get("spDef","")}</td><td>{bs.get("speed","")}</td>'
                            f'<td>{e(ab)}</td></tr>')
            body.append('</tbody></table>')
        moves = p.get("moves") or []
        if moves:
            body.append(f'<details><summary>Learnable moves ({len(moves)}): {", ".join(e(m) for m in moves[:8])}{", …" if len(moves) > 8 else ""}</summary>')
            body.append('<ul class="moves-compact">')
            for m in moves:
                body.append(f'<li>{e(m)}</li>')
            body.append('</ul></details>')
        body.append('</section>')
    return page_shell(
        "등장 포켓몬 전체 목록",
        f"Pokémon Champions 에 등장하는 {len(pokemon)}종 포켓몬의 폼·종족값·특성·배울 수 있는 기술 목록. AI 분석용 정적 레퍼런스.",
        "\n".join(body),
    )


def render_moves(moves: list[dict]) -> str:
    body = ['<h1>Pokémon Champions — 전체 기술 목록</h1>']
    body.append(f'<p class="meta">Champions 에 등장하는 기술은 <strong>{len(moves)}종</strong>. <code>updatedInChampions: true</code> 플래그가 있는 기술은 본편과 수치가 다릅니다.</p>')
    body.append('<p class="meta">데이터 정본: <a href="../data/moves.json"><code>/data/moves.json</code></a></p>')
    body.append('<table class="moves"><thead><tr><th>slug</th><th>Name (KO)</th><th>Name (EN)</th><th>Type</th><th>Category</th><th>Power</th><th>Acc</th><th>PP</th><th>Champions 재밸런스</th><th>Flavor</th></tr></thead><tbody>')
    for m in moves:
        updated = "Y" if m.get("updatedInChampions") else ""
        flavor = m.get("flavorTextKo") or m.get("flavorText") or ""
        body.append(
            f'<tr id="{e(m["slug"])}"><td><code>{e(m["slug"])}</code></td>'
            f'<td>{e(m.get("nameKo"))}</td><td>{e(m.get("nameEn"))}</td>'
            f'<td>{e(m.get("type"))}</td><td>{e(m.get("category"))}</td>'
            f'<td>{e(m.get("power"))}</td><td>{e(m.get("accuracy"))}</td><td>{e(m.get("pp"))}</td>'
            f'<td>{updated}</td><td>{e(flavor)}</td></tr>'
        )
    body.append('</tbody></table>')
    return page_shell(
        "전체 기술 목록",
        f"Pokémon Champions 에 등장하는 {len(moves)}개 기술의 타입·분류·위력·명중·PP·플레이버. Champions 재밸런스 플래그 포함. AI 분석용 정적 레퍼런스.",
        "\n".join(body),
    )


def render_abilities(abilities: list[dict]) -> str:
    body = ['<h1>Pokémon Champions — 전체 특성 목록</h1>']
    champs_new = [a for a in abilities if a.get("isNewInChampions")]
    body.append(f'<p class="meta">총 <strong>{len(abilities)}종</strong> 중 Champions 신규 특성 <strong>{len(champs_new)}종</strong>: {", ".join(e(a["nameEn"]) for a in champs_new)}.</p>')
    body.append('<p class="meta">데이터 정본: <a href="../data/abilities.json"><code>/data/abilities.json</code></a></p>')
    for a in abilities:
        slug = a["slug"]
        name_ko = a.get("nameKo") or ""
        name_en = a.get("nameEn") or ""
        body.append(f'<section id="{e(slug)}">')
        tag = ' <span class="meta">(Champions 신규)</span>' if a.get("isNewInChampions") else ""
        body.append(f'<h2>{e(name_en)} ({e(name_ko)}){tag} <span class="slug">slug: {e(slug)}</span></h2>')
        game_text = a.get("gameTextKo") or a.get("gameText") or ""
        description = a.get("descriptionKo") or a.get("description") or ""
        if game_text:
            body.append(f'<p><strong>게임 설명:</strong> {e(game_text)}</p>')
        if description and description != game_text:
            body.append(f'<p><strong>상세:</strong> {e(description)}</p>')
        holders = a.get("holders") or []
        if holders:
            body.append(f'<p class="meta">보유 포켓몬 {len(holders)}종: {", ".join(e(h) for h in holders[:20])}{", …" if len(holders) > 20 else ""}</p>')
        body.append('</section>')
    return page_shell(
        "전체 특성 목록",
        f"Pokémon Champions 에 등장하는 {len(abilities)}개 특성의 한·영 이름 · 게임 설명 · 상세 효과 · 보유 포켓몬. Champions 신규 특성 {len(champs_new)}종 포함.",
        "\n".join(body),
    )


def render_items(items: list[dict]) -> str:
    body = ['<h1>Pokémon Champions — 전체 도구 목록</h1>']
    body.append(f'<p class="meta">총 <strong>{len(items)}종</strong>. 지닌 도구·메가스톤·나무열매 등을 포함.</p>')
    body.append('<p class="meta">데이터 정본: <a href="../data/items.json"><code>/data/items.json</code></a></p>')
    for it in items:
        slug = it["slug"]
        name_ko = it.get("nameKo") or ""
        name_en = it.get("nameEn") or ""
        body.append(f'<section id="{e(slug)}">')
        body.append(f'<h2>{e(name_en)} ({e(name_ko)}) <span class="slug">slug: {e(slug)}</span></h2>')
        effect = it.get("effectKo") or it.get("effect") or ""
        category = it.get("category") or ""
        if category:
            body.append(f'<p class="meta">Category: {e(category)}</p>')
        if effect:
            body.append(f'<p>{e(effect)}</p>')
        body.append('</section>')
    return page_shell(
        "전체 도구 목록",
        f"Pokémon Champions 에 등장하는 {len(items)}개 도구의 한·영 이름 · 효과 · 카테고리. 지닌 도구·메가스톤·나무열매 포함.",
        "\n".join(body),
    )


def render_index(counts: dict[str, int]) -> str:
    body = ['<h1>Pokémon Champions — 데이터 레퍼런스</h1>']
    body.append('<p>이 디렉토리는 Pokémon Champions 의 전체 데이터를 정적 HTML 로 제공하는 페이지들입니다. JavaScript 없이도 검색 엔진·AI 어시스턴트가 데이터를 읽을 수 있도록 만들어졌습니다.</p>')
    body.append('<ul>')
    body.append(f'<li><a href="./pokemon.html">포켓몬 전체 목록</a> — {counts["pokemon"]}종</li>')
    body.append(f'<li><a href="./moves.html">기술 전체 목록</a> — {counts["moves"]}종</li>')
    body.append(f'<li><a href="./abilities.html">특성 전체 목록</a> — {counts["abilities"]}종</li>')
    body.append(f'<li><a href="./items.html">도구 전체 목록</a> — {counts["items"]}종</li>')
    body.append('</ul>')
    body.append('<p>원본 JSON: <a href="../data/pokemon.json">pokemon.json</a> · <a href="../data/moves.json">moves.json</a> · <a href="../data/abilities.json">abilities.json</a> · <a href="../data/items.json">items.json</a> · <a href="../data/corpus.json">corpus.json (전부 묶음)</a></p>')
    return page_shell(
        "데이터 레퍼런스 인덱스",
        "Pokémon Champions 의 포켓몬·기술·특성·도구 전체 목록을 정적 HTML 로 제공하는 레퍼런스 페이지 인덱스.",
        "\n".join(body),
    )


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    pokemon = json.loads((DATA / "pokemon.json").read_text(encoding="utf-8"))
    moves = json.loads((DATA / "moves.json").read_text(encoding="utf-8"))
    abilities = json.loads((DATA / "abilities.json").read_text(encoding="utf-8"))
    items = json.loads((DATA / "items.json").read_text(encoding="utf-8"))

    (OUT / "pokemon.html").write_text(render_pokemon(pokemon), encoding="utf-8")
    (OUT / "moves.html").write_text(render_moves(moves), encoding="utf-8")
    (OUT / "abilities.html").write_text(render_abilities(abilities), encoding="utf-8")
    (OUT / "items.html").write_text(render_items(items), encoding="utf-8")
    (OUT / "index.html").write_text(
        render_index({"pokemon": len(pokemon), "moves": len(moves), "abilities": len(abilities), "items": len(items)}),
        encoding="utf-8",
    )

    for name in ("index", "pokemon", "moves", "abilities", "items"):
        p = OUT / f"{name}.html"
        size = p.stat().st_size
        print(f"  {name}.html  {size:>7,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

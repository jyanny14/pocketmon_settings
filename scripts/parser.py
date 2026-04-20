"""HTML parsers for each serebii.net Pokemon Champions page."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional
from bs4 import BeautifulSoup, Tag


# ── helpers ──────────────────────────────────────────────────────────────────

def _type_from_img(img: Tag) -> str:
    """'/pokedex-bw/type/fire.gif' → 'fire'"""
    src = img.get("src", "")
    return src.rsplit("/", 1)[-1].replace(".gif", "").lower()


def _slug_from_href(href: str) -> str:
    """'/pokedex-champions/venusaur/' → 'venusaur'"""
    return href.strip("/").rsplit("/", 1)[-1]


def _strip_japanese(text: str) -> str:
    """'Floetteフラエッテ' → 'Floette'"""
    return re.sub(r"[\u3000-\u9fff\uff00-\uffef]+", "", text).strip()


def _split_abilities(text: str) -> list[str]:
    """'Shield DustCompoundeyesFriend Guard' → split on CamelCase boundaries."""
    # Insert separator before each uppercase letter that follows a lowercase letter
    spaced = re.sub(r"(?<=[a-z])(?=[A-Z])", " | ", text)
    return [a.strip() for a in spaced.split("|") if a.strip()]


# ── data classes ─────────────────────────────────────────────────────────────

@dataclass
class Pokemon:
    number: str          # '#0003'
    name: str            # 'Venusaur'
    types: list[str]     # ['grass', 'poison']
    slug: str            # 'venusaur'


@dataclass
class TransferPokemon:
    number: str
    name: str
    types: list[str]
    abilities: list[str]
    slug: str
    hp: int
    atk: int
    def_: int
    sp_atk: int
    sp_def: int
    speed: int


@dataclass
class RecruitItem:
    name: str
    effect: str
    location: str
    icon_url: str


@dataclass
class ChampionsItem:
    name: str
    effect: str
    location: str
    icon_url: str
    category: str  # 'held' | 'mega-stone' | 'berry' | 'misc'


@dataclass
class GiftPokemon:
    name: str
    ability: str
    nature: str
    ivs: dict[str, str]   # {'HP': '+', 'Atk': '-', ...}


@dataclass
class AbilityRef:
    slug: str            # 'blaze'
    name: str            # 'Blaze'
    description: str     # '' if unavailable inline


@dataclass
class PokemonForm:
    name: str                   # 'Charizard', 'Mega Charizard X', 'Alolan Raichu'
    types: list[str]
    abilities: list[AbilityRef]
    base_stats: dict[str, int]


@dataclass
class PokemonDetail:
    slug: str
    name_en: str
    name_ko: str
    national_dex: str
    forms: list[PokemonForm] = field(default_factory=list)
    moves: list[str] = field(default_factory=list)  # serebii move slugs, species-wide

    # ── backwards-compatible accessors (base form) ──
    @property
    def types(self) -> list[str]:
        return self.forms[0].types if self.forms else []

    @property
    def abilities(self) -> list[AbilityRef]:
        return self.forms[0].abilities if self.forms else []

    @property
    def base_stats(self) -> dict[str, int]:
        return self.forms[0].base_stats if self.forms else {}


# ── page parsers ──────────────────────────────────────────────────────────────

def parse_pokemon_list(html: str) -> list[Pokemon]:
    """Parse pokemon.shtml → list of all available Pokemon."""
    soup = BeautifulSoup(html, "lxml")

    # The main table is the tab-class table with the most rows
    tab_tables = soup.find_all("table", class_="tab")
    main_table = max(tab_tables, key=lambda t: len(t.find_all("tr")))

    results: list[Pokemon] = []
    for row in main_table.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) < 4:
            continue  # header row or image-only detail row

        num_text = cells[0].get_text(strip=True)
        if not num_text.startswith("#"):
            continue  # skip column header

        name = cells[3].get_text(strip=True)
        types = [_type_from_img(img) for img in cells[4].find_all("img")] if len(cells) > 4 else []

        # slug from first link found in row
        first_link = row.find("a", href=re.compile(r"/pokedex-champions/"))
        slug = _slug_from_href(first_link["href"]) if first_link else ""

        results.append(Pokemon(number=num_text, name=name, types=types, slug=slug))

    return results


def parse_transfer_only(html: str) -> list[TransferPokemon]:
    """Parse transferonly.shtml → transfer-only Pokemon with base stats."""
    soup = BeautifulSoup(html, "lxml")

    # First table (no class) is the transfer table; it has a 2-row header
    tables = soup.find_all("table")
    main_table = tables[0]

    results: list[TransferPokemon] = []
    rows = main_table.find_all("tr")

    # rows[0] and rows[1] are the two-row header; data starts at rows[2]
    for row in rows[2:]:
        cells = row.find_all(["th", "td"])
        if len(cells) < 10:
            continue  # image-only detail row

        num_text = cells[0].get_text(strip=True)
        if not num_text.startswith("#"):
            continue

        name = _strip_japanese(cells[3].get_text(strip=True))
        types = [_type_from_img(img) for img in cells[4].find_all("img")]
        abilities = _split_abilities(cells[5].get_text(strip=True))

        first_link = row.find("a", href=re.compile(r"/pokedex-champions/"))
        slug = _slug_from_href(first_link["href"]) if first_link else ""

        try:
            hp, atk, def_, sp_atk, sp_def, speed = (int(cells[i].get_text(strip=True)) for i in range(6, 12))
        except (ValueError, IndexError):
            continue

        results.append(TransferPokemon(
            number=num_text, name=name, types=types, abilities=abilities, slug=slug,
            hp=hp, atk=atk, def_=def_, sp_atk=sp_atk, sp_def=sp_def, speed=speed,
        ))

    return results


# Section heading → category slug. Sections not listed here are dropped
# entirely (current behavior: recruit tickets / coupons under "Miscellaneous
# Items" are excluded per user requirement).
_ITEMS_CATEGORY_MAP = {
    "hold items": "held",
    "mega stone": "mega-stone",
    "berries": "berry",
}


def _items_category_from_heading(heading: str) -> str | None:
    low = heading.lower().strip()
    for key, value in _ITEMS_CATEGORY_MAP.items():
        if key in low:
            return value
    return None


def parse_items_listing(html: str) -> list[ChampionsItem]:
    """Parse pokemonchampions/items.shtml — Hold Items / Mega Stones / Berries.

    The page layout is a sequence of `<b>Heading</b>` labels followed by a
    `table.dextable` with columns Picture/Name/Effect/Location. Sections whose
    heading is not mapped (e.g. Miscellaneous Items = recruit tickets) are
    skipped entirely.
    """
    soup = BeautifulSoup(html, "lxml")
    results: list[ChampionsItem] = []

    for table in soup.find_all("table", class_="dextable"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        header = rows[0].get_text(" ", strip=True)
        if "Picture" not in header or "Name" not in header:
            continue

        heading_tag = table.find_previous("b")
        if heading_tag is None:
            continue
        category = _items_category_from_heading(heading_tag.get_text(strip=True))
        if category is None:
            continue  # skipped section (e.g. tickets)

        for row in rows[1:]:
            cells = row.find_all(["th", "td"])
            if len(cells) < 4:
                continue

            icon_img = cells[0].find("img")
            icon_url = icon_img.get("src", "") if icon_img else ""
            name = cells[1].get_text(" ", strip=True)
            effect = cells[2].get_text(" ", strip=True)
            location = cells[3].get_text(" ", strip=True)

            if not name:
                continue

            results.append(ChampionsItem(
                name=name,
                effect=effect,
                location=location,
                icon_url=icon_url,
                category=category,
            ))

    return results


def parse_recruit_items(html: str) -> list[RecruitItem]:
    """Parse recruit.shtml → list of recruit tickets/items."""
    soup = BeautifulSoup(html, "lxml")

    table = soup.find("table", class_="dextable")
    if table is None:
        return []

    results: list[RecruitItem] = []
    for row in table.find_all("tr")[1:]:  # skip header
        cells = row.find_all(["th", "td"])
        if len(cells) < 4:
            continue

        icon_img = cells[0].find("img")
        icon_url = icon_img.get("src", "") if icon_img else ""
        name = cells[1].get_text(strip=True)
        effect = cells[2].get_text(strip=True)
        location = cells[3].get_text(strip=True)

        if name:
            results.append(RecruitItem(name=name, effect=effect, location=location, icon_url=icon_url))

    return results


def parse_gift_pokemon(html: str) -> list[GiftPokemon]:
    """Parse giftpokemon.shtml → list of gift Pokemon."""
    soup = BeautifulSoup(html, "lxml")

    results: list[GiftPokemon] = []
    for table in soup.find_all("table", class_="eventpoke"):
        rows = table.find_all("tr")
        if not rows:
            continue

        # Name: first cell of first row
        name = rows[0].find(["th", "td"])
        name_text = name.get_text(strip=True) if name else ""
        if not name_text:
            continue

        ability = ""
        nature = ""
        ivs: dict[str, str] = {}

        for row in rows:
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)
                if label == "Ability:":
                    ability = value
                elif label == "Nature:":
                    nature = value
                elif label in ("HP", "Atk", "Def", "SAtk", "SDef", "Speed"):
                    ivs[label] = value

        results.append(GiftPokemon(name=name_text, ability=ability, nature=nature, ivs=ivs))

    return results


_STAT_KEYS = ["hp", "atk", "def", "spAtk", "spDef", "speed"]

# Section headers that are NEVER form markers and should be ignored while walking.
# Matched by startswith (case-insensitive) so "Stats - X" is NOT caught here.
_IGNORED_HEADER_PREFIXES = (
    "weakness",
    "evolution",
    "evolutionary",
    "alternate forms",
    "gender differences",
    "damage taken",
    "picture",
    "standard moves",
    "special moves",
    "event moves",
    "egg moves",
)


def _is_ignored_header(header: str) -> bool:
    low = header.lower()
    return any(low.startswith(p) for p in _IGNORED_HEADER_PREFIXES)


def _ability_slug_fallback(name: str) -> str:
    """Serebii sometimes emits a broken '/abilitydex/.shtml' link; slugify the name."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _parse_info_name(info_table: Tag) -> str:
    rows = info_table.find_all("tr")
    if len(rows) < 2:
        return ""
    cells = rows[1].find_all(["th", "td"])
    return cells[0].get_text(strip=True) if cells else ""


_NON_FORM_LABELS = (
    "name", "no.", "japan", "french", "german", "korean", "male", "female",
    "national", "height", "weight", "classification", "gender", "other",
)


def _parse_per_form_types(info_table: Tag) -> list[tuple[str, list[str]]]:
    """Extract per-form type rows like ('Normal', ['dark']), ('Hisuian', ['normal','ghost']).

    Returns empty list if the info table does not split types by form.
    """
    result: list[tuple[str, list[str]]] = []
    for row in info_table.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if not cells or len(cells) > 3:
            continue
        label = cells[0].get_text(" ", strip=True).strip()
        if not label or len(label) > 25:
            continue
        low = label.lower()
        if any(low.startswith(p) for p in _NON_FORM_LABELS):
            continue
        type_imgs = [
            img for img in row.find_all("img")
            if "/type/" in img.get("src", "")
        ]
        if not type_imgs:
            continue
        types: list[str] = []
        for img in type_imgs:
            t = _type_from_img(img)
            if t and t not in types:
                types.append(t)
        if types:
            result.append((label, types))
    return result


def _parse_info_types(info_table: Tag) -> list[str]:
    """Base-form types.  Prefers the first per-form type row; falls back to
    scanning the second row of the info table (works when there's a single form)."""
    per_form = _parse_per_form_types(info_table)
    if per_form:
        return per_form[0][1]
    rows = info_table.find_all("tr")
    if len(rows) < 2:
        return []
    types: list[str] = []
    for img in rows[1].find_all("img"):
        src = img.get("src", "")
        if "/pokedex-bw/type/" in src or "/type/" in src:
            t = _type_from_img(img)
            if t and t not in types:
                types.append(t)
    return types


def _match_variant_types(
    variant_name: str, per_form: list[tuple[str, list[str]]]
) -> list[str] | None:
    """Find a per-form row whose label appears in the variant name (case-insensitive)."""
    low = variant_name.lower()
    for label, types in per_form:
        if label.lower() in low or low in label.lower():
            return types
    return None


def _parse_abilities_table(ab_table: Tag) -> list[AbilityRef]:
    rows = ab_table.find_all("tr")
    if not rows:
        return []
    abilities: list[AbilityRef] = []
    seen: set[str] = set()
    for a in rows[0].find_all("a"):
        name = a.get_text(strip=True)
        href = a.get("href", "")
        m = re.search(r"/abilitydex/([^/.]+)\.shtml", href)
        slug = m.group(1) if m and m.group(1) else _ability_slug_fallback(name)
        if not slug or slug in seen:
            continue
        seen.add(slug)
        abilities.append(AbilityRef(slug=slug, name=name, description=""))

    desc_text = rows[1].get_text(" ", strip=True) if len(rows) > 1 else ""
    if desc_text and abilities:
        for ab in abilities:
            others = [o.name for o in abilities if o.name != ab.name]
            lookahead = (
                "(?=(?:" + "|".join(re.escape(o) for o in others) + r")\s*:|$)"
                if others
                else r"(?=$)"
            )
            pattern = re.escape(ab.name) + r"\s*:\s*(.*?)" + lookahead
            m = re.search(pattern, desc_text)
            if m:
                ab.description = m.group(1).strip()
    return abilities


def _parse_stats_table(stats_table: Tag) -> dict[str, int]:
    for row in stats_table.find_all("tr"):
        row_text = row.get_text(" ", strip=True)
        if row_text.startswith("Base Stats"):
            nums: list[int] = []
            for c in row.find_all(["th", "td"])[1:]:
                txt = c.get_text(strip=True)
                if txt.isdigit():
                    nums.append(int(txt))
                if len(nums) == 6:
                    break
            if len(nums) == 6:
                return dict(zip(_STAT_KEYS, nums))
    return {}


def parse_pokemon_detail(html: str, slug: str) -> PokemonDetail:
    """Parse a pokedex-champions/{slug}/ detail page into base + alternate forms."""
    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table", class_="dextable")

    # ── page-level: korean name + national dex (from the first info table) ──
    first_info: Tag | None = None
    for t in tables:
        rows = t.find_all("tr")
        if not rows:
            continue
        header = rows[0].get_text(" ", strip=True)
        if header.startswith("Name") and "Type" in header:
            first_info = t
            break
    if first_info is None:
        raise ValueError(f"detail page {slug}: no info table")

    name_en = _parse_info_name(first_info)

    name_ko = ""
    for td in first_info.find_all(["td", "th"]):
        if td.get_text(" ", strip=True).startswith("Korean"):
            parent_row = td.find_parent("tr")
            if parent_row:
                row_cells = parent_row.find_all(["td", "th"])
                for i, rc in enumerate(row_cells):
                    if rc is td and i + 1 < len(row_cells):
                        name_ko = row_cells[i + 1].get_text(strip=True)
                        break
            break

    national_dex = ""
    for td in first_info.find_all(["td", "th"]):
        m = re.search(r"National\s*:\s*#?(\d+)", td.get_text(" ", strip=True))
        if m:
            national_dex = m.group(1).zfill(4)
            break

    # Per-form type map for the base info table (non-empty only for pokemon with
    # regional variants/forms sharing one info table, e.g. Raichu, Zoroark, Rotom).
    base_per_form_types = _parse_per_form_types(first_info)

    # ── walk tables, building forms ──
    forms: list[PokemonForm] = []
    current: PokemonForm | None = None
    pending_marker: str | None = None
    base_form: PokemonForm | None = None

    for t in tables:
        rows = t.find_all("tr")
        if not rows:
            continue
        header = rows[0].get_text(" ", strip=True)

        if _is_ignored_header(header):
            continue

        if header.startswith("Name") and "Type" in header:
            # Open a new form.
            name_from_table = _parse_info_name(t)
            form_name = pending_marker or name_from_table or name_en or slug
            pending_marker = None
            current = PokemonForm(
                name=form_name,
                types=_parse_info_types(t),
                abilities=[],
                base_stats={},
            )
            forms.append(current)
            if base_form is None:
                base_form = current

        elif header.startswith("Abilities"):
            if current is not None:
                current.abilities = _parse_abilities_table(t)

        elif header.startswith("Stats"):
            stats = _parse_stats_table(t)
            if not stats:
                continue
            m = re.match(r"Stats\s*-\s*(\S.*)$", header)
            variant_name = m.group(1).strip() if m else ""

            if current is not None and not current.base_stats:
                # First stats seen for the current form — assign regardless of suffix.
                current.base_stats = stats
                # Adopt a more specific variant name when serebii's stats header
                # refines the form (e.g. the Floette page opens the form table as
                # "Floette" but the stats row is "Stats - Eternal Floette" because
                # only the Eternal Flower form is playable in Champions). Limited
                # to cases where the variant name is a superset of the current
                # name to avoid renaming unrelated pokemon.
                if (
                    variant_name
                    and variant_name != current.name
                    and current.name
                    and current.name in variant_name
                ):
                    current.name = variant_name
            elif variant_name and base_form is not None:
                # Pattern B: variant inheriting base abilities; types come from the
                # per-form type map in the base info table if there's a match.
                matched_types = _match_variant_types(variant_name, base_per_form_types)
                forms.append(PokemonForm(
                    name=variant_name,
                    types=matched_types if matched_types else list(base_form.types),
                    abilities=list(base_form.abilities),
                    base_stats=stats,
                ))
            # else: trailing 'Stats -' with no owner — ignore.

        else:
            # Unknown short table → treat as a form marker for the next Name table.
            if len(rows) <= 5 and not any(
                kw in header.lower()
                for kw in ("name", "abilities", "stats", "type")
            ):
                pending_marker = header

    if not forms or not base_form or not base_form.base_stats:
        raise ValueError(f"detail page {slug}: base form missing stats")

    moves = _parse_move_slugs(soup)

    return PokemonDetail(
        slug=slug,
        name_en=name_en,
        name_ko=name_ko,
        national_dex=national_dex,
        forms=forms,
        moves=moves,
    )


def _parse_move_slugs(soup: BeautifulSoup) -> list[str]:
    """Extract move slugs from the Standard Moves dextable only.

    The page also has a 'Weakness' table and footer with type-page links
    (/attackdex-champions/fire.shtml etc) that must not be treated as moves.
    We scope the search to the dextable whose header cell reads 'Standard Moves'.
    """
    # A handful of species split their Standard Moves table per variant
    # (Floette Eternal, Meowstic Male/Female, Basculegion Male/Female).
    # Accept any dextable whose title starts with "Standard Moves".
    standard_tables: list[Tag] = []
    for t in soup.find_all("table", class_="dextable"):
        rows = t.find_all("tr", recursive=False)
        if not rows:
            continue
        header_cells = rows[0].find_all(["td", "th"], recursive=False)
        title = header_cells[0].get_text(" ", strip=True) if header_cells else ""
        if title.startswith("Standard Moves"):
            standard_tables.append(t)
    if not standard_tables:
        return []

    seen: set[str] = set()
    ordered: list[str] = []
    for tbl in standard_tables:
        for a in tbl.find_all("a", href=True):
            href = a["href"]
            if "/attackdex-champions/" not in href:
                continue
            tail = href.rsplit("/", 1)[-1]
            slug = tail.removesuffix(".shtml").strip()
            if not slug or slug in seen:
                continue
            seen.add(slug)
            ordered.append(slug)
    return ordered


@dataclass
class AbilityDetail:
    slug: str
    name_en: str
    game_text: str       # short description
    in_depth: str        # long description (fallback to game_text)


def parse_ability_detail(html: str, slug: str) -> AbilityDetail:
    """Parse an abilitydex/{slug}.shtml page."""
    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table", class_="dextable")

    info = None
    for t in tables:
        rows = t.find_all("tr")
        header = rows[0].get_text(" ", strip=True) if rows else ""
        if header.startswith("Name"):
            info = t
            break
    if info is None:
        raise ValueError(f"ability {slug}: info table missing")

    rows = info.find_all("tr")
    name_en = ""
    if len(rows) > 1:
        cells = rows[1].find_all(["th", "td"])
        if cells:
            name_en = cells[0].get_text(strip=True)

    game_text = ""
    in_depth = ""
    for i, row in enumerate(rows):
        label = row.get_text(" ", strip=True)
        if label == "Game's Text:" and i + 1 < len(rows):
            game_text = rows[i + 1].get_text(" ", strip=True)
        elif label == "In-Depth Effect:" and i + 1 < len(rows):
            in_depth = rows[i + 1].get_text(" ", strip=True)

    return AbilityDetail(
        slug=slug,
        name_en=name_en,
        game_text=game_text,
        in_depth=in_depth or game_text,
    )


# ── Champions-specific override pages ────────────────────────────────────────

@dataclass
class NewAbility:
    slug: str           # serebii ability slug (공백/하이픈 제거), e.g. "piercingdrill"
    name_en: str
    effect_en: str      # short description from the listing


def parse_new_abilities(html: str) -> list[NewAbility]:
    """Parse pokemonchampions/newabilities.shtml — Champions 신규 특성 목록.

    페이지 구조: table.tab 에 header row + 특성별 2셀(Name, Effect).
    각 Name 셀에 /abilitydex/{slug}.shtml 링크가 있음.
    """
    soup = BeautifulSoup(html, "lxml")
    tab = soup.find("table", class_="tab")
    if tab is None:
        return []
    results: list[NewAbility] = []
    for row in tab.find_all("tr", recursive=False):
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) < 2:
            continue
        name_cell, effect_cell = cells[0], cells[1]
        name_text = name_cell.get_text(" ", strip=True)
        if not name_text or name_text == "Name":
            continue
        link = name_cell.find("a", href=True)
        slug = ""
        if link and "/abilitydex/" in link["href"]:
            slug = link["href"].rsplit("/", 1)[-1].removesuffix(".shtml")
        if not slug:
            # Fallback: collapse name like T4 does
            slug = re.sub(r"[^a-z0-9]", "", name_text.lower())
        results.append(NewAbility(
            slug=slug,
            name_en=name_text,
            effect_en=effect_cell.get_text(" ", strip=True),
        ))
    return results


@dataclass
class UpdatedAttack:
    slug: str               # serebii move slug (공백/하이픈 제거), e.g. "ironhead"
    name_en: str
    pp: Optional[int]
    power: Optional[int]
    accuracy: Optional[int]
    effect_en: str
    effect_chance: Optional[int]


def _int_or_none(text: str) -> Optional[int]:
    text = (text or "").strip()
    if not text or text in ("--", "—", "-"):
        return None
    try:
        return int(text)
    except ValueError:
        return None


def parse_updated_attacks(html: str) -> list[UpdatedAttack]:
    """Parse pokemonchampions/updatedattacks.shtml — Champions 수치 변경 기술.

    각 기술이 2행 구조:
      헤더행(9셀): Name / Game / Type(img) / Cat(img) / PP / Base Power / Accuracy / Effect / Effect Chance
      비교행(5~6셀): 'S/V' / [Type/Cat] / PP / Power / Accuracy / Effect Chance
    여기서는 Champions 값(헤더행) 만 뽑는다.

    Serebii 페이지에 Acc 열에 '101' 이 적힌 행들이 있는데(예: Growth),
    이는 절대 명중(—) 을 의미하는 표기로 보임 → None 반환.
    """
    soup = BeautifulSoup(html, "lxml")
    tab = soup.find("table", class_="tab")
    if tab is None:
        return []
    results: list[UpdatedAttack] = []
    for row in tab.find_all("tr", recursive=False):
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) < 9:
            continue
        name_cell = cells[0]
        name_text = name_cell.get_text(" ", strip=True)
        if name_text in ("", "Name"):
            continue
        # Second column should read "Champions" for the header row of each move.
        game_text = cells[1].get_text(" ", strip=True)
        if game_text != "Champions":
            continue
        link = name_cell.find("a", href=True)
        slug = ""
        if link and "/attackdex-champions/" in link["href"]:
            slug = link["href"].rsplit("/", 1)[-1].removesuffix(".shtml")
        if not slug:
            slug = re.sub(r"[^a-z0-9]", "", name_text.lower())
        pp = _int_or_none(cells[4].get_text(strip=True))
        power = _int_or_none(cells[5].get_text(strip=True))
        accuracy_raw = cells[6].get_text(strip=True)
        accuracy = _int_or_none(accuracy_raw)
        # 101 is serebii's sentinel for "always hits"
        if accuracy == 101:
            accuracy = None
        effect_en = cells[7].get_text(" ", strip=True)
        effect_chance = _int_or_none(cells[8].get_text(strip=True))
        results.append(UpdatedAttack(
            slug=slug,
            name_en=name_text,
            pp=pp,
            power=power,
            accuracy=accuracy,
            effect_en=effect_en,
            effect_chance=effect_chance,
        ))
    return results


# ── smoke test ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    import logging
    from pathlib import Path

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    root = Path(__file__).resolve().parent.parent
    raw = root / "data" / "raw" / "www.serebii.net"

    files = {
        "pokemon":  raw / "pokemonchampions_pokemon.shtml_977a3d85.html",
        "transfer": raw / "pokemonchampions_transferonly.shtml_7584e6c4.html",
        "recruit":  raw / "pokemonchampions_recruit.shtml_e4a80939.html",
        "gift":     raw / "pokemonchampions_giftpokemon.shtml_7d85d499.html",
    }

    pokemon = parse_pokemon_list(files["pokemon"].read_text(encoding="utf-8"))
    print(f"\npokemon list: {len(pokemon)} entries")
    for p in pokemon[:3]:
        print(f"  {p}")

    transfer = parse_transfer_only(files["transfer"].read_text(encoding="utf-8"))
    print(f"\ntransfer-only: {len(transfer)} entries")
    for p in transfer[:3]:
        print(f"  {p}")

    recruit = parse_recruit_items(files["recruit"].read_text(encoding="utf-8"))
    print(f"\nrecruit items: {len(recruit)} entries")
    for r in recruit[:3]:
        print(f"  {r}")

    gifts = parse_gift_pokemon(files["gift"].read_text(encoding="utf-8"))
    print(f"\ngift pokemon: {len(gifts)} entries")
    for g in gifts[:3]:
        print(f"  {g}")

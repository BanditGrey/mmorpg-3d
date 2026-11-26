#!/usr/bin/env python3
"""Generate one transparent SVG icon per ITEM_TEMPLATES entry.

Run from any working directory: python tools/generate_item_icons.py
The source of truth for item ids, rarity and icon family is shared/src/gameData.ts.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "shared/src/gameData.ts"
OUT = ROOT / "client/public/icons/items"

RARITY = {
    "common": ("#9ca3af", "#5e7184"),
    "uncommon": ("#65d98a", "#16884b"),
    "rare": ("#61a9ff", "#2859ce"),
    "epic": ("#c38aff", "#7136b9"),
    "legendary": ("#ffc85a", "#b76510"),
    "mythic": ("#ff70c7", "#8b39c0"),
}

# Characteristic materials make named tiers visibly different, not just recolored borders.
SPECIAL = {
    "iron": ("#b6c2cc", "#465361"), "steel": ("#e0e7ef", "#5e7188"),
    "runic": ("#74d8ff", "#3157bc"), "crypt": ("#b4a4b9", "#392f47"),
    "volcanic": ("#ff9a43", "#742b21"), "frost": ("#b8f2ff", "#458ebd"),
    "abyss": ("#bb73ff", "#21143f"), "celestial": ("#fff0a6", "#8f7736"),
    "eternal": ("#91c7ff", "#242454"), "astral": ("#8ddcff", "#312f8d"),
    "lich": ("#ce94ff", "#44305d"), "omni": ("#fff2b1", "#363b88"),
    "jade": ("#9bf0b1", "#237455"), "magma": ("#ffb262", "#75251d"),
    "seraph": ("#fff0b5", "#6d536e"), "crimson": ("#ff8991", "#762332"),
    "dragon": ("#f3ab5e", "#663228"), "shadow": ("#b3a0dc", "#272239"),
    "titan": ("#f2cf77", "#65502a"), "immortal": ("#ffe7a0", "#73562a"),
    "swift": ("#b1e1ff", "#334d70"), "scout": ("#b7d28b", "#435a3b"),
    "warlord": ("#e4c47a", "#5f3e27"), "traveler": ("#d8b67a", "#56402e"),
    "templar": ("#f8e3a0", "#756027"), "infinity": ("#a6a4ff", "#332767"),
    "ember": ("#ffae5c", "#763222"), "legend": ("#ffe276", "#705124"),
    "fury": ("#ff786c", "#782626"), "wisdom": ("#75dfff", "#2d4781"),
    "crit": ("#f4e28a", "#665026"), "fang": ("#e5d8c5", "#665947"),
    "core": ("#ffc76b", "#895422"), "shard": ("#da9cff", "#512c90"),
    "essence": ("#a4f0df", "#306d80"), "horse": ("#d6a46a", "#61412e"),
    "wolf": ("#c3d2e2", "#384657"), "lava": ("#ff784d", "#57211d"),
    "griffin": ("#f1d991", "#665735"), "mount_dragon": ("#bf83ee", "#38224f"),
}

FAMILY_SHAPES = {
    "sword": '<path d="M32 7 39 14 28 41 22 45 20 38Z"/><path d="m19 39 7 7-8 9-5-5Z" fill="url(#dark)"/><path d="m17 34 13 12-3 4-13-12Z" fill="url(#gold)"/>',
    "staff": '<path d="m19 55 23-39" fill="none" stroke="url(#dark)" stroke-width="5" stroke-linecap="round"/><path d="M34 13 42 7 50 13 47 23 37 25 31 19Z"/><path d="m39 15 5-3 4 4-2 5-6 1-3-4Z" fill="#f6fbff" opacity=".78"/>',
    "armor": '<path d="m18 15 9-4 5 6 5-6 9 4 8 10-7 7-2 20H19l-2-20-7-7Z"/><path d="m26 20 6 7 6-7 3 24H23Z" fill="url(#dark)" opacity=".78"/><path d="M23 34h18" fill="none" stroke="url(#gold)" stroke-width="2.5"/>',
    "helm": '<path d="M15 35C15 16 23 9 32 9s17 7 17 26l5 12H10Z"/><path d="M13 33h38l-3 9H16Z" fill="url(#dark)"/><path d="M24 35v7m16-7v7" stroke="#e9f5ff" stroke-width="2"/>',
    "gloves": '<path d="m13 29 3-13 5-2 3 9 3-14 5 1 1 13 4-10 5 2-1 11 4-6 5 3-4 17-8 9H18l-7-11Z"/><path d="M15 39h34l-2 8H17Z" fill="url(#dark)"/><path d="M20 44h24" stroke="url(#gold)" stroke-width="2"/>',
    "boots": '<path d="M21 10h16v25l7 6 11 3v9H15l2-10 5-7Z"/><path d="M19 43h30l6 5v5H15Z" fill="url(#dark)"/><path d="M20 17h15" stroke="url(#gold)" stroke-width="3"/>',
    "ring": '<ellipse cx="32" cy="38" rx="17" ry="12" fill="none" stroke="url(#gold)" stroke-width="6"/><ellipse cx="32" cy="38" rx="11" ry="7" fill="none" stroke="#f6e7b0" stroke-width="1.5"/><path d="m32 8 10 10-10 12-10-12Z"/>',
    "cloak": '<path d="M22 10 32 15 42 10 51 20 46 55 32 48 18 55 13 20Z"/><path d="m22 12 10 8 10-8-5 14H27Z" fill="url(#dark)"/><circle cx="32" cy="18" r="3.5" fill="url(#gold)"/>',
    "amulet": '<path d="M19 10c0 17 26 17 26 0" fill="none" stroke="url(#gold)" stroke-width="3"/><path d="m32 22 13 15-13 20-13-20Z"/><path d="m32 29 7 8-7 12-7-12Z" fill="#fff" opacity=".25"/>',
    "pot_hp": '<path d="M26 11h12v8l9 8 5 17c1 8-7 12-20 12s-21-4-20-12l5-17 9-8Z"/><path d="M18 35h28l4 11c0 5-7 8-18 8s-18-3-18-8Z" fill="url(#fluid)"/><path d="M26 11h12v6H26Z" fill="url(#gold)"/><path d="m23 28 5 4" stroke="#fff" stroke-width="3" opacity=".65"/>',
    "pot_mp": '<path d="M26 11h12v8l9 8 5 17c1 8-7 12-20 12s-21-4-20-12l5-17 9-8Z"/><path d="M18 35h28l4 11c0 5-7 8-18 8s-18-3-18-8Z" fill="url(#fluid)"/><path d="M26 11h12v6H26Z" fill="url(#gold)"/><path d="M32 27v15m-6-8h12" stroke="#eefbff" stroke-width="2.5"/>',
    "mat": '<path d="m32 5 17 13-3 27-14 13-14-13-3-27Z"/><path d="m32 11 10 10-4 20-6 8-6-8-4-20Z" fill="#fff" opacity=".26"/><path d="m32 18 4 8-4 8-4-8Z" fill="#fff" opacity=".75"/>',
    "elixir": '<path d="M27 9h10v8l8 8 6 19c1 7-7 12-19 12s-20-5-19-12l6-19 8-8Z"/><path d="M19 34h26l4 11c-1 5-7 8-17 8s-16-3-17-8Z" fill="url(#fluid)"/><path d="M27 9h10v7H27Z" fill="url(#gold)"/><path d="m32 26 2 5 5 1-5 3-2 5-2-5-5-3 5-1Z" fill="#fff4bd"/>',
}


def palette_for(item_id: str, rarity: str, family: str) -> tuple[str, str, str]:
    detail, dark = RARITY.get(rarity, RARITY["common"])
    for token, pair in SPECIAL.items():
        if token in item_id:
            detail, dark = pair
            break
    # Distinguish potion families even where their rarity is identical.
    if family in ("pot_hp", "pot_mp"):
        detail, dark = (("#ff696b", "#7d1f2a") if family == "pot_hp" else ("#63caff", "#1e347b"))
    return detail, dark, RARITY.get(rarity, RARITY["common"])[0]


def build_svg(item_id: str, name: str, family: str, rarity: str) -> str:
    main, dark, rarity_color = palette_for(item_id, rarity, family)
    shape = FAMILY_SHAPES.get(family, FAMILY_SHAPES["sword"])
    # A family-independent sigil makes every template distinct without relying on a tiny label.
    sigil = sum((i + 1) * ord(ch) for i, ch in enumerate(item_id)) % 4
    extras = [
        '<path d="M29 24h6m-3-3v6" stroke="#fff" stroke-width="1.4" opacity=".85"/>',
        '<circle cx="32" cy="27" r="3.1" fill="none" stroke="#fff" stroke-width="1.3" opacity=".8"/>',
        '<path d="m32 22 1.7 3.3 3.7.5-2.7 2.5.7 3.6-3.4-1.8-3.3 1.8.6-3.6-2.6-2.5 3.7-.5Z" fill="#fff" opacity=".78"/>',
        '<path d="M28 26h8M32 22v8" stroke="#fff" stroke-width="1.4" opacity=".8"/>',
    ]
    # Mounts get species-specific 3D-ish profile silhouettes rather than a repeated armor mark.
    mount_mark = ''
    if family == "mount":
        species = next((k for k in ("horse", "wolf", "lava", "griffin", "dragon") if k in item_id), "horse")
        profiles = {
            "horse": '<path d="M18 44 22 31 31 26 38 17 46 20 43 29 49 37 47 48h-5l-2-10-9 2-4 9h-5l2-11-4 7Z"/>',
            "wolf": '<path d="m17 41 7-11 13-2 8-9 5 4-3 9 6 8-5 5-7-6-9 2-6 8-5-1 3-9Z"/><path d="m38 27 8-8-2 11Z" fill="url(#gold)"/>',
            "lava": '<path d="M17 44 22 31 31 26 38 17 46 20 43 29 49 37 47 48h-5l-2-10-9 2-4 9h-5l2-11-4 7Z"/><path d="m25 31 5 4-4 8m10-17 4 5-3 7" fill="none" stroke="#ff693e" stroke-width="2.3"/>',
            "griffin": '<path d="M16 44 22 31 32 27 38 17l8 2 1 10 7 7-5 8h-6l-1-8-9 2-4 9h-6l2-10Z"/><path d="m22 30-9-8 2 13m27-15 6-8 4 12" fill="none" stroke="url(#gold)" stroke-width="3"/>',
            "dragon": '<path d="m16 44 7-11 10-2 7-11 8 4-2 10 8 7-7 7-7-7-9 3-4 8h-6l2-10Z"/><path d="m24 31-9-8 5 14m19-12 7-11 2 14" fill="none" stroke="url(#gold)" stroke-width="3"/>',
        }
        mount_mark = profiles[species]
        shape = ''
    else:
        mount_mark = ''
    fluid = main
    safe_name = html.escape(name, quote=True)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="{safe_name}">
  <defs>
    <linearGradient id="body" x1=".12" y1=".08" x2=".88" y2=".94"><stop stop-color="#f4f7fa"/><stop offset=".22" stop-color="{main}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
    <linearGradient id="dark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{main}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1b5"/><stop offset=".48" stop-color="{rarity_color}"/><stop offset="1" stop-color="#755027"/></linearGradient>
    <linearGradient id="fluid" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{main}"/><stop offset="1" stop-color="{dark}"/></linearGradient>
  </defs>
  <g fill="url(#body)" stroke="#101827" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">{shape}{mount_mark}</g>
  <g>{extras[sigil] if family not in ('pot_hp','pot_mp','mount') else ''}</g>
  <path d="M12 56h40" stroke="{rarity_color}" stroke-width="1" opacity=".42"/>
</svg>'''
    return svg


def main() -> None:
    text = DATA.read_text(encoding="utf-8")
    section = text.split("export const ITEM_TEMPLATES", 1)[1].split("export const QUEST_TEMPLATES", 1)[0]
    entries = re.finditer(r"^\s{2}([a-zA-Z0-9_]+): \{(.*?)(?=^\s{2}[a-zA-Z0-9_]+: \{|\Z)", section, re.M | re.S)
    OUT.mkdir(parents=True, exist_ok=True)
    count = 0
    cards = []
    for match in entries:
        item_id, body = match.group(1), match.group(2)
        def prop(key: str, default: str = "") -> str:
            found = re.search(rf"{key}: '([^']*)'", body)
            return found.group(1) if found else default
        name = prop("name", item_id)
        family = prop("iconKey", "sword")
        rarity = prop("rarity", "common")
        (OUT / f"{item_id}.svg").write_text(build_svg(item_id, name, family, rarity), encoding="utf-8")
        color = RARITY.get(rarity, RARITY["common"])[0]
        cards.append(
            f'<article style="--rarity:{color}"><img src="/icons/items/{item_id}.svg" alt=""><div><b>{html.escape(name)}</b><small>{item_id}</small><small>{rarity} · {family}</small></div></article>'
        )
        count += 1
    gallery = """<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Eldoria · Item Icons</title><style>
      *{box-sizing:border-box}body{margin:0;background:#0b1019;color:#e5e7eb;font:14px system-ui;padding:24px}header{max-width:1200px;margin:0 auto 20px}h1{margin:0 0 6px;color:#f5d481}p{margin:0;color:#94a3b8}.grid{max-width:1200px;margin:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}article{display:flex;align-items:center;gap:10px;min-height:82px;padding:10px;background:#131c29;border:1px solid color-mix(in srgb,var(--rarity) 58%,#243244);border-radius:12px}img{width:52px;height:52px;object-fit:contain;flex:none;background:radial-gradient(circle,#263449,#101722);border-radius:9px}article div{display:grid;gap:3px;min-width:0}b{font-size:12px;line-height:1.2}small{font-size:10px;color:#94a3b8;overflow-wrap:anywhere}</style><header><h1>Eldoria Online · Item Icons</h1><p>SVGs individuais por item · cor de moldura indica raridade · 84 templates</p></header><main class=\"grid\">""" + "".join(cards) + "</main></html>"
    (ROOT / "client/public/item-icons-preview.html").write_text(gallery, encoding="utf-8")
    print(f"Generated {count} per-item SVG icons in {OUT}; gallery at client/public/item-icons-preview.html")


if __name__ == "__main__":
    main()

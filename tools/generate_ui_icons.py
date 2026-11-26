#!/usr/bin/env python3
"""Generate small, consistent monochrome/elemental HUD SVGs."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "client/public/icons/ui"

ICONS = {
    "power": ('#f5d481', '<path d="M39 8 18 34l11 2-4 20 22-29-12-2Z"/>'),
    "moon": ('#9fc5ff', '<path d="M44 9a22 22 0 1 0 11 37A24 24 0 0 1 44 9Z"/><path d="m17 15 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z"/>'),
    "settings": ('#d9c58d', '<circle cx="32" cy="32" r="9"/><path d="M32 7v7m0 36v7M7 32h7m36 0h7M14.3 14.3l5 5m25.4 25.4 5 5m0-35.4-5 5M19.3 44.7l-5 5"/><circle cx="32" cy="32" r="21"/>'),
    "event": ('#d8b4fe', '<path d="m32 5 6.5 18.5L57 32l-18.5 6.5L32 57l-6.5-18.5L7 32l18.5-8.5Z"/><circle cx="32" cy="32" r="5"/>'),
    "buff": ('#d8b4fe', '<path d="M25 8h14v9l9 9 4 20c1 6-7 10-20 10s-21-4-20-10l4-20 9-9Z"/><path d="M21 35h22l3 11c-1 4-6 6-14 6s-13-2-14-6Z"/><path d="M32 27v13m-5-7h10"/>'),
    "boss": ('#fca5a5', '<path d="M18 25 9 14l2 22 8 4m27-15 9-11-2 22-8 4M18 21c1-9 7-14 14-14s13 5 14 14l-3 21-11 14-11-14Z"/><circle cx="24" cy="29" r="2" fill="#fca5a5"/><circle cx="40" cy="29" r="2" fill="#fca5a5"/><path d="M26 39h12"/>'),
    "wave": ('#fbbf24', '<path d="M8 18h18l8 8-8 8H8m48-16H38l-8 8 8 8h18"/><path d="M32 33v20m-8-8 8 8 8-8"/>'),
    "auto": ('#7dd3fc', '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="8"/><path d="M32 4v13m0 30v13M4 32h13m30 0h13"/>'),
    "pet": ('#a7f3d0', '<path d="M18 34c-4-5-3-12 2-13 4-1 7 4 8 8m7 0c1-4 4-9 8-8 5 1 6 8 2 13m-27 3c0-7 6-12 14-12s14 5 14 12-5 13-14 13-14-6-14-13Z"/>'),
    "hero": ('#f5d481', '<circle cx="32" cy="20" r="10"/><path d="M14 55c1-13 7-20 18-20s17 7 18 20M20 37l12 8 12-8"/>'),
    "bag": ('#d8c08b', '<path d="M15 22h34l4 33H11Z"/><path d="M23 23v-5a9 9 0 0 1 18 0v5"/><path d="M24 34h16"/>'),
    "skills": ('#c4b5fd', '<path d="M13 12h28a8 8 0 0 1 8 8v32H21a8 8 0 0 1-8-8Z"/><path d="M21 52V21a9 9 0 0 1 9-9M32 25l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>'),
    "map": ('#7dd3fc', '<path d="m8 16 16-7 16 7 16-7v39l-16 7-16-7-16 7Z"/><path d="M24 9v39m16-32v39"/><path d="M32 18a7 7 0 0 0-7 7c0 6 7 14 7 14s7-8 7-14a7 7 0 0 0-7-7Z"/>'),
    "social": ('#86efac', '<circle cx="24" cy="23" r="8"/><circle cx="43" cy="26" r="6"/><path d="M8 53c1-11 6-17 16-17s15 6 16 17m-2-14c9-2 16 3 18 12"/>'),
    "menu": ('#cbd5e1', '<rect x="9" y="9" width="18" height="18" rx="3"/><rect x="37" y="9" width="18" height="18" rx="3"/><rect x="9" y="37" width="18" height="18" rx="3"/><rect x="37" y="37" width="18" height="18" rx="3"/>'),
    "quest": ('#f5d481', '<path d="M17 9h30v46H17z"/><path d="M24 20h16m-16 8h16m-16 8h9"/><path d="m31 43 4 4 9-10"/>'),
    "hp": ('#fb7185', '<path d="M32 54 11 33C2 20 19 9 31 22l1 2 2-2c12-13 29-2 19 11Z"/>'),
    "mp": ('#60a5fa', '<path d="M32 8C25 20 15 31 15 40a17 17 0 0 0 34 0C49 31 39 20 32 8Z"/><path d="M24 42c1 5 4 7 8 8"/>'),
    "coin": ('#fbbf24', '<circle cx="32" cy="32" r="23"/><circle cx="32" cy="32" r="17"/><path d="M38 22c-2-3-12-4-13 2-1 7 14 4 14 12 0 7-11 10-18 4m11-23v31"/>'),
    "loot": ('#d6b873', '<path d="M10 23h44v31H10z"/><path d="M8 18h48v10H8z"/><path d="M25 18c-8-11 8-17 10-4 3-13 18-7 10 4"/><path d="M27 34h10v10H27z"/>'),
}

cards = []
for name, (color, shape) in ICONS.items():
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="{color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">{shape}</g></svg>'''
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
    cards.append(f'<article><img src="/icons/ui/{name}.svg" alt=""><b>{name}</b></article>')
gallery = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Eldoria · HUD Icons</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#0b1019;color:#e5e7eb;font:14px system-ui}h1{color:#f5d481}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}article{display:grid;justify-items:center;gap:8px;padding:14px;border:1px solid #344154;border-radius:10px;background:#131c29}img{width:40px;height:40px}</style><h1>Eldoria · HUD Icons</h1><main class="grid">''' + ''.join(cards) + '</main></html>'
(ROOT / "client/public/ui-icons-preview.html").write_text(gallery, encoding="utf-8")
print(f"Generated {len(ICONS)} HUD icons in {OUT}; gallery at /ui-icons-preview.html")

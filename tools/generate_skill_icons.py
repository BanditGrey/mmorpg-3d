#!/usr/bin/env python3
"""Generate class-specific SVG ability glyphs from the shared skill catalog."""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "shared/src/gameData.ts"
OUT = ROOT / "client/public/icons/skills"

SYMBOLS = {
    "w_slash": '<path d="M14 48 47 14M28 17l19-3-3 19"/><path d="m13 50 7 2 3-7"/>',
    "w_whirl": '<path d="M43 22a17 17 0 1 0 4 17M43 22l2 10 9-5"/><path d="M32 21v22m-11-11h22"/>',
    "w_crush": '<path d="M32 12v27m-10-5h20l5 8H17l5-8Z"/><path d="m17 48-5 6m17-6-1 7m17-7 5 6"/>',
    "w_fury": '<path d="m32 7 5 15 15-6-8 14 12 8-17 1-7 16-7-16-17-1 12-8-8-14 15 6Z"/>',
    "w_cleave": '<path d="M13 45 47 13l5 6-32 35-9-1Z"/><path d="m19 37 9 8M26 29l9 8M33 22l9 8"/>',
    "w_execute": '<path d="M32 8 50 17v14c0 12-8 20-18 25-10-5-18-13-18-25V17Z"/><path d="m23 34 6 6 13-15"/>',
    "m_bolt": '<path d="M36 7 17 35h13l-3 22 20-31H34Z"/>',
    "m_nova": '<path d="M32 8v14m0 20v14M8 32h14m20 0h14M15 15l10 10m14 14 10 10m0-34L39 25M25 39 15 49"/><circle cx="32" cy="32" r="8"/>',
    "m_meteor": '<path d="m34 12 18 18-17 20-19-18Z"/><path d="m27 14-12-7m13 15L9 17m13 8L7 26"/><circle cx="37" cy="29" r="3"/>',
    "m_storm": '<path d="M37 10c-17-4-27 11-19 22 4 6 14 8 20 2 5-5 2-13-4-13-5 0-7 6-3 8"/><path d="m39 13 12-4-4 12"/>',
    "m_chain": '<path d="m17 13 12 10-8 9 15 9-7 10M39 12l-6 10 11 5-8 10 9 5"/><circle cx="17" cy="13" r="3"/><circle cx="47" cy="42" r="3"/>',
    "m_singularity": '<circle cx="32" cy="32" r="6" fill="currentColor"/><path d="M32 8a24 24 0 0 1 21 13M56 32a24 24 0 0 1-13 21M32 56A24 24 0 0 1 11 43M8 32a24 24 0 0 1 13-21"/><path d="M32 15a17 17 0 0 1 15 9M49 34a17 17 0 0 1-10 13"/>',
    "a_shot": '<path d="M12 32h37m-12-12 13 12-13 12"/><path d="M17 23v18"/>',
    "a_volley": '<path d="M12 19h40M12 32h40M12 45h40m-12-9 12-4-12-4m-8-9 8-4-8-4m8 35 8-4-8-4"/>',
    "a_pierce": '<path d="M9 32h45l-13-13m13 13L41 45"/><path d="m14 22 7 10-7 10"/>',
    "a_phoenix": '<path d="M32 54c-18-8-19-24-5-37l4-9 6 12c12 5 16 17 8 28l-8-9-5 15Z"/><path d="M31 44c-4-7-2-12 3-17 0 8 7 10 6 17"/>',
    "a_snipe": '<circle cx="32" cy="32" r="19"/><circle cx="32" cy="32" r="8"/><path d="M32 6v14m0 24v14M6 32h14m24 0h14"/><path d="m28 36 24-24"/>',
    "a_tempest": '<path d="M11 23h34c10 0 10 13 0 13H27c-8 0-8 11 0 11h19"/><path d="m38 15 9 8-9 8m-1 8 9 6-9 6"/>',
    "s_stab": '<path d="M18 51 44 14l5 5-24 38Z"/><path d="m15 48 10 7m12-24 8 6"/><path d="m40 22 7-8 5 5-8 8"/>',
    "s_fan": '<path d="M32 48 12 20m20 28-7-33m7 33 7-33m-7 33 20-28"/><path d="M25 49a8 8 0 0 0 14 0"/>',
    "s_ambush": '<path d="M32 10 51 27 32 54 13 27Z"/><path d="m21 31 11-8 11 8-11 8Z"/><circle cx="32" cy="31" r="3" fill="currentColor"/>',
    "s_phantom": '<path d="M14 47c-3-21 5-34 18-34s21 13 18 34l-8-5-5 8-5-5-5 5-5-8Z"/><path d="M24 31h2m12 0h2M28 39h8"/>',
    "s_shadow_strike": '<path d="m19 52 22-39 7 6-20 40Z"/><path d="m12 18 16 7M9 29l17 3M15 40l13-1"/><circle cx="45" cy="16" r="4"/>',
    "s_lotus": '<path d="M32 51C13 47 11 34 22 29c-1-10 7-16 10-19 3 3 11 9 10 19 11 5 9 18-10 22Z"/><path d="M32 48V21m0 18c-7-9-13-10-18-8m18 8c7-9 13-10 18-8"/>',
    "p_smite": '<path d="M32 7 37 25 55 32 37 39 32 57 25 39 7 32 25 25Z"/><path d="M32 18v28M18 32h28"/>',
    "p_consecrate": '<circle cx="32" cy="32" r="21"/><circle cx="32" cy="32" r="12"/><path d="M32 4v11m0 34v11M4 32h11m34 0h11"/><path d="m32 22 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
    "p_hammer": '<path d="M18 17h27l8 8-8 8H18l-8-8Z"/><path d="M31 32 23 54m8-22 11 7"/><path d="M17 21h24"/>',
    "p_wrath": '<circle cx="32" cy="32" r="12"/><path d="M32 5v13m0 28v13M5 32h13m28 0h13M13 13l9 9m20 20 9 9m0-38-9 9m-20 20-9 9"/><path d="m32 20 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z"/>',
    "p_aegis": '<path d="M32 7 51 16v15c0 12-8 20-19 26-11-6-19-14-19-26V16Z"/><path d="m32 17 3 10 10 5-10 4-3 11-4-11-9-4 9-5Z"/>',
    "p_spear": '<path d="m32 7 12 17-9 3v27h-6V27l-9-3Z"/><path d="M20 36 9 43m35-7 11 7M20 46l-8 5m32-5 8 5"/>',
}


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    section = source.split("export const SKILLS", 1)[1].split("export const ", 1)[0]
    blocks = re.finditer(r"id: '([^']+)'.*?name: '([^']+)'.*?color: '(#[0-9a-fA-F]{6})'", section, re.S)
    OUT.mkdir(parents=True, exist_ok=True)
    count = 0
    cards = []
    for match in blocks:
        skill_id, name, color = match.groups()
        shape = SYMBOLS.get(skill_id)
        if not shape:
            raise ValueError(f"No SVG symbol for skill {skill_id}")
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="{html.escape(name, quote=True)}">
<defs><radialGradient id="glow"><stop stop-color="{color}" stop-opacity=".48"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient></defs>
<circle cx="32" cy="32" r="29" fill="url(#glow)"/><g fill="none" stroke="{color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">{shape}</g>
</svg>'''
        (OUT / f"{skill_id}.svg").write_text(svg, encoding="utf-8")
        cards.append(f'<article><img src="/icons/skills/{skill_id}.svg"><div><b>{html.escape(name)}</b><small>{skill_id}</small></div></article>')
        count += 1
    gallery = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Eldoria · Skills</title><style>*{box-sizing:border-box}body{margin:0;background:#0b1019;color:#e5e7eb;font:14px system-ui;padding:24px}h1{color:#f5d481}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}article{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid #344154;border-radius:10px;background:#131c29}img{width:52px;height:52px}small{display:block;color:#94a3b8;font-size:10px}</style><h1>Eldoria · Skill Icons</h1><main class="grid">''' + ''.join(cards) + '</main></html>'
    (ROOT / "client/public/skill-icons-preview.html").write_text(gallery, encoding="utf-8")
    print(f"Generated {count} skill icons and gallery")


if __name__ == "__main__":
    main()

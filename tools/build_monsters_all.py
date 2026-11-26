"""Build a safe staging batch of all 22 monster GLBs.

Run with Blender's Python environment:
    blender -b --python tools/build_monsters_all.py

Assets go to client/public/models/monster_rebuild_staging, not over live models.
Review all previews/GLBs before copying approved files into the runtime model folder.
"""
from __future__ import annotations

import os
from pathlib import Path

import build_monsters_v2 as base
import build_monsters_remaining as remaining
import build_bosses_batch as bosses
import build_pet_and_lich as lich

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "build/monster_glb_staging"
PREVIEWS = ROOT / "build/monster_previews"
STAGING.mkdir(parents=True, exist_ok=True)
PREVIEWS.mkdir(parents=True, exist_ok=True)

# Redirect all legacy builders to a safe, inspectable staging folder.
for module in (base, remaining, bosses, lich):
    module.OUT_DIR = str(STAGING)
    if hasattr(module, "PREV_DIR"):
        module.PREV_DIR = str(PREVIEWS)

# Low/mid-tier creatures and first prototype silhouettes.
base.build_slime()
base.build_wolf()
base.build_orc()

# Remaining ordinary mobs: insect, elemental, humanoid and beast forms.
remaining.build_spider()
remaining.build_scarab()
remaining.build_magma_elem()
remaining.build_biped_mob("bandit", (0.28, 0.20, 0.15), (0.45, 0.34, 0.25), (0.22, 0.24, 0.28), (0.55, 0.42, 0.22), (1.0, 0.72, 0.2), scale=0.95, seed=651)
remaining.build_biped_mob("treant", (0.22, 0.14, 0.08), (0.38, 0.26, 0.14), (0.12, 0.38, 0.16), (0.28, 0.65, 0.25), (0.35, 1.0, 0.45), scale=1.25, has_horns=True, seed=652)
remaining.build_biped_mob("wraith", (0.08, 0.18, 0.28), (0.18, 0.42, 0.65), (0.14, 0.28, 0.45), (0.35, 0.75, 0.95), (0.25, 0.85, 1.0), scale=1.05, style="caster", seed=653)
remaining.build_biped_mob("orc_shaman", (0.22, 0.42, 0.14), (0.38, 0.62, 0.22), (0.55, 0.22, 0.10), (0.92, 0.45, 0.14), (1.0, 0.45, 0.08), scale=1.1, style="caster", has_horns=True, seed=654)
remaining.build_biped_mob("skeleton_knight", (0.68, 0.66, 0.58), (0.86, 0.84, 0.76), (0.24, 0.28, 0.36), (0.52, 0.58, 0.68), (0.45, 0.85, 1.0), scale=1.08, seed=655)
remaining.build_biped_mob("frost_yeti", (0.65, 0.82, 0.95), (0.92, 0.96, 1.0), (0.22, 0.48, 0.72), (0.55, 0.85, 1.0), (0.25, 0.88, 1.0), scale=1.22, has_horns=True, seed=656)
remaining.build_biped_mob("abyss_fiend", (0.38, 0.06, 0.12), (0.72, 0.12, 0.22), (0.18, 0.14, 0.18), (0.52, 0.14, 0.24), (1.0, 0.22, 0.38), scale=1.18, has_wings=True, has_horns=True, seed=657)
remaining.build_biped_mob("seraph_fallen", (0.22, 0.18, 0.28), (0.45, 0.38, 0.55), (0.72, 0.58, 0.22), (0.95, 0.82, 0.38), (0.95, 0.75, 0.25), scale=1.15, has_wings=True, seed=658)
remaining.build_biped_mob("void_stalker", (0.10, 0.04, 0.22), (0.28, 0.12, 0.52), (0.18, 0.10, 0.32), (0.52, 0.24, 0.78), (0.78, 0.32, 1.0), scale=1.12, has_horns=True, seed=659)

# Bosses; stronger silhouettes and stats are still determined by game data.
bosses.build_titan_boss("boss_golem", (0.24, 0.22, 0.20), (0.42, 0.38, 0.34), (0.35, 0.28, 0.18), (0.65, 0.52, 0.28), (1.0, 0.45, 0.08), has_wings=False, has_horns=False, has_crown=False, seed=510)
bosses.build_titan_boss("sand_golem", (0.58, 0.44, 0.22), (0.82, 0.66, 0.36), (0.72, 0.56, 0.20), (0.95, 0.78, 0.32), (1.0, 0.82, 0.22), has_wings=False, has_horns=False, has_crown=True, seed=520)
bosses.build_titan_boss("ice_dragon", (0.12, 0.32, 0.52), (0.45, 0.78, 0.96), (0.25, 0.55, 0.85), (0.72, 0.92, 1.0), (0.25, 0.85, 1.0), has_wings=True, has_horns=True, has_crown=False, seed=530)
bosses.build_titan_boss("abyss_lord", (0.18, 0.04, 0.08), (0.42, 0.08, 0.14), (0.16, 0.12, 0.14), (0.55, 0.12, 0.22), (1.0, 0.15, 0.32), has_wings=True, has_horns=True, has_crown=True, seed=540)
bosses.build_titan_boss("celestial_warden", (0.72, 0.68, 0.58), (0.95, 0.92, 0.84), (0.85, 0.68, 0.22), (1.0, 0.88, 0.45), (1.0, 0.92, 0.45), has_wings=True, has_horns=False, has_crown=True, seed=550)
bosses.build_titan_boss("eternal_emperor", (0.18, 0.08, 0.32), (0.42, 0.22, 0.65), (0.82, 0.62, 0.22), (1.0, 0.82, 0.38), (0.78, 0.35, 1.0), has_wings=True, has_horns=True, has_crown=True, seed=560)

lich.build_ancient_lich()

expected = 22
actual = len(list(STAGING.glob("*.glb")))
if actual != expected:
    raise RuntimeError(f"Expected {expected} staged monster GLBs, found {actual} in {STAGING}")
print(f"Built {actual} monster GLBs into staging: {STAGING}")
print(f"Review renders in: {PREVIEWS}")

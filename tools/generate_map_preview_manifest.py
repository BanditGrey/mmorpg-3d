#!/usr/bin/env python3
"""Generate compact preview images for the map travel sheet from approved concepts."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "references"
OUTPUT = ROOT / "client/public/previews/maps"
OUTPUT.mkdir(parents=True, exist_ok=True)

for concept in sorted(SOURCE.glob("concept_map_*.jpg")):
    map_id = concept.stem.removeprefix("concept_map_")
    target = OUTPUT / f"{map_id}.jpg"
    subprocess.run(
        ["convert", str(concept), "-resize", "360x200^", "-gravity", "center",
         "-extent", "360x200", "-strip", "-quality", "78", str(target)],
        check=True,
    )
print(f"Generated {len(list(OUTPUT.glob('*.jpg')))} map preview thumbnails in {OUTPUT.relative_to(ROOT)}")

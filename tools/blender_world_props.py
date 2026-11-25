import math
import os
import sys
import bpy
import bmesh
from mathutils import Euler

sys.path.insert(0, r"d:\MMORPG\tools")
from blender_textures import bake_pbr_material
from blender_heroes import clear_scene, make_lathe_mesh, OUT_DIR


def export_static_glb(filename):
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT_DIR, filename),
        export_format="GLB",
        export_apply=True,
    )
    print(f"[Blender 5.2 Prop] Exported {filename}")


def build_all_props():
    # 1. Pine Tree
    clear_scene()
    m_bark = bake_pbr_material("Bark", (0.24, 0.14, 0.08), (0.38, 0.24, 0.14), roughness=0.9, pattern="wood", seed=1)
    m_pine = bake_pbr_material("Pine", (0.05, 0.28, 0.14), (0.12, 0.48, 0.22), roughness=0.75, pattern="grain", seed=2)
    make_lathe_mesh("Trunk", [(0.22, 0), (0.16, 0.9), (0.11, 1.8)], segments=10, mat=m_bark, subsurf=1)
    make_lathe_mesh("Tier1", [(0.95, 1.0), (0.55, 1.7), (0.15, 2.3)], segments=12, mat=m_pine, subsurf=1)
    make_lathe_mesh("Tier2", [(0.72, 1.85), (0.4, 2.45), (0.1, 3.0)], segments=12, mat=m_pine, subsurf=1)
    make_lathe_mesh("Tier3", [(0.48, 2.6), (0.22, 3.15), (0.02, 3.6)], segments=12, mat=m_pine, subsurf=1)
    export_static_glb("pine_tree.glb")

    # 2. Oak Tree
    clear_scene()
    m_bark = bake_pbr_material("OakBark", (0.26, 0.16, 0.09), (0.4, 0.26, 0.15), roughness=0.9, pattern="wood", seed=3)
    m_oak = bake_pbr_material("OakLeaf", (0.1, 0.38, 0.16), (0.22, 0.58, 0.24), roughness=0.75, pattern="grain", seed=4)
    make_lathe_mesh("Trunk", [(0.26, 0), (0.18, 0.8), (0.22, 1.5)], segments=12, mat=m_bark, subsurf=1)
    c1 = make_lathe_mesh("Canopy1", [(0.4, 1.2), (0.95, 1.65), (0.85, 2.25), (0.3, 2.6)], segments=14, mat=m_oak, subsurf=1)
    c1.scale = (1.1, 1.0, 0.95)
    c2 = make_lathe_mesh("Canopy2", [(0.3, 1.4), (0.65, 1.8), (0.5, 2.2), (0.15, 2.4)], segments=12, mat=m_oak, subsurf=1)
    c2.location = (0.45, 0.25, -0.15)
    export_static_glb("oak_tree.glb")

    # 3. Brazier
    clear_scene()
    m_stone = bake_pbr_material("BrazierStone", (0.22, 0.24, 0.3), (0.42, 0.45, 0.52), roughness=0.75, pattern="stone", seed=5)
    m_fire = bake_pbr_material("BrazierFire", (1.0, 0.5, 0.08), (1.0, 0.9, 0.3), emission_rgb=(1.0, 0.45, 0.05), emission_strength=4.2, seed=6)
    make_lathe_mesh("Pedestal", [(0.38, 0), (0.26, 0.2), (0.24, 0.75), (0.44, 0.95), (0.36, 1.1)], segments=12, mat=m_stone, subsurf=1)
    make_lathe_mesh("Flame", [(0.26, 1.05), (0.22, 1.35), (0.04, 1.75)], segments=10, mat=m_fire, subsurf=1)
    export_static_glb("brazier.glb")

    # 4. Campfire
    clear_scene()
    m_wood = bake_pbr_material("Log", (0.22, 0.12, 0.06), (0.34, 0.2, 0.1), roughness=0.9, pattern="wood", seed=7)
    m_fire = bake_pbr_material("CampFire", (1.0, 0.48, 0.06), (1.0, 0.85, 0.25), emission_rgb=(1.0, 0.42, 0.04), emission_strength=4.2, seed=8)
    for ang in (0.4, -0.4, 1.2):
        l = make_lathe_mesh(f"Log_{ang}", [(0.08, -0.45), (0.08, 0.45)], segments=8, mat=m_wood, subsurf=1)
        l.rotation_euler = Euler((1.45, 0, ang), "XYZ")
        l.location = (0, 0, 0.12)
    make_lathe_mesh("Flame", [(0.28, 0.1), (0.22, 0.45), (0.03, 0.85)], segments=10, mat=m_fire, subsurf=1)
    export_static_glb("campfire.glb")

    # 5. Magma Obelisk
    clear_scene()
    m_obs = bake_pbr_material("Obelisk", (0.1, 0.09, 0.12), (0.25, 0.22, 0.28), metallic=0.3, roughness=0.6, pattern="magma", seed=9)
    m_mag = bake_pbr_material("Crystal", (1.0, 0.4, 0.04), (1.0, 0.85, 0.2), emission_rgb=(1.0, 0.35, 0.02), emission_strength=4.5, seed=10)
    make_lathe_mesh("Spire", [(0.55, 0), (0.42, 0.4), (0.34, 1.8), (0.06, 2.3)], segments=6, mat=m_obs, subsurf=0)
    make_lathe_mesh("Crystal", [(0.04, 2.45), (0.22, 2.8), (0.04, 3.2)], segments=6, mat=m_mag, subsurf=0)
    export_static_glb("obelisk.glb")

    # 6. Portal Gate
    clear_scene()
    m_arch = bake_pbr_material("PortalArch", (0.24, 0.28, 0.36), (0.48, 0.52, 0.62), metallic=0.65, roughness=0.35, pattern="stone", seed=11)
    m_vortex = bake_pbr_material("PortalEnergy", (0.15, 0.72, 1.0), (0.7, 0.95, 1.0), emission_rgb=(0.15, 0.7, 1.0), emission_strength=4.0, alpha=0.82, seed=12)
    bpy.ops.mesh.primitive_torus_add(major_segments=28, minor_segments=10, major_radius=1.15, minor_radius=0.18, location=(0, 0, 1.2))
    ring = bpy.context.active_object
    ring.rotation_euler = Euler((1.57, 0, 0), "XYZ")
    ring.data.materials.append(m_arch)
    vortex = make_lathe_mesh("Vortex", [(0.95, 0.0), (0.95, 0.08)], segments=20, mat=m_vortex, subsurf=0)
    vortex.rotation_euler = Euler((1.57, 0, 0), "XYZ")
    vortex.location = (0, 0, 1.2)
    export_static_glb("portal.glb")

    # 7. Pillar & Rock Spire & Chest & Coin & Tiles
    clear_scene()
    m_stone = bake_pbr_material("PillarStone", (0.28, 0.3, 0.36), (0.46, 0.48, 0.55), roughness=0.75, pattern="stone", seed=13)
    make_lathe_mesh("Pillar", [(0.45, 0), (0.32, 0.25), (0.28, 2.1), (0.46, 2.4)], segments=10, mat=m_stone, subsurf=1)
    export_static_glb("pillar.glb")

    clear_scene()
    m_rock = bake_pbr_material("RockSpire", (0.22, 0.2, 0.18), (0.4, 0.34, 0.28), roughness=0.85, pattern="stone", seed=14)
    make_lathe_mesh("Spire", [(0.65, 0), (0.48, 0.8), (0.28, 1.9), (0.04, 2.6)], segments=7, mat=m_rock, subsurf=1)
    export_static_glb("rock_spire.glb")

    clear_scene()
    m_gold = bake_pbr_material("Gold", (0.95, 0.72, 0.12), (1.0, 0.92, 0.45), metallic=0.92, roughness=0.2, emission_rgb=(0.9, 0.65, 0.1), emission_strength=0.6, seed=15)
    c = make_lathe_mesh("Coin", [(0.24, 0), (0.24, 0.06)], segments=16, mat=m_gold, subsurf=1)
    c.rotation_euler = Euler((1.57, 0, 0), "XYZ")
    export_static_glb("coin.glb")

    clear_scene()
    m_chest = bake_pbr_material("ChestWood", (0.38, 0.2, 0.08), (0.65, 0.45, 0.15), metallic=0.35, roughness=0.45, pattern="wood", seed=16)
    make_lathe_mesh("Chest", [(0.28, 0), (0.34, 0.22), (0.32, 0.42), (0.14, 0.5)], segments=8, mat=m_chest, subsurf=1)
    export_static_glb("chest.glb")

    # Terrain Dais / Arena Tiles
    for tname, c1, c2, pat, em in [
        ("tile_plaza.glb", (0.2, 0.24, 0.3), (0.35, 0.4, 0.48), "stone", None),
        ("tile_grove.glb", (0.08, 0.26, 0.14), (0.18, 0.42, 0.2), "grain", None),
        ("tile_ruins.glb", (0.24, 0.22, 0.18), (0.38, 0.34, 0.26), "stone", None),
        ("tile_arena.glb", (0.14, 0.1, 0.12), (0.32, 0.18, 0.12), "magma", (0.8, 0.28, 0.02)),
    ]:
        clear_scene()
        mt = bake_pbr_material(tname, c1, c2, roughness=0.8, pattern=pat, emission_rgb=em, emission_strength=0.8 if em else 0.0, seed=20)
        make_lathe_mesh(tname, [(4.6, 0.0), (4.8, 0.08), (4.6, 0.16)], segments=24, mat=mt, subsurf=0)
        export_static_glb(tname)


if __name__ == "__main__":
    build_all_props()

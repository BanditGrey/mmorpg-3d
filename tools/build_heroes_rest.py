import os
import sys
import bpy
from mathutils import Euler

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_sculpt_lib import (
    clear_scene,
    make_pbr_mat,
    make_joint,
    sculpt_cross_section,
    sculpt_shield,
    sculpt_greatsword,
    animate_biped,
    render_studio_preview,
)

OUT_DIR = os.path.join(ROOT_DIR, "client", "public", "models")
os.makedirs(OUT_DIR, exist_ok=True)


def build_mage():
    clear_scene()
    root = make_joint("hero_mage", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.78), root)

    m_robe = make_pbr_mat("MageRobe", (0.10, 0.14, 0.44), (0.24, 0.32, 0.72), metallic=0.08, roughness=0.72, pattern="fbm", seed=21)
    m_gold = make_pbr_mat("MageGold", (0.82, 0.62, 0.14), (1.0, 0.88, 0.38), metallic=0.88, roughness=0.25, pattern="plate", seed=22)
    m_glow = make_pbr_mat("MageArcane", (0.15, 0.78, 1.0), (0.75, 0.98, 1.0), emission=(0.18, 0.82, 1.0), emission_strength=4.2, seed=23)

    # Flowing Layered Robe Skirt + Chest
    sculpt_cross_section(
        "RobeTorso",
        [(0.32, 0.28, 0.02, -0.74), (0.26, 0.22, 0.01, -0.35), (0.18, 0.14, 0, 0.0), (0.23, 0.16, -0.01, 0.36), (0.25, 0.17, 0, 0.48), (0.14, 0.12, 0, 0.56)],
        segments=14,
        mat=m_robe,
        parent=pelvis,
        subsurf=1,
    )
    sculpt_cross_section("GoldStole", [(0.20, 0.15, 0, -0.02), (0.21, 0.15, 0, 0.06)], segments=12, mat=m_gold, parent=pelvis, subsurf=0)
    sculpt_cross_section("Mantle", [(0.30, 0.22, 0.03, 0.40), (0.22, 0.16, 0.01, 0.56)], segments=12, mat=m_gold, parent=pelvis, subsurf=1)

    # Pointed Arcane Hood + Glowing Eyes
    sculpt_cross_section(
        "MageHood",
        [(0.12, 0.13, 0, 0.56), (0.17, 0.18, 0.01, 0.68), (0.16, 0.19, 0.04, 0.84), (0.06, 0.10, 0.12, 0.98)],
        segments=12,
        mat=m_robe,
        parent=pelvis,
        subsurf=1,
    )
    for sx in (-0.05, 0.05):
        sculpt_cross_section(f"Eye_{sx}", [(0.02, 0.02, 0, 0), (0.025, 0.025, 0, 0.03)], segments=8, mat=m_glow, parent=pelvis, loc=(sx, -0.14, 0.72), subsurf=0)

    arm_l = make_joint("Arm.L", (-0.28, 0, 0.46), pelvis, (0, 0.18, 0))
    arm_r = make_joint("Arm.R", (0.28, 0, 0.46), pelvis, (0, -0.18, 0))
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        sculpt_cross_section(f"Sleeve_{n}", [(0.11, 0.11, 0, -0.44), (0.08, 0.08, 0, -0.18), (0.08, 0.08, 0, 0.02)], segments=10, mat=m_robe, parent=j, subsurf=1)

    leg_l = make_joint("Leg.L", (-0.12, 0, -0.02), pelvis)
    leg_r = make_joint("Leg.R", (0.12, 0, -0.02), pelvis)

    # Crystal Staff
    sculpt_cross_section("Staff", [(0.028, 0.028, 0, -0.55), (0.035, 0.035, 0, 0.75), (0.06, 0.06, 0, 0.86)], segments=10, mat=m_gold, parent=arm_r, loc=(0, -0.10, -0.35), rot=(0.2, 0, 0), subsurf=0)
    sculpt_cross_section("CrystalOrb", [(0.02, 0.02, 0, 0), (0.11, 0.11, 0, 0.10), (0.11, 0.11, 0, 0.20), (0.02, 0.02, 0, 0.30)], segments=10, mat=m_glow, parent=arm_r, loc=(0, -0.26, 0.50), subsurf=0)

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="caster")
    render_studio_preview(os.path.join(ROOT_DIR, "references", "preview_mage.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "mage.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported mage.glb")


def build_paladin():
    clear_scene()
    root = make_joint("hero_paladin", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.78), root)

    m_white = make_pbr_mat("PaladinPlate", (0.72, 0.74, 0.78), (0.95, 0.96, 1.0), metallic=0.68, roughness=0.28, pattern="plate", seed=31)
    m_gold = make_pbr_mat("PaladinGold", (0.84, 0.62, 0.12), (1.0, 0.88, 0.36), metallic=0.9, roughness=0.22, pattern="plate", seed=32)
    m_cape = make_pbr_mat("PaladinCloth", (0.15, 0.32, 0.68), (0.28, 0.50, 0.88), metallic=0.05, roughness=0.75, pattern="fbm", seed=33)
    m_glow = make_pbr_mat("PaladinHoly", (1.0, 0.82, 0.22), (1.0, 0.95, 0.6), emission=(1.0, 0.82, 0.25), emission_strength=3.8, seed=34)

    sculpt_cross_section("Chestplate", [(0.17, 0.12, 0, 0.0), (0.21, 0.15, 0, 0.18), (0.28, 0.19, -0.02, 0.38), (0.30, 0.20, -0.01, 0.50), (0.15, 0.13, 0, 0.58)], segments=10, mat=m_white, parent=pelvis, subsurf=0)
    sculpt_cross_section("WaistBelt", [(0.20, 0.14, 0, -0.03), (0.21, 0.15, 0, 0.08)], segments=10, mat=m_gold, parent=pelvis, subsurf=0)
    sculpt_cross_section("Helm", [(0.12, 0.13, 0, 0.58), (0.16, 0.17, 0, 0.72), (0.15, 0.16, 0, 0.88), (0.09, 0.10, 0, 0.96)], segments=8, mat=m_white, parent=pelvis, subsurf=0)
    sculpt_cross_section("Visor", [(0.08, 0.02, -0.15, 0.74), (0.085, 0.02, -0.15, 0.78)], segments=6, mat=m_glow, parent=pelvis, subsurf=0)
    sculpt_cross_section("Plume", [(0.04, 0.10, 0.02, 0.94), (0.02, 0.18, 0.08, 1.06), (0.01, 0.08, 0.14, 1.12)], segments=8, mat=m_gold, parent=pelvis, subsurf=1)

    for sx, rz in [(-0.32, 0.30), (0.32, -0.30)]:
        sculpt_cross_section(f"Pauldron_{sx}", [(0.16, 0.15, 0, 0.0), (0.18, 0.16, 0, 0.08), (0.09, 0.09, 0, 0.16)], segments=8, mat=m_gold, parent=pelvis, loc=(sx, 0, 0.45), rot=(0, rz, 0), subsurf=0)

    sculpt_cross_section("RoyalCape", [(0.36, 0.025, 0, -0.68), (0.30, 0.025, 0, -0.2), (0.22, 0.025, 0, 0.46)], segments=10, mat=m_cape, parent=pelvis, loc=(0, 0.21, 0), rot=(0.16, 0, 0), subsurf=1)

    arm_l = make_joint("Arm.L", (-0.31, 0, 0.46), pelvis, (0, 0.24, 0))
    arm_r = make_joint("Arm.R", (0.31, 0, 0.46), pelvis, (0, -0.24, 0))
    leg_l = make_joint("Leg.L", (-0.15, 0, -0.02), pelvis)
    leg_r = make_joint("Leg.R", (0.15, 0, -0.02), pelvis)
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        sculpt_cross_section(f"Arm_{n}", [(0.07, 0.07, 0, -0.46), (0.088, 0.088, 0, -0.22), (0.088, 0.088, 0, 0.02)], segments=8, mat=m_white, parent=j, subsurf=0)
    for j, n in [(leg_l, "L"), (leg_r, "R")]:
        sculpt_cross_section(f"Leg_{n}", [(0.095, 0.12, -0.02, -0.76), (0.105, 0.105, 0, -0.34), (0.115, 0.115, 0, -0.04)], segments=8, mat=m_white, parent=j, subsurf=0)

    sculpt_shield("HolyShield", m_white, m_gold, parent=arm_l, loc=(-0.10, -0.10, -0.30))
    sculpt_cross_section("HammerHaft", [(0.028, 0.028, 0, 0), (0.03, 0.03, 0, 0.78)], segments=8, mat=m_cape, parent=arm_r, loc=(0.04, -0.08, -0.40), rot=(1.15, 0, 0), subsurf=0)
    sculpt_cross_section("HammerHead", [(0.10, 0.10, 0, -0.13), (0.12, 0.12, 0, 0.0), (0.10, 0.10, 0, 0.13)], segments=6, mat=m_gold, parent=arm_r, loc=(0.04, -0.72, -0.06), rot=(0, 1.57, 0), subsurf=0)

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="melee")
    render_studio_preview(os.path.join(ROOT_DIR, "references", "preview_paladin.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "paladin.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported paladin.glb")


def build_archer():
    clear_scene()
    root = make_joint("hero_archer", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.78), root)

    m_tunic = make_pbr_mat("ArcherTunic", (0.08, 0.34, 0.18), (0.18, 0.56, 0.28), metallic=0.05, roughness=0.72, pattern="fbm", seed=41)
    m_leather = make_pbr_mat("ArcherLeather", (0.28, 0.16, 0.08), (0.48, 0.28, 0.14), metallic=0.1, roughness=0.62, pattern="fbm", seed=42)
    m_glow = make_pbr_mat("ArcherGlow", (0.25, 0.95, 0.55), (0.8, 1.0, 0.85), emission=(0.25, 0.95, 0.55), emission_strength=3.6, seed=43)

    sculpt_cross_section("Tunic", [(0.20, 0.14, 0, -0.22), (0.17, 0.12, 0, 0.0), (0.23, 0.15, -0.01, 0.38), (0.24, 0.16, 0, 0.48), (0.14, 0.12, 0, 0.60)], segments=12, mat=m_tunic, parent=pelvis, subsurf=1)
    sculpt_cross_section("Belt", [(0.19, 0.13, 0, -0.02), (0.20, 0.14, 0, 0.07)], segments=12, mat=m_leather, parent=pelvis, subsurf=0)
    sculpt_cross_section("Hood", [(0.11, 0.12, 0, 0.54), (0.16, 0.17, 0.01, 0.68), (0.15, 0.18, 0.04, 0.84), (0.05, 0.09, 0.10, 0.94)], segments=12, mat=m_tunic, parent=pelvis, subsurf=1)
    for sx in (-0.05, 0.05):
        sculpt_cross_section(f"Eye_{sx}", [(0.02, 0.02, 0, 0), (0.025, 0.025, 0, 0.03)], segments=8, mat=m_glow, parent=pelvis, loc=(sx, -0.14, 0.70), subsurf=0)
    sculpt_cross_section("Quiver", [(0.06, 0.06, 0, 0), (0.075, 0.075, 0, 0.46)], segments=10, mat=m_leather, parent=pelvis, loc=(0.14, 0.18, 0.08), rot=(0.1, -0.35, 0), subsurf=0)

    arm_l = make_joint("Arm.L", (-0.27, 0, 0.46), pelvis, (0, 0.20, 0))
    arm_r = make_joint("Arm.R", (0.27, 0, 0.46), pelvis, (0, -0.20, 0))
    leg_l = make_joint("Leg.L", (-0.13, 0, -0.02), pelvis)
    leg_r = make_joint("Leg.R", (0.13, 0, -0.02), pelvis)
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        sculpt_cross_section(f"Arm_{n}", [(0.06, 0.06, 0, -0.44), (0.078, 0.078, 0, 0.02)], segments=10, mat=m_tunic, parent=j, subsurf=1)
    for j, n in [(leg_l, "L"), (leg_r, "R")]:
        sculpt_cross_section(f"Leg_{n}", [(0.085, 0.12, -0.02, -0.76), (0.095, 0.095, 0, -0.34), (0.105, 0.105, 0, -0.04)], segments=10, mat=m_leather, parent=j, subsurf=1)

    # Curved Elven Bow + Glowing Arrow
    sculpt_cross_section("ElvenBow", [(0.02, 0.02, 0.16, -0.55), (0.03, 0.03, -0.04, -0.25), (0.035, 0.035, -0.08, 0.0), (0.03, 0.03, -0.04, 0.25), (0.02, 0.02, 0.16, 0.55)], segments=8, mat=m_leather, parent=arm_l, loc=(-0.06, -0.18, -0.32), subsurf=1)
    sculpt_greatsword("EnergyArrow", m_glow, m_leather, parent=arm_r, loc=(0, -0.08, -0.42), rot=(1.57, 0, 0)).scale = (0.6, 0.6, 0.65)

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="archer")
    render_studio_preview(os.path.join(ROOT_DIR, "references", "preview_archer.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "archer.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported archer.glb")


def build_assassin():
    clear_scene()
    root = make_joint("hero_assassin", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.78), root)

    m_dark = make_pbr_mat("AssassinObsidian", (0.10, 0.08, 0.16), (0.24, 0.18, 0.36), metallic=0.45, roughness=0.38, pattern="plate", seed=51)
    m_scarf = make_pbr_mat("AssassinScarf", (0.28, 0.10, 0.45), (0.48, 0.20, 0.72), metallic=0.05, roughness=0.75, pattern="fbm", seed=52)
    m_glow = make_pbr_mat("AssassinShadow", (0.72, 0.28, 1.0), (0.95, 0.75, 1.0), emission=(0.75, 0.3, 1.0), emission_strength=4.2, seed=53)

    sculpt_cross_section("Vest", [(0.16, 0.11, 0, 0.0), (0.23, 0.15, -0.01, 0.38), (0.25, 0.16, 0, 0.48), (0.13, 0.11, 0, 0.56)], segments=10, mat=m_dark, parent=pelvis, subsurf=0)
    sculpt_cross_section("Cowl", [(0.11, 0.12, 0, 0.56), (0.16, 0.17, 0.01, 0.72), (0.14, 0.17, 0.04, 0.88), (0.04, 0.08, 0.10, 0.96)], segments=10, mat=m_dark, parent=pelvis, subsurf=1)
    for sx in (-0.05, 0.05):
        sculpt_cross_section(f"Eye_{sx}", [(0.02, 0.02, 0, 0), (0.025, 0.025, 0, 0.03)], segments=8, mat=m_glow, parent=pelvis, loc=(sx, -0.14, 0.72), subsurf=0)
    sculpt_cross_section("ShadowScarf", [(0.24, 0.025, 0, -0.58), (0.18, 0.025, 0, 0.0), (0.14, 0.025, 0, 0.46)], segments=10, mat=m_scarf, parent=pelvis, loc=(0, 0.19, 0), rot=(0.24, 0, 0), subsurf=1)

    arm_l = make_joint("Arm.L", (-0.28, 0, 0.46), pelvis, (0, 0.18, 0))
    arm_r = make_joint("Arm.R", (0.28, 0, 0.46), pelvis, (0, -0.18, 0))
    leg_l = make_joint("Leg.L", (-0.14, 0, -0.02), pelvis)
    leg_r = make_joint("Leg.R", (0.14, 0, -0.02), pelvis)
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        sculpt_cross_section(f"Arm_{n}", [(0.06, 0.06, 0, -0.44), (0.08, 0.08, 0, 0.02)], segments=8, mat=m_dark, parent=j, subsurf=0)
    for j, n in [(leg_l, "L"), (leg_r, "R")]:
        sculpt_cross_section(f"Leg_{n}", [(0.085, 0.12, -0.02, -0.76), (0.10, 0.10, 0, -0.04)], segments=8, mat=m_dark, parent=j, subsurf=0)

    # Dual Glowing Shadow Daggers
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        d = sculpt_greatsword(f"ShadowDagger_{n}", m_glow, m_dark, parent=j, loc=(0, -0.06, -0.40), rot=(1.35, 0, 0))
        d.scale = (0.7, 0.7, 0.55)

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="dual")
    render_studio_preview(os.path.join(ROOT_DIR, "references", "preview_assassin.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "assassin.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported assassin.glb")


if __name__ == "__main__":
    build_mage()
    build_paladin()
    build_archer()
    build_assassin()

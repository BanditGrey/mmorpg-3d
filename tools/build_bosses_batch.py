import os
import sys
import bpy

sys.path.insert(0, r"d:\MMORPG\tools")
from blender_sculpt_lib import (
    clear_scene,
    make_pbr_mat,
    make_joint,
    sculpt_cross_section,
    sculpt_jagged_rock,
    animate_biped,
    render_studio_preview,
)

OUT_DIR = r"d:\MMORPG\client\public\models"
PREV_DIR = r"C:\Users\Daniel\.gemini\antigravity\brain\16504084-b707-4cdd-b15f-6ee76f7d8440"


def build_titan_boss(
    name: str,
    body_a,
    body_b,
    armor_a,
    armor_b,
    glow_col,
    has_wings=False,
    has_horns=True,
    has_crown=False,
    seed=500,
):
    clear_scene()
    root = make_joint(f"mob_{name}", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 1.35), root)
    torso = make_joint("Torso", (0, 0, 0.32), pelvis)
    head = make_joint("Head", (0, 0, 0.78), torso)
    arm_l = make_joint("ArmL", (-0.65, 0, 0.56), torso)
    arm_r = make_joint("ArmR", (0.65, 0, 0.56), torso)
    leg_l = make_joint("LegL", (-0.28, 0, -0.05), pelvis)
    leg_r = make_joint("LegR", (0.28, 0, -0.05), pelvis)

    m_body = make_pbr_mat(f"{name}_Body", body_a, body_b, metallic=0.18, roughness=0.68, pattern="rock", seed=seed)
    m_armor = make_pbr_mat(f"{name}_Armor", armor_a, armor_b, metallic=0.9, roughness=0.24, seed=seed + 1)
    m_glow = make_pbr_mat(f"{name}_Glow", glow_col, (1.0, 0.95, 0.8), emission=glow_col, emission_strength=4.0, seed=seed + 2)

    sculpt_cross_section("PelvisArmor", [(0.34, 0.26, 0, -0.18), (0.40, 0.30, 0, 0.16)], segments=12, mat=m_armor, parent=pelvis, subsurf=0)
    sculpt_cross_section("TorsoMass", [(0.36, 0.28, 0, 0), (0.58, 0.42, 0, 0.42), (0.64, 0.46, 0, 0.68), (0.34, 0.26, 0, 0.80)], segments=14, mat=m_body, parent=torso, subsurf=1)
    sculpt_cross_section("ChestCore", [(0.02, 0.02, 0, -0.12), (0.16, 0.16, 0, 0), (0.02, 0.02, 0, 0.12)], segments=10, mat=m_glow, parent=torso, loc=(0, -0.40, 0.44), subsurf=0)

    for sx in (-1, 1):
        sculpt_cross_section(f"Pauldron_{sx}", [(0.24, 0.26, 0, -0.10), (0.34, 0.34, 0, 0.10), (0.14, 0.14, 0, 0.28)], segments=10, mat=m_armor, parent=torso, loc=(sx * 0.66, 0, 0.62), rot=(0, sx * 0.35, 0), subsurf=0)
    sculpt_cross_section("BossHead", [(0.14, 0.15, 0, 0), (0.22, 0.24, 0, 0.18), (0.18, 0.20, 0, 0.34)], segments=12, mat=m_body, parent=head, subsurf=1)
    for sx in (-0.08, 0.08):
        sculpt_cross_section(f"Eye_{sx}", [(0.025, 0.025, 0, 0), (0.035, 0.035, 0, 0.05)], segments=8, mat=m_glow, parent=head, loc=(sx, -0.21, 0.18), subsurf=0)
        if has_horns:
            sculpt_cross_section(f"Horn_{sx}", [(0.06, 0.06, 0, 0), (0.035, 0.035, 0, 0.24), (0.008, 0.008, 0, 0.48)], segments=8, mat=m_armor, parent=head, loc=(sx * 2.4, 0, 0.28), rot=(-0.25, sx * 4.0, 0), subsurf=1)
    if has_crown:
        sculpt_cross_section("Crown", [(0.20, 0.21, 0, 0.28), (0.24, 0.25, 0, 0.40)], segments=12, mat=m_glow, parent=head, subsurf=0)

    for j in (arm_l, arm_r):
        sculpt_cross_section(f"Arm_{j.name}", [(0.14, 0.14, 0, -0.82), (0.18, 0.18, 0, -0.40), (0.22, 0.22, 0, 0.05)], segments=10, mat=m_body, parent=j, subsurf=1)
        sculpt_cross_section(f"Gauntlet_{j.name}", [(0.16, 0.16, 0, -0.86), (0.19, 0.19, 0, -0.58)], segments=10, mat=m_armor, parent=j, subsurf=0)
    for j in (leg_l, leg_r):
        sculpt_cross_section(f"Leg_{j.name}", [(0.16, 0.18, 0, -1.24), (0.19, 0.20, 0, -0.60), (0.22, 0.22, 0, 0.04)], segments=10, mat=m_body, parent=j, subsurf=1)

    if has_wings:
        for side in (-1, 1):
            sculpt_cross_section(f"Wing_{side}", [(0.03, 0.08, 0, 0), (0.04, 0.44, 0, 0.65), (0.03, 0.50, 0, 1.25), (0.01, 0.12, 0, 1.65)], segments=8, mat=m_glow, parent=torso, loc=(side * 0.34, 0.26, 0.52), rot=(0.2, side * 1.0, side * 0.35), subsurf=1)

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="melee")
    render_studio_preview(os.path.join(PREV_DIR, f"preview_{name}.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, f"{name}.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print(f"[Blender 5.2] Exported {name}.glb")


if __name__ == "__main__":
    build_titan_boss("boss_golem", (0.24, 0.22, 0.20), (0.42, 0.38, 0.34), (0.35, 0.28, 0.18), (0.65, 0.52, 0.28), (1.0, 0.45, 0.08), has_wings=False, has_horns=False, has_crown=False, seed=510)
    build_titan_boss("sand_golem", (0.58, 0.44, 0.22), (0.82, 0.66, 0.36), (0.72, 0.56, 0.20), (0.95, 0.78, 0.32), (1.0, 0.82, 0.22), has_wings=False, has_horns=False, has_crown=True, seed=520)
    build_titan_boss("ice_dragon", (0.12, 0.32, 0.52), (0.45, 0.78, 0.96), (0.25, 0.55, 0.85), (0.72, 0.92, 1.0), (0.25, 0.85, 1.0), has_wings=True, has_horns=True, has_crown=False, seed=530)
    build_titan_boss("abyss_lord", (0.18, 0.04, 0.08), (0.42, 0.08, 0.14), (0.16, 0.12, 0.14), (0.55, 0.12, 0.22), (1.0, 0.15, 0.32), has_wings=True, has_horns=True, has_crown=True, seed=540)
    build_titan_boss("celestial_warden", (0.72, 0.68, 0.58), (0.95, 0.92, 0.84), (0.85, 0.68, 0.22), (1.0, 0.88, 0.45), (1.0, 0.92, 0.45), has_wings=True, has_horns=False, has_crown=True, seed=550)
    build_titan_boss("eternal_emperor", (0.18, 0.08, 0.32), (0.42, 0.22, 0.65), (0.82, 0.62, 0.22), (1.0, 0.82, 0.38), (0.78, 0.35, 1.0), has_wings=True, has_horns=True, has_crown=True, seed=560)

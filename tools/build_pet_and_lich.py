import os
import sys
import math
import bpy
from mathutils import Vector

sys.path.insert(0, r"d:\MMORPG\tools")
from blender_sculpt_lib import (
    clear_scene,
    make_pbr_mat,
    make_joint,
    sculpt_cross_section,
    push_nla,
    animate_biped,
    render_studio_preview,
)

OUT_DIR = r"d:\MMORPG\client\public\models"


def build_pet_fairy():
    clear_scene()
    root = make_joint("pet_fairy", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0.45), root)
    head = make_joint("Head", (0, 0, 0.24), body)
    wing_l = make_joint("WingL", (-0.07, 0.06, 0.14), body)
    wing_r = make_joint("WingR", (0.07, 0.06, 0.14), body)
    lantern = make_joint("Lantern", (0.17, -0.08, -0.02), body)

    m_skin = make_pbr_mat("FairyGold", (0.95, 0.78, 0.36), (1.0, 0.92, 0.62), metallic=0.15, roughness=0.35, emission=(0.95, 0.72, 0.2), emission_strength=0.45, seed=201)
    m_dress = make_pbr_mat("FairyDress", (0.12, 0.55, 0.65), (0.28, 0.85, 0.92), metallic=0.35, roughness=0.28, seed=202)
    m_bronze = make_pbr_mat("FairyBronze", (0.72, 0.52, 0.22), (0.95, 0.78, 0.35), metallic=0.88, roughness=0.22, seed=203)
    m_wing = make_pbr_mat("FairyWing", (0.35, 0.88, 1.0), (1.0, 0.88, 0.35), metallic=0.1, roughness=0.15, alpha=0.72, emission=(0.45, 0.9, 1.0), emission_strength=2.2, seed=204)
    m_lamp = make_pbr_mat("FairyLamp", (1.0, 0.85, 0.25), (1.0, 0.95, 0.6), emission=(1.0, 0.82, 0.2), emission_strength=4.0, seed=205)

    # Torso & dress
    sculpt_cross_section("FairyDress", [(0.14, 0.14, 0, -0.22), (0.10, 0.10, 0, -0.04), (0.065, 0.055, 0, 0.10), (0.085, 0.075, 0, 0.18)], segments=14, mat=m_dress, parent=body, subsurf=1)
    sculpt_cross_section("FairyCollar", [(0.095, 0.085, 0, 0.17), (0.075, 0.065, 0, 0.22)], segments=12, mat=m_bronze, parent=body, subsurf=0)
    # Head & Crown
    sculpt_cross_section("FairyHead", [(0.05, 0.05, 0, 0.0), (0.10, 0.10, 0, 0.09), (0.095, 0.095, 0, 0.17), (0.04, 0.04, 0, 0.22)], segments=14, mat=m_skin, parent=head, subsurf=1)
    sculpt_cross_section("FairyCrown", [(0.085, 0.085, 0, 0.17), (0.105, 0.105, 0, 0.22), (0.04, 0.04, 0, 0.26)], segments=10, mat=m_bronze, parent=head, subsurf=0)
    # Wings (left & right upper+lower)
    for side, jw in [(-1, wing_l), (1, wing_r)]:
        sculpt_cross_section(f"WingTop_{side}", [(0.01, 0.02, 0, 0), (0.02, 0.12, 0, 0.18), (0.015, 0.14, 0, 0.34), (0.005, 0.04, 0, 0.42)], segments=8, mat=m_wing, parent=jw, rot=(0.25, side * 1.15, side * 0.25), subsurf=1)
        sculpt_cross_section(f"WingBot_{side}", [(0.01, 0.02, 0, 0), (0.015, 0.08, 0, 0.14), (0.005, 0.03, 0, 0.26)], segments=8, mat=m_wing, parent=jw, rot=(-0.2, side * 1.35, side * 0.15), subsurf=1)
    # Lantern
    sculpt_cross_section("LanternBody", [(0.03, 0.03, 0, -0.07), (0.055, 0.055, 0, -0.02), (0.03, 0.03, 0, 0.04)], segments=8, mat=m_lamp, parent=lantern, subsurf=0)
    sculpt_cross_section("LanternCap", [(0.045, 0.045, 0, 0.04), (0.01, 0.01, 0, 0.09)], segments=8, mat=m_bronze, parent=lantern, subsurf=0)

    # Idle hover + wing flap animation
    for f, z_off, flap in [(1, 0.0, 0.15), (8, 0.04, -0.45), (15, 0.08, 0.15), (22, 0.04, -0.45), (30, 0.0, 0.15)]:
        body.location.z = 0.45 + z_off
        body.keyframe_insert("location", index=2, frame=f)
        wing_l.rotation_euler.z = flap
        wing_l.keyframe_insert("rotation_euler", index=2, frame=f)
        wing_r.rotation_euler.z = -flap
        wing_r.keyframe_insert("rotation_euler", index=2, frame=f)
    for j in (body, wing_l, wing_r):
        push_nla(j, "Idle", 1, 30)

    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "pet_fairy.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2] Exported pet_fairy.glb")


def build_ancient_lich():
    clear_scene()
    root = make_joint("mob_ancient_lich", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 1.05), root)
    torso = make_joint("Torso", (0, 0, 0.25), pelvis)
    head = make_joint("Head", (0, 0, 0.62), torso)
    arm_l = make_joint("ArmL", (-0.42, 0, 0.46), torso)
    arm_r = make_joint("ArmR", (0.42, 0, 0.46), torso)
    leg_l = make_joint("LegL", (-0.18, 0, -0.05), pelvis)
    leg_r = make_joint("LegR", (0.18, 0, -0.05), pelvis)

    m_robe = make_pbr_mat("LichRobe", (0.06, 0.10, 0.24), (0.14, 0.22, 0.42), metallic=0.15, roughness=0.75, pattern="fbm", seed=301)
    m_bronze = make_pbr_mat("LichBronze", (0.68, 0.48, 0.18), (0.88, 0.72, 0.34), metallic=0.90, roughness=0.28, seed=302)
    m_bone = make_pbr_mat("LichBone", (0.72, 0.68, 0.58), (0.88, 0.85, 0.76), metallic=0.05, roughness=0.62, seed=303)
    m_core = make_pbr_mat("LichCore", (0.15, 0.65, 1.0), (0.45, 0.92, 1.0), emission=(0.18, 0.72, 1.0), emission_strength=4.2, seed=304)

    # Flowing tattered robe
    sculpt_cross_section("LichRobeSkirt", [(0.48, 0.44, 0, -0.95), (0.36, 0.34, 0, -0.45), (0.24, 0.22, 0, 0.0)], segments=14, mat=m_robe, parent=pelvis, subsurf=1)
    sculpt_cross_section("LichTorso", [(0.22, 0.18, 0, 0.0), (0.34, 0.25, 0, 0.32), (0.38, 0.26, 0, 0.52), (0.18, 0.16, 0, 0.60)], segments=14, mat=m_robe, parent=torso, subsurf=1)
    # Glowing phylactery core in chest
    sculpt_cross_section("LichCore", [(0.02, 0.02, 0, -0.10), (0.11, 0.11, 0, 0.0), (0.02, 0.02, 0, 0.10)], segments=10, mat=m_core, parent=torso, loc=(0, -0.22, 0.32), subsurf=0)
    # Pauldrons
    for sx in (-1, 1):
        sculpt_cross_section(f"Pauldron_{sx}", [(0.16, 0.18, 0, -0.05), (0.20, 0.20, 0, 0.08), (0.06, 0.06, 0, 0.16)], segments=10, mat=m_bronze, parent=torso, loc=(sx * 0.42, 0, 0.48), rot=(0, sx * 0.35, 0), subsurf=1)
    # Skull & Horned Crown
    sculpt_cross_section("LichSkull", [(0.10, 0.11, 0, 0.0), (0.16, 0.18, 0, 0.16), (0.14, 0.16, 0, 0.28), (0.06, 0.07, 0, 0.34)], segments=12, mat=m_bone, parent=head, subsurf=1)
    for sx in (-0.06, 0.06):
        sculpt_cross_section(f"Eye_{sx}", [(0.02, 0.02, 0, 0), (0.03, 0.03, 0, 0.04)], segments=8, mat=m_core, parent=head, loc=(sx, -0.15, 0.17), subsurf=0)
        sculpt_cross_section(f"Horn_{sx}", [(0.04, 0.04, 0, 0), (0.025, 0.025, 0, 0.18), (0.005, 0.005, 0, 0.36)], segments=8, mat=m_bronze, parent=head, loc=(sx * 2.1, 0, 0.26), rot=(-0.2, sx * 4.5, 0), subsurf=1)
    sculpt_cross_section("LichCrown", [(0.15, 0.16, 0, 0.24), (0.18, 0.19, 0, 0.32)], segments=12, mat=m_bronze, parent=head, subsurf=0)
    # Arms & Necromancer Staff
    for j in (arm_l, arm_r):
        sculpt_cross_section(f"Arm_{j.name}", [(0.07, 0.07, 0, -0.58), (0.09, 0.09, 0, -0.28), (0.11, 0.11, 0, 0.02)], segments=10, mat=m_robe, parent=j, subsurf=1)
    sculpt_cross_section("StaffPole", [(0.035, 0.035, 0, -0.85), (0.04, 0.04, 0, 1.15)], segments=8, mat=m_bone, parent=arm_r, loc=(0.04, -0.16, -0.45), subsurf=0)
    sculpt_cross_section("StaffCrystal", [(0.02, 0.02, 0, 1.15), (0.12, 0.12, 0, 1.32), (0.02, 0.02, 0, 1.52)], segments=8, mat=m_core, parent=arm_r, loc=(0.04, -0.16, -0.45), subsurf=0)

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="caster")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "ancient_lich.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2] Exported ancient_lich.glb")


if __name__ == "__main__":
    build_pet_fairy()
    build_ancient_lich()

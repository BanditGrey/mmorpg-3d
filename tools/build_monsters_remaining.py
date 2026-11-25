import os
import sys
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
PREV_DIR = r"C:\Users\Daniel\.gemini\antigravity\brain\16504084-b707-4cdd-b15f-6ee76f7d8440"


def build_spider():
    clear_scene()
    root = make_joint("mob_spider", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0.36), root)
    m_chitin = make_pbr_mat("SpiderChitin", (0.08, 0.04, 0.14), (0.24, 0.10, 0.38), metallic=0.35, roughness=0.32, seed=601)
    m_eye = make_pbr_mat("SpiderEye", (0.95, 0.15, 0.45), (1.0, 0.4, 0.7), emission=(0.95, 0.15, 0.45), emission_strength=3.5, seed=602)

    sculpt_cross_section("Abdomen", [(0.12, 0.12, 0, 0.05), (0.34, 0.30, 0, 0.28), (0.30, 0.26, 0, 0.56), (0.08, 0.08, 0, 0.72)], segments=14, mat=m_chitin, parent=body, rot=(1.45, 0, 0), subsurf=1)
    sculpt_cross_section("Head", [(0.10, 0.09, 0, -0.34), (0.18, 0.14, 0, -0.14), (0.12, 0.10, 0, 0.04)], segments=12, mat=m_chitin, parent=body, rot=(1.57, 0, 0), subsurf=1)
    for sx in (-0.06, 0.06):
        sculpt_cross_section(f"Eye_{sx}", [(0.02, 0.02, 0, 0), (0.03, 0.03, 0, 0.04)], segments=8, mat=m_eye, parent=body, loc=(sx, -0.34, 0.06), subsurf=0)

    legs = []
    for i, ang in enumerate([-0.9, -0.35, 0.25, 0.85]):
        for side in (-1, 1):
            lj = make_joint(f"Leg_{side}_{i}", (side * 0.14, ang * 0.28, 0.0), body)
            sculpt_cross_section(f"LegMesh_{side}_{i}", [(0.025, 0.025, 0, 0), (0.035, 0.035, 0, 0.32), (0.015, 0.015, 0, 0.65)], segments=8, mat=m_chitin, parent=lj, rot=(ang * 0.4, side * 1.15, 0), subsurf=0)
            legs.append((lj, side, i))

    for f, z_off, swing in [(1, 0, 0), (15, 0.04, 0.1), (30, 0, 0)]:
        body.location.z = 0.36 + z_off
        body.keyframe_insert("location", index=2, frame=f)
        for lj, side, i in legs:
            lj.rotation_euler.z = swing * side
            lj.keyframe_insert("rotation_euler", index=2, frame=f)
    for j in [body] + [l[0] for l in legs]:
        push_nla(j, "Idle", 1, 30)

    for f, z_off, swing in [(40, 0, 0.35), (50, 0.05, -0.35), (60, 0, 0.35)]:
        body.location.z = 0.36 + z_off
        body.keyframe_insert("location", index=2, frame=f)
        for lj, side, i in legs:
            lj.rotation_euler.z = swing * (1 if i % 2 == 0 else -1)
            lj.keyframe_insert("rotation_euler", index=2, frame=f)
    for j in [body] + [l[0] for l in legs]:
        push_nla(j, "Walk", 40, 60)

    for f, y_off, rx in [(70, 0, 0), (78, -0.25, -0.3), (88, 0, 0)]:
        body.location.y = y_off
        body.keyframe_insert("location", index=1, frame=f)
        body.rotation_euler.x = rx
        body.keyframe_insert("rotation_euler", index=0, frame=f)
    push_nla(body, "Attack", 70, 88)

    render_studio_preview(os.path.join(PREV_DIR, "preview_spider.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "spider.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2] Exported spider.glb")


def build_scarab():
    clear_scene()
    root = make_joint("mob_scarab", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0.28), root)
    m_shell = make_pbr_mat("ScarabGold", (0.72, 0.52, 0.12), (1.0, 0.85, 0.32), metallic=0.92, roughness=0.18, seed=610)
    m_gem = make_pbr_mat("ScarabGem", (0.12, 0.82, 0.95), (0.5, 0.98, 1.0), emission=(0.15, 0.85, 1.0), emission_strength=3.0, seed=611)

    sculpt_cross_section("Carapace", [(0.16, 0.10, 0, -0.35), (0.32, 0.18, 0, 0.0), (0.28, 0.15, 0, 0.32), (0.12, 0.08, 0, 0.45)], segments=14, mat=m_shell, parent=body, rot=(1.57, 0, 0), subsurf=1)
    sculpt_cross_section("GemCore", [(0.02, 0.02, 0, 0), (0.09, 0.09, 0, 0.04)], segments=10, mat=m_gem, parent=body, loc=(0, 0, 0.16), subsurf=0)
    for sx in (-1, 1):
        sculpt_cross_section(f"Horn_{sx}", [(0.03, 0.03, 0, 0), (0.01, 0.01, 0, 0.22)], segments=8, mat=m_shell, parent=body, loc=(sx * 0.10, -0.38, 0.04), rot=(1.2, sx * 0.3, 0), subsurf=0)

    for f, z_off, rx in [(1, 0, 0), (15, 0.04, 0.06), (30, 0, 0)]:
        body.location.z = 0.28 + z_off
        body.keyframe_insert("location", index=2, frame=f)
        body.rotation_euler.x = rx
        body.keyframe_insert("rotation_euler", index=0, frame=f)
    push_nla(body, "Idle", 1, 30)
    for f, z_off, rz in [(40, 0, -0.1), (50, 0.06, 0.1), (60, 0, -0.1)]:
        body.location.z = 0.28 + z_off
        body.keyframe_insert("location", index=2, frame=f)
        body.rotation_euler.z = rz
        body.keyframe_insert("rotation_euler", index=2, frame=f)
    push_nla(body, "Walk", 40, 60)
    for f, y_off in [(70, 0), (78, -0.25), (88, 0)]:
        body.location.y = y_off
        body.keyframe_insert("location", index=1, frame=f)
    push_nla(body, "Attack", 70, 88)

    render_studio_preview(os.path.join(PREV_DIR, "preview_scarab.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "scarab.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2] Exported scarab.glb")


def build_magma_elem():
    clear_scene()
    root = make_joint("mob_magma_elem", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0.85), root)
    m_core = make_pbr_mat("MagmaCore", (1.0, 0.32, 0.04), (1.0, 0.78, 0.15), emission=(1.0, 0.38, 0.06), emission_strength=4.5, seed=620)
    m_rock = make_pbr_mat("MagmaRock", (0.12, 0.08, 0.08), (0.28, 0.16, 0.12), metallic=0.1, roughness=0.85, seed=621)

    sculpt_cross_section("Core", [(0.08, 0.08, 0, -0.35), (0.34, 0.34, 0, 0.0), (0.28, 0.28, 0, 0.35), (0.06, 0.06, 0, 0.55)], segments=12, mat=m_core, parent=body, subsurf=1)
    for i in range(4):
        ang = i * 1.57
        sculpt_cross_section(f"Shell_{i}", [(0.10, 0.08, 0, -0.15), (0.16, 0.12, 0, 0.10), (0.06, 0.06, 0, 0.28)], segments=8, mat=m_rock, parent=body, loc=(0.36 * (1 if i % 2 == 0 else -1), 0.36 * (1 if i < 2 else -1), 0.05), subsurf=0)

    for f, z_off, rz in [(1, 0, 0), (15, 0.12, 3.14), (30, 0, 6.28)]:
        body.location.z = 0.85 + z_off
        body.keyframe_insert("location", index=2, frame=f)
        body.rotation_euler.z = rz
        body.keyframe_insert("rotation_euler", index=2, frame=f)
    push_nla(body, "Idle", 1, 30)
    for f, z_off, rz in [(40, 0, 0), (50, 0.16, 3.14), (60, 0, 6.28)]:
        body.location.z = 0.85 + z_off
        body.keyframe_insert("location", index=2, frame=f)
        body.rotation_euler.z = rz
        body.keyframe_insert("rotation_euler", index=2, frame=f)
    push_nla(body, "Walk", 40, 60)
    for f, sc in [(70, 1.0), (78, 1.45), (88, 1.0)]:
        body.scale = Vector((sc, sc, sc))
        body.keyframe_insert("scale", frame=f)
    push_nla(body, "Attack", 70, 88)

    render_studio_preview(os.path.join(PREV_DIR, "preview_magma_elem.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "magma_elem.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2] Exported magma_elem.glb")


def build_biped_mob(name, body_a, body_b, gear_a, gear_b, glow_col, scale=1.0, style="melee", has_wings=False, has_horns=False, seed=650):
    clear_scene()
    root = make_joint(f"mob_{name}", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.92 * scale), root)
    torso = make_joint("Torso", (0, 0, 0.22 * scale), pelvis)
    head = make_joint("Head", (0, 0, 0.52 * scale), torso)
    arm_l = make_joint("ArmL", (-0.36 * scale, 0, 0.38 * scale), torso)
    arm_r = make_joint("ArmR", (0.36 * scale, 0, 0.38 * scale), torso)
    leg_l = make_joint("LegL", (-0.16 * scale, 0, -0.04 * scale), pelvis)
    leg_r = make_joint("LegR", (0.16 * scale, 0, -0.04 * scale), pelvis)

    m_body = make_pbr_mat(f"{name}_Body", body_a, body_b, metallic=0.1, roughness=0.72, pattern="fbm", seed=seed)
    m_gear = make_pbr_mat(f"{name}_Gear", gear_a, gear_b, metallic=0.82, roughness=0.30, seed=seed + 1)
    m_glow = make_pbr_mat(f"{name}_Glow", glow_col, (1.0, 0.95, 0.8), emission=glow_col, emission_strength=3.6, seed=seed + 2)

    sculpt_cross_section("Torso", [(0.18 * scale, 0.14 * scale, 0, 0), (0.28 * scale, 0.20 * scale, 0, 0.30 * scale), (0.30 * scale, 0.21 * scale, 0, 0.46 * scale)], segments=12, mat=m_body, parent=torso, subsurf=1)
    sculpt_cross_section("ChestGear", [(0.20 * scale, 0.16 * scale, 0, 0.12 * scale), (0.32 * scale, 0.22 * scale, 0, 0.40 * scale)], segments=10, mat=m_gear, parent=torso, subsurf=0)
    sculpt_cross_section("Head", [(0.09 * scale, 0.10 * scale, 0, 0), (0.15 * scale, 0.16 * scale, 0, 0.14 * scale), (0.11 * scale, 0.12 * scale, 0, 0.26 * scale)], segments=10, mat=m_body, parent=head, subsurf=1)
    for sx in (-0.05 * scale, 0.05 * scale):
        sculpt_cross_section(f"Eye_{sx}", [(0.018 * scale, 0.018 * scale, 0, 0), (0.024 * scale, 0.024 * scale, 0, 0.03 * scale)], segments=8, mat=m_glow, parent=head, loc=(sx, -0.14 * scale, 0.14 * scale), subsurf=0)
        if has_horns:
            sculpt_cross_section(f"Horn_{sx}", [(0.03 * scale, 0.03 * scale, 0, 0), (0.01 * scale, 0.01 * scale, 0, 0.22 * scale)], segments=6, mat=m_gear, parent=head, loc=(sx * 2.0, 0, 0.22 * scale), rot=(-0.2, sx * 4.0, 0), subsurf=0)
    for j in (arm_l, arm_r):
        sculpt_cross_section(f"Arm_{j.name}", [(0.06 * scale, 0.06 * scale, 0, -0.52 * scale), (0.09 * scale, 0.09 * scale, 0, 0.02 * scale)], segments=8, mat=m_body, parent=j, subsurf=1)
    for j in (leg_l, leg_r):
        sculpt_cross_section(f"Leg_{j.name}", [(0.07 * scale, 0.08 * scale, 0, -0.82 * scale), (0.11 * scale, 0.11 * scale, 0, 0.02 * scale)], segments=8, mat=m_gear, parent=j, subsurf=1)
    if has_wings:
        for side in (-1, 1):
            sculpt_cross_section(f"Wing_{side}", [(0.02, 0.05, 0, 0), (0.03, 0.25, 0, 0.45), (0.01, 0.08, 0, 0.95)], segments=8, mat=m_glow, parent=torso, loc=(side * 0.20, 0.16, 0.34), rot=(0.2, side * 1.0, side * 0.35), subsurf=1)

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style=style)
    render_studio_preview(os.path.join(PREV_DIR, f"preview_{name}.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, f"{name}.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print(f"[Blender 5.2] Exported {name}.glb")


if __name__ == "__main__":
    build_spider()
    build_scarab()
    build_magma_elem()
    build_biped_mob("bandit", (0.28, 0.20, 0.15), (0.45, 0.34, 0.25), (0.22, 0.24, 0.28), (0.55, 0.42, 0.22), (1.0, 0.72, 0.2), scale=0.95, seed=651)
    build_biped_mob("treant", (0.22, 0.14, 0.08), (0.38, 0.26, 0.14), (0.12, 0.38, 0.16), (0.28, 0.65, 0.25), (0.35, 1.0, 0.45), scale=1.25, has_horns=True, seed=652)
    build_biped_mob("wraith", (0.08, 0.18, 0.28), (0.18, 0.42, 0.65), (0.14, 0.28, 0.45), (0.35, 0.75, 0.95), (0.25, 0.85, 1.0), scale=1.05, style="caster", seed=653)
    build_biped_mob("orc_shaman", (0.22, 0.42, 0.14), (0.38, 0.62, 0.22), (0.55, 0.22, 0.10), (0.92, 0.45, 0.14), (1.0, 0.45, 0.08), scale=1.1, style="caster", has_horns=True, seed=654)
    build_biped_mob("skeleton_knight", (0.68, 0.66, 0.58), (0.86, 0.84, 0.76), (0.24, 0.28, 0.36), (0.52, 0.58, 0.68), (0.45, 0.85, 1.0), scale=1.08, seed=655)
    build_biped_mob("frost_yeti", (0.65, 0.82, 0.95), (0.92, 0.96, 1.0), (0.22, 0.48, 0.72), (0.55, 0.85, 1.0), (0.25, 0.88, 1.0), scale=1.22, has_horns=True, seed=656)
    build_biped_mob("abyss_fiend", (0.38, 0.06, 0.12), (0.72, 0.12, 0.22), (0.18, 0.14, 0.18), (0.52, 0.14, 0.24), (1.0, 0.22, 0.38), scale=1.18, has_wings=True, has_horns=True, seed=657)
    build_biped_mob("seraph_fallen", (0.22, 0.18, 0.28), (0.45, 0.38, 0.55), (0.72, 0.58, 0.22), (0.95, 0.82, 0.38), (0.95, 0.75, 0.25), scale=1.15, has_wings=True, seed=658)
    build_biped_mob("void_stalker", (0.10, 0.04, 0.22), (0.28, 0.12, 0.52), (0.18, 0.10, 0.32), (0.52, 0.24, 0.78), (0.78, 0.32, 1.0), scale=1.12, has_horns=True, seed=659)

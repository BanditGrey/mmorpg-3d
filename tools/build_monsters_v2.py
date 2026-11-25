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
    sculpt_jagged_rock,
    sculpt_battleaxe,
    push_nla,
    animate_biped,
    render_studio_preview,
)

OUT_DIR = r"d:\MMORPG\client\public\models"


def build_slime():
    clear_scene()
    root = make_joint("mob_slime", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0), root)

    m_jelly = make_pbr_mat("SlimeJelly", (0.04, 0.62, 0.24), (0.18, 0.92, 0.42), metallic=0.05, roughness=0.14, alpha=0.82, pattern="fbm", seed=71)
    m_core = make_pbr_mat("SlimeCore", (0.25, 1.0, 0.4), (0.75, 1.0, 0.55), emission=(0.25, 1.0, 0.4), emission_strength=3.0, seed=72)
    m_eye = make_pbr_mat("SlimeEye", (0.03, 0.03, 0.05), (0.08, 0.08, 0.12), roughness=0.15, seed=73)

    sculpt_cross_section("SlimeDome", [(0.38, 0.38, 0, 0.0), (0.52, 0.52, 0, 0.14), (0.48, 0.48, 0, 0.44), (0.30, 0.30, 0, 0.68), (0.08, 0.08, 0, 0.76)], segments=20, mat=m_jelly, parent=body, subsurf=1)
    sculpt_cross_section("SlimeCore", [(0.08, 0.08, 0, 0.16), (0.20, 0.20, 0, 0.30), (0.18, 0.18, 0, 0.46), (0.06, 0.06, 0, 0.56)], segments=12, mat=m_core, parent=body, subsurf=1)
    for sx in (-0.17, 0.17):
        sculpt_cross_section(f"Eye_{sx}", [(0.03, 0.02, 0, 0), (0.065, 0.04, 0, 0.06), (0.03, 0.02, 0, 0.12)], segments=10, mat=m_eye, parent=body, loc=(sx, -0.46, 0.34), subsurf=0)

    for clip, f0, f1, sz in [("Idle", 1, 30, 1.12), ("Walk", 40, 60, 1.28), ("Attack", 70, 88, 1.42)]:
        body.scale = Vector((1.0, 1.0, 1.0))
        body.keyframe_insert("scale", frame=f0)
        body.scale = Vector((1.12, 1.12, sz))
        body.keyframe_insert("scale", frame=(f0 + f1) // 2)
        body.scale = Vector((1.0, 1.0, 1.0))
        body.keyframe_insert("scale", frame=f1)
        push_nla(body, clip, f0, f1)

    render_studio_preview(r"d:\MMORPG\references\preview_slime.png")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "slime.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported slime.glb")


def build_wolf():
    clear_scene()
    root = make_joint("mob_wolf", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0.56), root)
    head = make_joint("Head", (0, -0.44, 0.14), body)
    tail = make_joint("Tail", (0, 0.44, 0.08), body)
    fl = make_joint("FL", (-0.16, -0.28, -0.04), body)
    fr = make_joint("FR", (0.16, -0.28, -0.04), body)
    bl = make_joint("BL", (-0.16, 0.28, -0.04), body)
    br = make_joint("BR", (0.16, 0.28, -0.04), body)

    m_fur = make_pbr_mat("WolfFur", (0.32, 0.36, 0.44), (0.68, 0.72, 0.78), metallic=0.05, roughness=0.82, pattern="fur", seed=81)
    m_eye = make_pbr_mat("WolfEye", (1.0, 0.65, 0.08), (1.0, 0.9, 0.4), emission=(1.0, 0.6, 0.08), emission_strength=3.5, seed=82)

    sculpt_cross_section("WolfTorso", [(0.12, 0.14, 0, -0.46), (0.23, 0.25, 0, -0.20), (0.20, 0.22, 0, 0.15), (0.27, 0.29, 0, 0.42), (0.14, 0.15, 0, 0.52)], segments=14, mat=m_fur, parent=body, rot=(1.57, 0, 0), subsurf=1)
    sculpt_cross_section("WolfHead", [(0.12, 0.12, 0, 0), (0.21, 0.20, 0, 0.16), (0.14, 0.15, 0, 0.34), (0.05, 0.06, 0, 0.48)], segments=12, mat=m_fur, parent=head, rot=(1.45, 0, 0), subsurf=1)
    for sx in (-0.09, 0.09):
        sculpt_cross_section(f"Ear_{sx}", [(0.05, 0.03, 0, 0), (0.01, 0.01, 0, 0.16)], segments=6, mat=m_fur, parent=head, loc=(sx, -0.06, 0.14), rot=(-0.2, sx * 1.8, 0), subsurf=0)
        sculpt_cross_section(f"Eye_{sx}", [(0.02, 0.02, 0, 0), (0.03, 0.03, 0, 0.04)], segments=8, mat=m_eye, parent=head, loc=(sx, -0.18, 0.16), subsurf=0)
    sculpt_cross_section("WolfTail", [(0.04, 0.04, 0, 0), (0.09, 0.09, 0, 0.22), (0.04, 0.04, 0, 0.46)], segments=10, mat=m_fur, parent=tail, rot=(-1.2, 0, 0), subsurf=1)

    for j in (fl, fr, bl, br):
        sculpt_cross_section(f"Leg_{j.name}", [(0.055, 0.075, -0.01, -0.52), (0.07, 0.07, 0, -0.26), (0.085, 0.085, 0, 0.02)], segments=10, mat=m_fur, parent=j, subsurf=1)

    def k_wolf(f, z=0, flx=0, frx=0, blx=0, brx=0, trz=0, hrx=0):
        body.location.z = 0.56 + z
        body.keyframe_insert("location", index=2, frame=f)
        tail.rotation_euler.z = trz
        tail.keyframe_insert("rotation_euler", index=2, frame=f)
        head.rotation_euler.x = hrx
        head.keyframe_insert("rotation_euler", index=0, frame=f)
        for j, rx in [(fl, flx), (fr, frx), (bl, blx), (br, brx)]:
            j.rotation_euler.x = rx
            j.keyframe_insert("rotation_euler", index=0, frame=f)

    k_wolf(1, 0, 0, 0, 0, 0, -0.25, 0)
    k_wolf(15, 0.03, 0, 0, 0, 0, 0.25, 0.08)
    k_wolf(30, 0, 0, 0, 0, 0, -0.25, 0)
    for j in (body, head, tail, fl, fr, bl, br):
        push_nla(j, "Idle", 1, 30)

    k_wolf(40, 0.0, 0.6, -0.6, -0.6, 0.6, 0.15, 0.05)
    k_wolf(50, 0.05, -0.6, 0.6, 0.6, -0.6, -0.15, -0.05)
    k_wolf(60, 0.0, 0.6, -0.6, -0.6, 0.6, 0.15, 0.05)
    for j in (body, head, tail, fl, fr, bl, br):
        push_nla(j, "Walk", 40, 60)

    k_wolf(70, 0.05, -0.3, -0.3, 0.3, 0.3, 0, -0.4)
    k_wolf(78, 0.12, 0.5, 0.5, -0.4, -0.4, 0, 0.45)
    k_wolf(88, 0.0, 0, 0, 0, 0, 0, 0)
    for j in (body, head, tail, fl, fr, bl, br):
        push_nla(j, "Attack", 70, 88)

    render_studio_preview(r"d:\MMORPG\references\preview_wolf.png")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "wolf.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported wolf.glb")


def build_orc():
    clear_scene()
    root = make_joint("mob_orc", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.76), root)

    m_skin = make_pbr_mat("OrcSkin", (0.24, 0.44, 0.14), (0.44, 0.66, 0.24), metallic=0.05, roughness=0.68, pattern="fbm", seed=91)
    m_iron = make_pbr_mat("OrcIron", (0.22, 0.24, 0.28), (0.48, 0.52, 0.58), metallic=0.78, roughness=0.38, pattern="plate", seed=92)
    m_red = make_pbr_mat("OrcPaint", (0.76, 0.10, 0.10), (0.95, 0.22, 0.16), metallic=0.1, roughness=0.45, seed=93)
    m_ivory = make_pbr_mat("OrcTusks", (0.85, 0.80, 0.68), (0.98, 0.95, 0.86), metallic=0.05, roughness=0.35, seed=94)

    sculpt_cross_section("OrcChest", [(0.22, 0.15, 0, 0.0), (0.34, 0.22, -0.02, 0.36), (0.36, 0.24, -0.01, 0.52), (0.20, 0.16, 0, 0.64)], segments=12, mat=m_skin, parent=pelvis, subsurf=1)
    sculpt_cross_section("OrcBelt", [(0.24, 0.16, 0, -0.03), (0.25, 0.17, 0, 0.08)], segments=10, mat=m_iron, parent=pelvis, subsurf=0)
    sculpt_cross_section("OrcHead", [(0.12, 0.13, 0, 0.62), (0.20, 0.20, -0.02, 0.76), (0.18, 0.18, 0, 0.92), (0.10, 0.11, 0, 1.0)], segments=12, mat=m_skin, parent=pelvis, subsurf=1)
    for sx in (-0.08, 0.08):
        sculpt_cross_section(f"Tusk_{sx}", [(0.025, 0.025, 0, 0), (0.006, 0.006, -0.02, 0.12)], segments=6, mat=m_ivory, parent=pelvis, loc=(sx, -0.17, 0.70), rot=(-0.3, 0, 0), subsurf=0)
    sculpt_cross_section("OrcPauldron", [(0.18, 0.17, 0, 0), (0.20, 0.18, 0, 0.10), (0.08, 0.08, 0, 0.20)], segments=8, mat=m_iron, parent=pelvis, loc=(-0.36, 0, 0.50), rot=(0, 0.35, 0), subsurf=0)

    arm_l = make_joint("Arm.L", (-0.39, 0, 0.52), pelvis, (0, 0.26, 0))
    arm_r = make_joint("Arm.R", (0.39, 0, 0.52), pelvis, (0, -0.26, 0))
    leg_l = make_joint("Leg.L", (-0.16, 0, -0.02), pelvis)
    leg_r = make_joint("Leg.R", (0.16, 0, -0.02), pelvis)
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        sculpt_cross_section(f"OrcArm_{n}", [(0.09, 0.09, 0, -0.48), (0.12, 0.12, 0, -0.22), (0.11, 0.11, 0, 0.02)], segments=10, mat=m_skin, parent=j, subsurf=1)
    for j, n in [(leg_l, "L"), (leg_r, "R")]:
        sculpt_cross_section(f"OrcLeg_{n}", [(0.11, 0.14, -0.02, -0.74), (0.12, 0.12, 0, -0.34), (0.13, 0.13, 0, -0.04)], segments=10, mat=m_iron, parent=j, subsurf=0)

    sculpt_battleaxe("OrcBattleaxe", m_iron, m_red, parent=arm_r, loc=(0.04, -0.08, -0.40), rot=(1.15, 0, 0))

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r)
    render_studio_preview(r"d:\MMORPG\references\preview_orc.png")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "orc.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported orc.glb")


def build_boss_golem():
    clear_scene()
    root = make_joint("mob_boss_golem", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.90), root)

    m_rock = make_pbr_mat("ObsidianMagma", (0.09, 0.08, 0.11), (0.26, 0.22, 0.28), metallic=0.25, roughness=0.78, pattern="magma", bump_strength=0.6, seed=101)
    m_magma = make_pbr_mat("MagmaCore", (1.0, 0.24, 0.02), (1.0, 0.60, 0.05), emission=(1.0, 0.28, 0.02), emission_strength=2.2, pattern="magma", seed=102)

    # Jagged asymmetric basalt colossus with recessed glowing magma core & orbiting shards
    sculpt_jagged_rock("GolemTorso", radius=0.58, seed=101, mat=m_rock, parent=pelvis, loc=(0, 0, 0.36), scale=(1.15, 0.85, 1.15))
    sculpt_jagged_rock("GolemCore", radius=0.22, seed=102, mat=m_magma, parent=pelvis, loc=(0, -0.26, 0.36), scale=(1.0, 0.8, 1.2))
    sculpt_jagged_rock("GolemHead", radius=0.28, seed=103, mat=m_rock, parent=pelvis, loc=(0, 0, 0.92), scale=(1.0, 0.95, 1.1))
    sculpt_cross_section("GolemEyes", [(0.11, 0.03, -0.24, 0.92), (0.13, 0.03, -0.24, 0.96)], segments=6, mat=m_magma, parent=pelvis, subsurf=0)
    for sx in (-0.56, 0.56):
        sculpt_jagged_rock(f"RuneShard_{sx}", radius=0.16, seed=105 + int(sx * 10), mat=m_magma, parent=pelvis, loc=(sx, 0, 0.88), scale=(0.6, 0.6, 1.6))

    arm_l = make_joint("Arm.L", (-0.58, 0, 0.62), pelvis, (0, -0.16, 0))
    arm_r = make_joint("Arm.R", (0.58, 0, 0.62), pelvis, (0, 0.16, 0))
    leg_l = make_joint("Leg.L", (-0.25, 0, 0.0), pelvis)
    leg_r = make_joint("Leg.R", (0.25, 0, 0.0), pelvis)
    for j, n in [(arm_l, "L"), (arm_r, "R")]:
        sculpt_jagged_rock(f"GolemArm_{n}", radius=0.26, seed=110, mat=m_rock, parent=j, loc=(0, 0, -0.38), scale=(0.85, 0.85, 1.65))
    for j, n in [(leg_l, "L"), (leg_r, "R")]:
        sculpt_jagged_rock(f"GolemLeg_{n}", radius=0.26, seed=120, mat=m_rock, parent=j, loc=(0, 0, -0.45), scale=(0.9, 0.9, 1.8))

    animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="heavy")
    render_studio_preview(r"d:\MMORPG\references\preview_boss_golem.png")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "boss_golem.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 MaxQuality] Exported boss_golem.glb")


if __name__ == "__main__":
    build_slime()
    build_wolf()
    build_orc()
    build_boss_golem()

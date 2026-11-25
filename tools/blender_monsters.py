import math
import os
import sys
import bpy
from mathutils import Euler, Vector

sys.path.insert(0, r"d:\MMORPG\tools")
from blender_textures import bake_pbr_material
from blender_heroes import (
    clear_scene,
    make_lathe_mesh,
    make_sculpted_blade,
    make_joint,
    push_nla,
    animate_joints,
    OUT_DIR,
)


def build_slime():
    clear_scene()
    root = make_joint("mob_slime", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0), root)

    m_jelly = bake_pbr_material("SlimeJelly", (0.06, 0.72, 0.3), (0.2, 0.95, 0.45), metallic=0.05, roughness=0.14, alpha=0.82, pattern="grain", seed=71)
    m_core = bake_pbr_material("SlimeCore", (0.3, 1.0, 0.45), (0.8, 1.0, 0.6), emission_rgb=(0.25, 1.0, 0.4), emission_strength=2.8, seed=72)
    m_eye = bake_pbr_material("SlimeEye", (0.04, 0.04, 0.07), (0.1, 0.1, 0.15), roughness=0.2, seed=73)

    make_lathe_mesh("SlimeDome", [(0.35, 0.0), (0.52, 0.15), (0.48, 0.45), (0.3, 0.68), (0.08, 0.76)], segments=20, mat=m_jelly, subsurf=1, parent=body)
    make_lathe_mesh("SlimeCoreMesh", [(0.1, 0.14), (0.22, 0.28), (0.2, 0.44), (0.08, 0.54)], segments=12, mat=m_core, subsurf=1, parent=body)
    for sx in (-0.16, 0.16):
        make_lathe_mesh(f"Eye_{sx}", [(0.03, 0), (0.06, 0.05), (0.03, 0.1)], segments=10, mat=m_eye, subsurf=1, parent=body, loc=(sx, -0.44, 0.38))

    for clip, f0, f1, sz in [("Idle", 1, 30, 1.12), ("Walk", 40, 60, 1.28), ("Attack", 70, 88, 1.42)]:
        body.scale = Vector((1.0, 1.0, 1.0))
        body.keyframe_insert("scale", frame=f0)
        body.scale = Vector((1.12, 1.12, sz))
        body.keyframe_insert("scale", frame=(f0 + f1) // 2)
        body.scale = Vector((1.0, 1.0, 1.0))
        body.keyframe_insert("scale", frame=f1)
        push_nla(body, clip, f0, f1)

    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "slime.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 CleanRig] Exported slime.glb")


def build_wolf():
    clear_scene()
    root = make_joint("mob_wolf", (0, 0, 0))
    body = make_joint("Body", (0, 0, 0.56), root)
    head = make_joint("Head", (0, -0.42, 0.12), body)
    tail = make_joint("Tail", (0, 0.42, 0.08), body)
    fl = make_joint("FL", (-0.16, -0.28, -0.04), body)
    fr = make_joint("FR", (0.16, -0.28, -0.04), body)
    bl = make_joint("BL", (-0.16, 0.28, -0.04), body)
    br = make_joint("BR", (0.16, 0.28, -0.04), body)

    m_fur = bake_pbr_material("WolfFur", (0.38, 0.42, 0.5), (0.68, 0.72, 0.78), roughness=0.82, pattern="fur", seed=81)
    m_eye = bake_pbr_material("WolfEye", (1.0, 0.65, 0.08), (1.0, 0.9, 0.4), emission_rgb=(1.0, 0.6, 0.08), emission_strength=3.2, seed=82)

    make_lathe_mesh("WolfTorso", [(0.12, -0.45), (0.24, -0.2), (0.22, 0.15), (0.27, 0.42), (0.14, 0.52)], segments=14, mat=m_fur, subsurf=1, parent=body, rot=(1.57, 0, 0))
    make_lathe_mesh("WolfHead", [(0.12, 0), (0.21, 0.16), (0.16, 0.34), (0.06, 0.48)], segments=12, mat=m_fur, subsurf=1, parent=head, rot=(1.45, 0, 0))
    for sx in (-0.09, 0.09):
        make_lathe_mesh(f"WEye_{sx}", [(0.02, 0), (0.035, 0.03), (0.02, 0.06)], segments=8, mat=m_eye, subsurf=0, parent=head, loc=(sx, -0.22, 0.1))
    make_lathe_mesh("WolfTail", [(0.04, 0), (0.09, 0.2), (0.05, 0.45), (0.01, 0.52)], segments=10, mat=m_fur, subsurf=1, parent=tail, rot=(-1.25, 0, 0))

    leg_p = [(0.055, -0.52), (0.07, -0.28), (0.08, -0.05), (0.05, 0.02)]
    for j in (fl, fr, bl, br):
        make_lathe_mesh(f"Wolf_{j.name}", leg_p, segments=10, mat=m_fur, subsurf=1, parent=j)

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

    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "wolf.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 CleanRig] Exported wolf.glb")


def build_orc():
    clear_scene()
    root = make_joint("mob_orc", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.74), root)

    m_skin = bake_pbr_material("OrcSkin", (0.3, 0.52, 0.18), (0.48, 0.7, 0.28), roughness=0.65, pattern="grain", seed=91)
    m_iron = bake_pbr_material("OrcIron", (0.32, 0.35, 0.4), (0.62, 0.66, 0.72), metallic=0.75, roughness=0.4, pattern="metal", seed=92)
    m_red = bake_pbr_material("OrcPaint", (0.8, 0.12, 0.12), (0.95, 0.25, 0.18), roughness=0.45, seed=93)

    make_lathe_mesh("OrcChest", [(0.2, 0.0), (0.34, 0.14), (0.31, 0.32), (0.38, 0.52), (0.28, 0.62)], segments=14, mat=m_skin, subsurf=1, parent=pelvis, scale=(1.15, 0.85, 1.08))
    make_lathe_mesh("OrcHead", [(0.12, 0), (0.22, 0.14), (0.21, 0.28), (0.14, 0.38)], segments=12, mat=m_skin, subsurf=1, parent=pelvis, loc=(0, 0, 0.65))
    make_lathe_mesh("OrcPauldron", [(0.08, 0), (0.22, 0.08), (0.18, 0.22), (0.05, 0.26)], segments=10, mat=m_iron, subsurf=1, parent=pelvis, loc=(-0.36, 0, 0.52))

    arm_l = make_joint("Arm.L", (-0.38, 0, 0.54), pelvis)
    arm_r = make_joint("Arm.R", (0.38, 0, 0.54), pelvis)
    leg_l = make_joint("Leg.L", (-0.16, 0, 0.0), pelvis)
    leg_r = make_joint("Leg.R", (0.16, 0, 0.0), pelvis)

    arm_p = [(0.09, -0.48), (0.115, -0.25), (0.125, -0.05), (0.085, 0.02)]
    leg_p = [(0.095, -0.74), (0.115, -0.38), (0.125, -0.08), (0.09, 0.02)]
    make_lathe_mesh("Orc_AL", arm_p, segments=12, mat=m_skin, subsurf=1, parent=arm_l)
    make_lathe_mesh("Orc_AR", arm_p, segments=12, mat=m_skin, subsurf=1, parent=arm_r)
    make_lathe_mesh("Orc_LL", leg_p, segments=12, mat=m_iron, subsurf=1, parent=leg_l)
    make_lathe_mesh("Orc_RL", leg_p, segments=12, mat=m_iron, subsurf=1, parent=leg_r)

    make_lathe_mesh("AxeHaft", [(0.035, 0), (0.04, 0.88)], segments=10, mat=m_iron, subsurf=0, parent=arm_r, loc=(0, -0.06, -0.42), rot=(-1.25, 0, 0))
    make_sculpted_blade("AxeHead", length=0.42, width=0.28, mat=m_red, parent=arm_r, loc=(0, -0.82, -0.18), rot=(-0.2, 1.57, 0))

    animate_joints(pelvis, arm_l, arm_r, leg_l, leg_r)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "orc.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 CleanRig] Exported orc.glb")


def build_boss_golem():
    clear_scene()
    root = make_joint("mob_boss_golem", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.85), root)

    m_rock = bake_pbr_material("ObsidianMagma", (0.14, 0.12, 0.16), (0.34, 0.3, 0.36), metallic=0.3, roughness=0.72, pattern="magma", seed=101)
    m_magma = bake_pbr_material("MagmaCore", (1.0, 0.42, 0.05), (1.0, 0.85, 0.25), emission_rgb=(1.0, 0.38, 0.02), emission_strength=4.5, pattern="magma", seed=102)

    make_lathe_mesh("GolemChest", [(0.28, 0.0), (0.48, 0.22), (0.54, 0.52), (0.36, 0.72)], segments=12, mat=m_rock, subsurf=1, parent=pelvis, scale=(1.15, 0.85, 1.1))
    make_lathe_mesh("GolemCore", [(0.08, 0), (0.2, 0.12), (0.18, 0.26), (0.06, 0.34)], segments=12, mat=m_magma, subsurf=1, parent=pelvis, loc=(0, -0.34, 0.25))
    make_lathe_mesh("GolemHead", [(0.16, 0), (0.26, 0.14), (0.24, 0.3), (0.12, 0.38)], segments=10, mat=m_rock, subsurf=1, parent=pelvis, loc=(0, 0, 0.72))

    arm_l = make_joint("Arm.L", (-0.54, 0, 0.62), pelvis)
    arm_r = make_joint("Arm.R", (0.54, 0, 0.62), pelvis)
    leg_l = make_joint("Leg.L", (-0.22, 0, 0.0), pelvis)
    leg_r = make_joint("Leg.R", (0.22, 0, 0.0), pelvis)

    arm_p = [(0.14, -0.65), (0.18, -0.32), (0.16, -0.05), (0.11, 0.04)]
    leg_p = [(0.14, -0.85), (0.18, -0.42), (0.16, -0.08), (0.12, 0.02)]
    for j, n in [(arm_l, "AL"), (arm_r, "AR")]:
        make_lathe_mesh(f"Golem_{n}", arm_p, segments=10, mat=m_rock, subsurf=1, parent=j)
    for j, n in [(leg_l, "LL"), (leg_r, "RL")]:
        make_lathe_mesh(f"Golem_{n}", leg_p, segments=10, mat=m_rock, subsurf=1, parent=j)

    animate_joints(pelvis, arm_l, arm_r, leg_l, leg_r)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, "boss_golem.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print("[Blender 5.2 CleanRig] Exported boss_golem.glb")


if __name__ == "__main__":
    build_slime()
    build_wolf()
    build_orc()
    build_boss_golem()

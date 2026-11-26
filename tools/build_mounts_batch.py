import os
import sys
import bpy
from mathutils import Vector

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blender_sculpt_lib import (
    clear_scene,
    make_pbr_mat,
    make_joint,
    sculpt_cross_section,
    push_nla,
    render_studio_preview,
)

OUT_DIR = os.path.join(ROOT_DIR, "client", "public", "models")
os.makedirs(OUT_DIR, exist_ok=True)
PREV_DIR = os.path.join(ROOT_DIR, "references", "mount_previews")
os.makedirs(PREV_DIR, exist_ok=True)


def animate_quadruped(body, head, tail, fl, fr, bl, br, base_z=0.72):
    def kf(f, z=0, flx=0, frx=0, blx=0, brx=0, trz=0, hrx=0):
        body.location.z = base_z + z
        body.keyframe_insert("location", index=2, frame=f)
        tail.rotation_euler.z = trz
        tail.keyframe_insert("rotation_euler", index=2, frame=f)
        head.rotation_euler.x = hrx
        head.keyframe_insert("rotation_euler", index=0, frame=f)
        for j, rx in [(fl, flx), (fr, frx), (bl, blx), (br, brx)]:
            j.rotation_euler.x = rx
            j.keyframe_insert("rotation_euler", index=0, frame=f)

    kf(1, 0, 0, 0, 0, 0, -0.15, 0)
    kf(15, 0.03, 0, 0, 0, 0, 0.15, 0.05)
    kf(30, 0, 0, 0, 0, 0, -0.15, 0)
    for j in (body, head, tail, fl, fr, bl, br):
        push_nla(j, "Idle", 1, 30)

    kf(40, 0.0, 0.55, -0.55, -0.55, 0.55, 0.15, 0.05)
    kf(50, 0.06, -0.55, 0.55, 0.55, -0.55, -0.15, -0.05)
    kf(60, 0.0, 0.55, -0.55, -0.55, 0.55, 0.15, 0.05)
    for j in (body, head, tail, fl, fr, bl, br):
        push_nla(j, "Walk", 40, 60)


def build_mount(
    name: str,
    coat_a,
    coat_b,
    armor_a,
    armor_b,
    glow_col=None,
    has_wings=False,
    has_horns=False,
    seed=400,
):
    clear_scene()
    root = make_joint(name, (0, 0, 0))
    body = make_joint("Body", (0, 0, 0.72), root)
    head = make_joint("Head", (0, -0.55, 0.25), body)
    tail = make_joint("Tail", (0, 0.55, 0.12), body)
    fl = make_joint("FL", (-0.19, -0.36, -0.04), body)
    fr = make_joint("FR", (0.19, -0.36, -0.04), body)
    bl = make_joint("BL", (-0.19, 0.36, -0.04), body)
    br = make_joint("BR", (0.19, 0.36, -0.04), body)

    m_coat = make_pbr_mat(f"{name}_Coat", coat_a, coat_b, metallic=0.1, roughness=0.65, pattern="fur", seed=seed)
    m_armor = make_pbr_mat(f"{name}_Armor", armor_a, armor_b, metallic=0.88, roughness=0.25, seed=seed + 1)
    m_saddle = make_pbr_mat(f"{name}_Saddle", (0.28, 0.12, 0.06), (0.48, 0.24, 0.12), metallic=0.15, roughness=0.55, seed=seed + 2)
    m_glow = make_pbr_mat(
        f"{name}_Glow",
        glow_col or (1.0, 0.78, 0.25),
        (1.0, 0.95, 0.7),
        emission=glow_col or (1.0, 0.72, 0.2),
        emission_strength=3.2 if glow_col else 1.8,
        seed=seed + 3,
    )

    # Muscular torso + chestplate + saddle
    sculpt_cross_section("Torso", [(0.14, 0.16, 0, -0.58), (0.26, 0.28, 0, -0.25), (0.23, 0.25, 0, 0.15), (0.29, 0.31, 0, 0.48), (0.15, 0.17, 0, 0.62)], segments=14, mat=m_coat, parent=body, rot=(1.57, 0, 0), subsurf=1)
    sculpt_cross_section("Breastplate", [(0.24, 0.25, 0, 0.26), (0.31, 0.32, 0, 0.46), (0.18, 0.19, 0, 0.58)], segments=12, mat=m_armor, parent=body, rot=(1.57, 0, 0), subsurf=0)
    sculpt_cross_section("Saddle", [(0.25, 0.14, 0, -0.15), (0.27, 0.16, 0, 0.15)], segments=12, mat=m_saddle, parent=body, loc=(0, 0.02, 0.24), rot=(1.57, 0, 0), subsurf=0)

    # Neck & Head + Chamfron armor
    sculpt_cross_section("NeckHead", [(0.14, 0.15, 0, 0.0), (0.18, 0.19, 0, 0.22), (0.14, 0.16, 0, 0.44), (0.07, 0.08, 0, 0.60)], segments=12, mat=m_coat, parent=head, rot=(1.15, 0, 0), subsurf=1)
    sculpt_cross_section("Chamfron", [(0.15, 0.16, 0, 0.24), (0.11, 0.12, 0, 0.50)], segments=10, mat=m_armor, parent=head, loc=(0, -0.02, 0.03), rot=(1.15, 0, 0), subsurf=0)

    for sx in (-0.09, 0.09):
        sculpt_cross_section(f"Eye_{sx}", [(0.02, 0.02, 0, 0), (0.03, 0.03, 0, 0.04)], segments=8, mat=m_glow, parent=head, loc=(sx, -0.34, 0.22), subsurf=0)
        if has_horns:
            sculpt_cross_section(f"Horn_{sx}", [(0.04, 0.04, 0, 0), (0.025, 0.025, 0, 0.18), (0.005, 0.005, 0, 0.36)], segments=8, mat=m_armor, parent=head, loc=(sx * 1.4, -0.16, 0.28), rot=(-0.4, sx * 2.5, 0), subsurf=1)

    sculpt_cross_section("Tail", [(0.04, 0.04, 0, 0), (0.10, 0.10, 0, 0.25), (0.04, 0.04, 0, 0.56)], segments=10, mat=m_glow if glow_col else m_coat, parent=tail, rot=(-1.15, 0, 0), subsurf=1)

    for j in (fl, fr, bl, br):
        sculpt_cross_section(f"Leg_{j.name}", [(0.06, 0.08, 0, -0.66), (0.075, 0.075, 0, -0.34), (0.095, 0.095, 0, 0.04)], segments=10, mat=m_coat, parent=j, subsurf=1)
        sculpt_cross_section(f"Greave_{j.name}", [(0.07, 0.085, 0, -0.62), (0.08, 0.085, 0, -0.40)], segments=8, mat=m_armor, parent=j, subsurf=0)

    if has_wings:
        for side in (-1, 1):
            sculpt_cross_section(f"Wing_{side}", [(0.02, 0.06, 0, 0), (0.03, 0.26, 0, 0.45), (0.02, 0.30, 0, 0.85), (0.01, 0.08, 0, 1.15)], segments=8, mat=m_glow, parent=body, loc=(side * 0.22, 0.05, 0.26), rot=(0.25, side * 1.1, side * 0.35), subsurf=1)

    animate_quadruped(body, head, tail, fl, fr, bl, br, base_z=0.72)
    render_studio_preview(os.path.join(PREV_DIR, f"preview_{name}.png"))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, f"{name}.glb"), export_format="GLB", export_animations=True, export_nla_strips=True, export_apply=True)
    print(f"[Blender 5.2] Exported {name}.glb")


if __name__ == "__main__":
    build_mount("mount_horse", (0.24, 0.14, 0.08), (0.42, 0.26, 0.15), (0.58, 0.62, 0.68), (0.82, 0.64, 0.28), glow_col=None, has_wings=False, has_horns=False, seed=410)
    build_mount("mount_wolf", (0.14, 0.16, 0.24), (0.30, 0.34, 0.48), (0.25, 0.28, 0.38), (0.45, 0.55, 0.72), glow_col=(0.35, 0.75, 1.0), has_wings=False, has_horns=False, seed=420)
    build_mount("mount_lava", (0.16, 0.05, 0.04), (0.35, 0.10, 0.06), (0.22, 0.12, 0.10), (0.52, 0.26, 0.12), glow_col=(1.0, 0.42, 0.08), has_wings=False, has_horns=True, seed=430)
    build_mount("mount_griffin", (0.72, 0.62, 0.42), (0.95, 0.88, 0.68), (0.85, 0.68, 0.25), (1.0, 0.85, 0.42), glow_col=(1.0, 0.88, 0.45), has_wings=True, has_horns=False, seed=440)
    build_mount("mount_dragon", (0.18, 0.04, 0.08), (0.38, 0.08, 0.15), (0.14, 0.10, 0.14), (0.45, 0.15, 0.25), glow_col=(0.95, 0.22, 0.42), has_wings=True, has_horns=True, seed=450)

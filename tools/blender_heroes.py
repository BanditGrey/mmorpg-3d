import math
import os
import sys
import bpy
import bmesh
from mathutils import Euler

sys.path.insert(0, r"d:\MMORPG\tools")
from blender_textures import bake_pbr_material

OUT_DIR = r"d:\MMORPG\client\public\models"
os.makedirs(OUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_lathe_mesh(name, profile_rz, segments=16, mat=None, subsurf=1, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    bm = bmesh.new()
    rings = []
    for r, z in profile_rz:
        ring = []
        for s in range(segments):
            ang = (s / segments) * math.pi * 2.0
            v = bm.verts.new((math.cos(ang) * r, math.sin(ang) * r, z))
            ring.append(v)
        rings.append(ring)

    for i in range(len(rings) - 1):
        for s in range(segments):
            ns = (s + 1) % segments
            bm.faces.new((rings[i][s], rings[i][ns], rings[i + 1][ns], rings[i + 1][s]))

    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = Euler(rot, "XYZ")
    obj.scale = scale
    for p in obj.data.polygons:
        p.use_smooth = True
    if subsurf > 0:
        mod = obj.modifiers.new("Subsurf", "SUBSURF")
        mod.levels = subsurf
        mod.render_levels = subsurf
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.smart_project(angle_limit=1.15)
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def make_sculpted_blade(name, length=0.85, width=0.11, mat=None, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    bm = bmesh.new()
    verts = [
        bm.verts.new((0, -width * 0.5, 0)),
        bm.verts.new((0, width * 0.5, 0)),
        bm.verts.new((0.02, 0, 0)),
        bm.verts.new((-0.02, 0, 0)),
        bm.verts.new((0, -width * 0.35, length * 0.78)),
        bm.verts.new((0, width * 0.35, length * 0.78)),
        bm.verts.new((0.015, 0, length * 0.78)),
        bm.verts.new((-0.015, 0, length * 0.78)),
        bm.verts.new((0, 0, length)),
    ]
    bm.faces.new((verts[0], verts[2], verts[6], verts[4]))
    bm.faces.new((verts[2], verts[1], verts[5], verts[6]))
    bm.faces.new((verts[1], verts[3], verts[7], verts[5]))
    bm.faces.new((verts[3], verts[0], verts[4], verts[7]))
    bm.faces.new((verts[4], verts[6], verts[8]))
    bm.faces.new((verts[6], verts[5], verts[8]))
    bm.faces.new((verts[5], verts[7], verts[8]))
    bm.faces.new((verts[7], verts[4], verts[8]))
    bm.faces.new((verts[0], verts[3], verts[1], verts[2]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = Euler(rot, "XYZ")
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def make_joint(name, loc=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_mode = "XYZ"
    if parent:
        obj.parent = parent
    return obj


def push_nla(obj, clip_name, f0, f1):
    if not obj.animation_data or not obj.animation_data.action:
        return
    act = obj.animation_data.action
    act.name = f"{obj.name}_{clip_name}"
    trk = obj.animation_data.nla_tracks.new()
    trk.name = clip_name
    st = trk.strips.new(clip_name, int(f0), act)
    st.action_frame_start = f0
    st.action_frame_end = f1
    obj.animation_data.action = None


def animate_joints(pelvis, arm_l, arm_r, leg_l, leg_r):
    base_z = pelvis.location.z
    joints = [pelvis, arm_l, arm_r, leg_l, leg_r]

    def pose(f, pz=0.0, al=0.0, ar=0.0, ll=0.0, lr=0.0):
        pelvis.location.z = base_z + pz
        pelvis.keyframe_insert("location", index=2, frame=f)
        for j, rx in [(arm_l, al), (arm_r, ar), (leg_l, ll), (leg_r, lr)]:
            j.rotation_euler.x = rx
            j.keyframe_insert("rotation_euler", index=0, frame=f)

    # Idle (1..30)
    pose(1, 0.0, 0.06, -0.06, 0.0, 0.0)
    pose(15, 0.03, 0.12, -0.12, 0.0, 0.0)
    pose(30, 0.0, 0.06, -0.06, 0.0, 0.0)
    for j in joints:
        push_nla(j, "Idle", 1, 30)

    # Walk (40..64)
    pose(40, 0.0, 0.55, -0.55, -0.55, 0.55)
    pose(46, 0.04, 0.0, 0.0, 0.0, 0.0)
    pose(52, 0.0, -0.55, 0.55, 0.55, -0.55)
    pose(58, 0.04, 0.0, 0.0, 0.0, 0.0)
    pose(64, 0.0, 0.55, -0.55, -0.55, 0.55)
    for j in joints:
        push_nla(j, "Walk", 40, 64)

    # Attack (70..90)
    pose(70, 0.0, 0.15, -0.35, 0.1, -0.1)
    pose(76, 0.03, -0.35, -1.65, 0.18, -0.18)
    pose(83, -0.03, 0.25, 0.95, -0.18, 0.18)
    pose(90, 0.0, 0.06, -0.06, 0.0, 0.0)
    for j in joints:
        push_nla(j, "Attack", 70, 90)


def build_hero(cls_id):
    clear_scene()
    root = make_joint(f"hero_{cls_id}", (0, 0, 0))
    pelvis = make_joint("Pelvis", (0, 0, 0.72), root)

    palettes = {
        "warrior": ((0.52, 0.58, 0.68), (0.92, 0.72, 0.18), (0.78, 0.1, 0.16), (1.0, 0.4, 0.2), "metal"),
        "mage": ((0.2, 0.28, 0.72), (0.92, 0.76, 0.22), (0.14, 0.18, 0.5), (0.25, 0.9, 1.0), "grain"),
        "archer": ((0.12, 0.48, 0.28), (0.65, 0.44, 0.2), (0.08, 0.34, 0.2), (0.3, 1.0, 0.55), "grain"),
        "assassin": ((0.2, 0.16, 0.3), (0.6, 0.28, 0.85), (0.1, 0.08, 0.16), (0.8, 0.4, 1.0), "metal"),
        "paladin": ((0.92, 0.88, 0.76), (0.98, 0.76, 0.14), (0.92, 0.88, 0.78), (1.0, 0.9, 0.35), "metal"),
    }
    c_main, c_trim, c_cloth, c_glow, pat = palettes[cls_id]
    m_main = bake_pbr_material(f"{cls_id}_Main", c_main, (min(1, c_main[0] * 1.25), min(1, c_main[1] * 1.25), min(1, c_main[2] * 1.25)),
                               metallic=0.65 if pat == "metal" else 0.15, roughness=0.35, pattern=pat, seed=11)
    m_trim = bake_pbr_material(f"{cls_id}_Trim", c_trim, (1.0, 0.92, 0.45), metallic=0.82, roughness=0.25, pattern="metal", seed=22)
    m_cloth = bake_pbr_material(f"{cls_id}_Cloth", c_cloth, (c_cloth[0] * 0.75, c_cloth[1] * 0.75, c_cloth[2] * 0.75), metallic=0.05, roughness=0.75, pattern="grain", seed=33)
    m_glow = bake_pbr_material(f"{cls_id}_Glow", c_glow, (1, 1, 1), metallic=0.1, roughness=0.2, emission_rgb=c_glow, emission_strength=3.2, seed=44)
    m_steel = bake_pbr_material(f"{cls_id}_Steel", (0.78, 0.84, 0.92), (1.0, 1.0, 1.0), metallic=0.88, roughness=0.2, pattern="metal", seed=55)

    # Torso & Chest (local to Pelvis at z=0.72)
    make_lathe_mesh("Chest", [(0.16, 0.0), (0.24, 0.12), (0.22, 0.28), (0.28, 0.52), (0.23, 0.62), (0.12, 0.66)],
                    segments=16, mat=m_main, subsurf=1, parent=pelvis, loc=(0, 0, 0.0), scale=(1.05, 0.76, 1.0))
    make_lathe_mesh("Belt", [(0.23, 0.0), (0.24, 0.08), (0.22, 0.12)],
                    segments=16, mat=m_trim, subsurf=0, parent=pelvis, loc=(0, 0, -0.02), scale=(1.05, 0.78, 1.0))

    # Head / Helm (local to Pelvis at z=0.66..1.04)
    make_lathe_mesh("HeadMesh", [(0.08, 0.0), (0.17, 0.12), (0.18, 0.24), (0.14, 0.34), (0.04, 0.38)],
                    segments=16, mat=m_main if cls_id in ("warrior", "paladin") else m_cloth, subsurf=1, parent=pelvis, loc=(0, 0, 0.65))
    make_lathe_mesh("Visor", [(0.03, 0), (0.04, 0.04), (0.02, 0.06)],
                    segments=10, mat=m_glow, subsurf=0, parent=pelvis, loc=(0, -0.15, 0.83), scale=(2.4, 0.8, 0.8))

    if cls_id == "warrior":
        for sx, rz in [(-0.18, 0.45), (0.18, -0.45)]:
            make_lathe_mesh(f"Horn_{sx}", [(0.04, 0), (0.025, 0.14), (0.005, 0.25)],
                            segments=8, mat=m_steel, subsurf=1, parent=pelvis, loc=(sx, 0, 0.94), rot=(0, rz, 0))
    elif cls_id == "paladin":
        make_lathe_mesh("Plume", [(0.05, 0), (0.08, 0.15), (0.02, 0.3)],
                        segments=10, mat=m_trim, subsurf=1, parent=pelvis, loc=(0, 0.05, 0.98), rot=(-0.4, 0, 0))

    # Pauldrons
    for side, sx in [("L", -0.27), ("R", 0.27)]:
        make_lathe_mesh(f"Pauldron_{side}", [(0.05, 0), (0.15, 0.06), (0.13, 0.15), (0.04, 0.18)],
                        segments=12, mat=m_trim if cls_id == "paladin" else m_main, subsurf=1, parent=pelvis, loc=(sx, 0, 0.48))

    # Flowing Cape
    make_lathe_mesh("Cape", [(0.16, 0.0), (0.24, 0.35), (0.18, 0.72), (0.08, 0.82)],
                    segments=12, mat=m_cloth, subsurf=1, parent=pelvis, loc=(0, 0.22, -0.22), rot=(0.18, 0, 0), scale=(1.1, 0.16, 1.0))

    # Arms (pivoted at shoulder z=0.52)
    arm_l = make_joint("Arm.L", (-0.28, 0, 0.52), pelvis)
    arm_r = make_joint("Arm.R", (0.28, 0, 0.52), pelvis)
    limb_p = [(0.065, -0.46), (0.085, -0.24), (0.095, -0.05), (0.065, 0.02)]
    make_lathe_mesh("Mesh_ArmL", limb_p, segments=12, mat=m_main, subsurf=1, parent=arm_l)
    make_lathe_mesh("Mesh_ArmR", limb_p, segments=12, mat=m_main, subsurf=1, parent=arm_r)

    # Legs (pivoted at hip z=0.0, extending down to -0.72)
    leg_l = make_joint("Leg.L", (-0.13, 0, 0.0), pelvis)
    leg_r = make_joint("Leg.R", (0.13, 0, 0.0), pelvis)
    leg_p = [(0.085, -0.72), (0.10, -0.38), (0.115, -0.08), (0.08, 0.02)]
    make_lathe_mesh("Mesh_LegL", leg_p, segments=12, mat=m_main, subsurf=1, parent=leg_l)
    make_lathe_mesh("Mesh_LegR", leg_p, segments=12, mat=m_main, subsurf=1, parent=leg_r)

    # Class-specific Weapons (attached to Arm.L / Arm.R hand at z=-0.42)
    if cls_id in ("warrior", "paladin"):
        make_lathe_mesh("Shield", [(0.08, 0), (0.26, 0.15), (0.28, 0.42), (0.18, 0.55)],
                        segments=8, mat=m_trim, subsurf=1, parent=arm_l, loc=(-0.08, -0.1, -0.58), scale=(0.22, 1.0, 1.0))
        if cls_id == "warrior":
            make_sculpted_blade("Greatsword", length=0.95, width=0.14, mat=m_steel, parent=arm_r, loc=(0, -0.06, -0.42), rot=(-1.25, 0, 0))
        else:
            make_lathe_mesh("HammerHaft", [(0.03, 0), (0.035, 0.78)], segments=10, mat=m_cloth, subsurf=0, parent=arm_r, loc=(0, -0.06, -0.42), rot=(-1.25, 0, 0))
            make_lathe_mesh("HammerHead", [(0.14, -0.16), (0.17, 0.0), (0.14, 0.16)], segments=8, mat=m_trim, subsurf=1, parent=arm_r, loc=(0, -0.78, -0.18), rot=(0, 1.57, 0))
    elif cls_id == "mage":
        make_lathe_mesh("Staff", [(0.03, -0.5), (0.035, 0.75), (0.06, 0.85)], segments=10, mat=m_trim, subsurf=1, parent=arm_r, loc=(0, -0.1, -0.35), rot=(-0.2, 0, 0))
        make_lathe_mesh("StaffOrb", [(0.04, 0), (0.12, 0.08), (0.12, 0.18), (0.04, 0.26)], segments=12, mat=m_glow, subsurf=1, parent=arm_r, loc=(0, -0.28, 0.52))
    elif cls_id == "archer":
        make_lathe_mesh("Bow", [(0.03, 0), (0.18, 0.35), (0.18, 0.7), (0.03, 1.05)], segments=10, mat=m_trim, subsurf=1, parent=arm_l, loc=(-0.06, -0.16, -0.82), scale=(0.25, 1.2, 1.0))
        make_sculpted_blade("Arrow", length=0.65, width=0.05, mat=m_glow, parent=arm_r, loc=(0, -0.08, -0.42), rot=(-1.57, 0, 0))
    elif cls_id == "assassin":
        make_sculpted_blade("DaggerL", length=0.52, width=0.08, mat=m_glow, parent=arm_l, loc=(0, -0.06, -0.42), rot=(-1.35, 0, 0))
        make_sculpted_blade("DaggerR", length=0.52, width=0.08, mat=m_glow, parent=arm_r, loc=(0, -0.06, -0.42), rot=(-1.35, 0, 0))

    animate_joints(pelvis, arm_l, arm_r, leg_l, leg_r)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT_DIR, f"{cls_id}.glb"),
        export_format="GLB",
        export_animations=True,
        export_nla_strips=True,
        export_apply=True,
    )
    print(f"[Blender 5.2 CleanRig] Exported {cls_id}.glb")


if __name__ == "__main__":
    for c in ["warrior", "mage", "archer", "assassin", "paladin"]:
        build_hero(c)

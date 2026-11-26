import math
import os
import bpy
import bmesh
from mathutils import Euler, Vector

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT_DIR, "client", "public", "models")
os.makedirs(OUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_mat(name, base_color, metallic=0.1, roughness=0.45, emission=None, emission_strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, alpha)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else "OPAQUE"
        bsdf.inputs["Alpha"].default_value = alpha
    return mat


def add_bevel_smooth(obj, width=0.02, segments=2):
    mod = obj.modifiers.new(name="Bevel", type="BEVEL")
    mod.width = width
    mod.segments = segments
    for poly in obj.data.polygons:
        poly.use_smooth = True


def add_subsurf(obj, levels=1):
    mod = obj.modifiers.new(name="Subsurf", type="SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    for poly in obj.data.polygons:
        poly.use_smooth = True


def create_part(name, kind, loc=(0, 0, 0), scale=(1, 1, 1), rot=(0, 0, 0), mat=None, parent=None, bevel=0.02):
    if kind == "cube":
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    elif kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.5, location=loc)
    elif kind == "cyl":
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.5, depth=1.0, location=loc)
    elif kind == "cone":
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.5, radius2=0.05, depth=1.0, location=loc)
    elif kind == "torus":
        bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=10, major_radius=0.5, minor_radius=0.08, location=loc)
    elif kind == "ico":
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.5, location=loc)

    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = Euler(rot, "XYZ")
    if bevel > 0 and kind in ("cube", "cyl"):
        add_bevel_smooth(obj, width=bevel, segments=2)
    else:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def create_empty(name, loc=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    if parent:
        obj.parent = parent
    return obj


def push_nla_clip(obj, clip_name, start_frame, end_frame):
    if not obj.animation_data or not obj.animation_data.action:
        return
    action = obj.animation_data.action
    action.name = f"{obj.name}_{clip_name}"
    track = obj.animation_data.nla_tracks.new()
    track.name = clip_name
    strip = track.strips.new(clip_name, int(start_frame), action)
    strip.action_frame_start = start_frame
    strip.action_frame_end = end_frame
    obj.animation_data.action = None


def animate_biped_clips(root, torso, left_arm, right_arm, left_leg, right_leg):
    # We keyframe all parts across 3 non-overlapping frame ranges and push them as NLA strips named Idle, Walk, Attack
    parts = [torso, left_arm, right_arm, left_leg, right_leg]

    def set_pose(frame, torso_z, la_rx, ra_rx, ll_rx, rl_rx):
        torso.location.z = torso_z
        torso.keyframe_insert(data_path="location", index=2, frame=frame)
        for p, rx in [(left_arm, la_rx), (right_arm, ra_rx), (left_leg, ll_rx), (right_leg, rl_rx)]:
            p.rotation_euler.x = rx
            p.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)

    # 1. Idle (1..30)
    base_z = torso.location.z
    set_pose(1, base_z, 0.05, -0.05, 0.0, 0.0)
    set_pose(15, base_z + 0.04, 0.1, -0.1, 0.0, 0.0)
    set_pose(30, base_z, 0.05, -0.05, 0.0, 0.0)
    for p in parts:
        push_nla_clip(p, "Idle", 1, 30)

    # 2. Walk (40..64)
    set_pose(40, base_z, 0.55, -0.55, -0.55, 0.55)
    set_pose(46, base_z + 0.05, 0.0, 0.0, 0.0, 0.0)
    set_pose(52, base_z, -0.55, 0.55, 0.55, -0.55)
    set_pose(58, base_z + 0.05, 0.0, 0.0, 0.0, 0.0)
    set_pose(64, base_z, 0.55, -0.55, -0.55, 0.55)
    for p in parts:
        push_nla_clip(p, "Walk", 40, 64)

    # 3. Attack (70..90)
    set_pose(70, base_z, 0.1, -0.3, 0.0, 0.0)
    set_pose(77, base_z + 0.03, -0.4, -1.6, 0.15, -0.15)
    set_pose(83, base_z - 0.04, 0.2, 0.9, -0.15, 0.15)
    set_pose(90, base_z, 0.05, -0.05, 0.0, 0.0)
    for p in parts:
        push_nla_clip(p, "Attack", 70, 90)


def export_glb(filename):
    path = os.path.join(OUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_animations=True,
        export_nla_strips=True,
        export_apply=True,
    )
    print(f"[Blender 5.2] Exported {path}")


def build_hero(cls_id):
    clear_scene()
    root = create_empty(f"hero_{cls_id}")

    # Palette per class
    palettes = {
        "warrior": dict(armor=(0.45, 0.5, 0.58), trim=(0.85, 0.65, 0.15), cloth=(0.75, 0.1, 0.18), glow=(0.95, 0.3, 0.2)),
        "mage": dict(armor=(0.15, 0.2, 0.55), trim=(0.85, 0.7, 0.2), cloth=(0.12, 0.14, 0.4), glow=(0.2, 0.85, 1.0)),
        "archer": dict(armor=(0.1, 0.42, 0.25), trim=(0.6, 0.42, 0.2), cloth=(0.08, 0.3, 0.18), glow=(0.2, 0.95, 0.55)),
        "assassin": dict(armor=(0.14, 0.12, 0.2), trim=(0.45, 0.2, 0.7), cloth=(0.08, 0.07, 0.12), glow=(0.75, 0.35, 1.0)),
        "paladin": dict(armor=(0.88, 0.82, 0.65), trim=(0.95, 0.72, 0.12), cloth=(0.9, 0.88, 0.8), glow=(1.0, 0.88, 0.35)),
    }
    pal = palettes[cls_id]
    m_armor = make_mat("Armor", pal["armor"], metallic=0.75 if cls_id in ("warrior", "paladin") else 0.2, roughness=0.35)
    m_trim = make_mat("Trim", pal["trim"], metallic=0.88, roughness=0.25)
    m_cloth = make_mat("Cloth", pal["cloth"], metallic=0.05, roughness=0.75)
    m_glow = make_mat("Glow", pal["glow"], metallic=0.1, roughness=0.2, emission=pal["glow"], emission_strength=3.2)
    m_skin = make_mat("Skin", (0.72, 0.55, 0.44), metallic=0.0, roughness=0.6)
    m_steel = make_mat("Steel", (0.78, 0.82, 0.88), metallic=0.92, roughness=0.2)

    torso = create_empty("TorsoPivot", (0, 0, 0.92), root)
    create_part("Chest", "cube", (0, 0, 0.05), (0.5, 0.32, 0.6), mat=m_armor, parent=torso, bevel=0.04)
    create_part("Belt", "cube", (0, 0, -0.22), (0.52, 0.34, 0.1), mat=m_trim, parent=torso, bevel=0.02)

    # Head / Helm
    create_part("Head", "sphere", (0, 0, 0.52), (0.36, 0.36, 0.38), mat=m_skin if cls_id == "archer" else m_armor, parent=torso)
    if cls_id in ("warrior", "paladin"):
        create_part("Visor", "cube", (0, -0.16, 0.52), (0.24, 0.08, 0.06), mat=m_glow, parent=torso, bevel=0.01)
        if cls_id == "warrior":
            create_part("HornL", "cone", (-0.2, 0, 0.66), (0.08, 0.08, 0.24), rot=(0, -0.5, 0), mat=m_steel, parent=torso)
            create_part("HornR", "cone", (0.2, 0, 0.66), (0.08, 0.08, 0.24), rot=(0, 0.5, 0), mat=m_steel, parent=torso)
        else:
            create_part("Plume", "cone", (0, 0.06, 0.76), (0.14, 0.24, 0.26), rot=(-0.3, 0, 0), mat=m_trim, parent=torso)
    else:
        create_part("Hood", "cone", (0, 0.04, 0.62), (0.44, 0.44, 0.42), rot=(0.25, 0, 0), mat=m_cloth, parent=torso)
        create_part("EyeL", "sphere", (-0.07, -0.17, 0.53), (0.05, 0.05, 0.05), mat=m_glow, parent=torso)
        create_part("EyeR", "sphere", (0.07, -0.17, 0.53), (0.05, 0.05, 0.05), mat=m_glow, parent=torso)

    # Pauldrons & Cape
    create_part("ShoulderL", "sphere", (-0.34, 0, 0.25), (0.24, 0.24, 0.22), mat=m_trim if cls_id == "paladin" else m_armor, parent=torso)
    create_part("ShoulderR", "sphere", (0.34, 0, 0.25), (0.24, 0.24, 0.22), mat=m_trim if cls_id == "paladin" else m_armor, parent=torso)
    if cls_id in ("warrior", "assassin", "paladin"):
        create_part("Cape", "cube", (0, 0.2, -0.18), (0.44, 0.05, 0.72), rot=(0.15, 0, 0), mat=m_cloth, parent=torso, bevel=0.01)
    if cls_id == "archer":
        create_part("Quiver", "cyl", (0.12, 0.2, 0.08), (0.12, 0.12, 0.45), rot=(0.1, 0.35, 0), mat=m_trim, parent=torso)
    if cls_id in ("mage", "paladin"):
        create_part("Halo", "torus", (0, 0, 0.9), (0.45, 0.45, 0.45), mat=m_glow, parent=torso)

    # Arms & Weapons
    left_arm = create_empty("LeftArm", (-0.34, 0, 0.22), torso)
    create_part("ArmMeshL", "cyl", (0, 0, -0.22), (0.14, 0.14, 0.44), mat=m_armor, parent=left_arm)
    right_arm = create_empty("RightArm", (0.34, 0, 0.22), torso)
    create_part("ArmMeshR", "cyl", (0, 0, -0.22), (0.14, 0.14, 0.44), mat=m_armor, parent=right_arm)

    if cls_id == "warrior":
        create_part("Shield", "cube", (-0.1, -0.14, -0.26), (0.08, 0.36, 0.48), mat=m_trim, parent=left_arm, bevel=0.02)
        create_part("SwordBlade", "cube", (0.02, -0.35, -0.25), (0.06, 0.72, 0.12), rot=(0.2, 0, 0), mat=m_steel, parent=right_arm, bevel=0.015)
        create_part("SwordGuard", "cube", (0.02, -0.12, -0.28), (0.24, 0.06, 0.06), mat=m_trim, parent=right_arm)
    elif cls_id == "mage":
        create_part("StaffShaft", "cyl", (0, -0.15, -0.05), (0.06, 0.06, 1.25), rot=(0.2, 0, 0), mat=m_trim, parent=right_arm)
        create_part("StaffOrb", "ico", (0, -0.28, 0.58), (0.22, 0.22, 0.22), mat=m_glow, parent=right_arm)
    elif cls_id == "archer":
        create_part("Bow", "torus", (-0.06, -0.22, -0.2), (0.08, 0.55, 0.65), rot=(0, 1.57, 0), mat=m_trim, parent=left_arm)
        create_part("Arrow", "cyl", (0, -0.3, -0.22), (0.03, 0.03, 0.65), rot=(1.57, 0, 0), mat=m_glow, parent=right_arm)
    elif cls_id == "assassin":
        create_part("DaggerL", "cone", (0, -0.28, -0.32), (0.06, 0.1, 0.44), rot=(1.4, 0, 0), mat=m_glow, parent=left_arm)
        create_part("DaggerR", "cone", (0, -0.28, -0.32), (0.06, 0.1, 0.44), rot=(1.4, 0, 0), mat=m_glow, parent=right_arm)
    elif cls_id == "paladin":
        create_part("HolyShield", "cube", (-0.1, -0.14, -0.26), (0.08, 0.38, 0.5), mat=m_trim, parent=left_arm, bevel=0.02)
        create_part("HammerHaft", "cyl", (0, -0.18, -0.12), (0.06, 0.06, 0.85), rot=(0.3, 0, 0), mat=m_cloth, parent=right_arm)
        create_part("HammerHead", "cube", (0, -0.32, 0.28), (0.24, 0.36, 0.24), mat=m_trim, parent=right_arm, bevel=0.03)

    # Legs
    left_leg = create_empty("LeftLeg", (-0.14, 0, -0.26), torso)
    create_part("LegMeshL", "cyl", (0, 0, -0.26), (0.16, 0.16, 0.52), mat=m_armor, parent=left_leg)
    right_leg = create_empty("RightLeg", (0.14, 0, -0.26), torso)
    create_part("LegMeshR", "cyl", (0, 0, -0.26), (0.16, 0.16, 0.52), mat=m_armor, parent=right_leg)

    animate_biped_clips(root, torso, left_arm, right_arm, left_leg, right_leg)
    export_glb(f"{cls_id}.glb")


def build_monsters():
    # 1. Slime
    clear_scene()
    root = create_empty("mob_slime")
    m_jelly = make_mat("SlimeJelly", (0.1, 0.8, 0.35), metallic=0.05, roughness=0.15, alpha=0.82)
    m_core = make_mat("SlimeCore", (0.35, 1.0, 0.5), emission=(0.2, 1.0, 0.4), emission_strength=2.5)
    m_eye = make_mat("SlimeEye", (0.05, 0.05, 0.08), roughness=0.2)
    body = create_part("SlimeBody", "sphere", (0, 0, 0.42), (0.85, 0.85, 0.7), mat=m_jelly, parent=root)
    create_part("SlimeCore", "ico", (0, 0, 0.38), (0.38, 0.38, 0.34), mat=m_core, parent=body)
    create_part("EyeL", "sphere", (-0.15, -0.36, 0.08), (0.1, 0.08, 0.12), mat=m_eye, parent=body)
    create_part("EyeR", "sphere", (0.15, -0.36, 0.08), (0.1, 0.08, 0.12), mat=m_eye, parent=body)
    # Animate Slime
    for clip, f0, f1, sz in [("Idle", 1, 30, 0.78), ("Walk", 40, 60, 0.92), ("Attack", 70, 88, 1.05)]:
        body.scale = (0.85, 0.85, 0.7)
        body.keyframe_insert(data_path="scale", frame=f0)
        body.scale = (0.95, 0.95, sz)
        body.keyframe_insert(data_path="scale", frame=(f0 + f1) // 2)
        body.scale = (0.85, 0.85, 0.7)
        body.keyframe_insert(data_path="scale", frame=f1)
        push_nla_clip(body, clip, f0, f1)
    export_glb("slime.glb")

    # 2. Wolf
    clear_scene()
    root = create_empty("mob_wolf")
    m_fur = make_mat("WolfFur", (0.42, 0.46, 0.54), roughness=0.8)
    m_eye_w = make_mat("WolfEye", (1.0, 0.65, 0.1), emission=(1.0, 0.6, 0.1), emission_strength=3.0)
    torso = create_empty("WolfBody", (0, 0, 0.55), root)
    create_part("Body", "cyl", (0, 0, 0), (0.45, 0.45, 0.95), rot=(1.57, 0, 0), mat=m_fur, parent=torso)
    create_part("Head", "sphere", (0, -0.55, 0.18), (0.38, 0.42, 0.36), mat=m_fur, parent=torso)
    create_part("Snout", "cone", (0, -0.82, 0.14), (0.2, 0.2, 0.28), rot=(-1.57, 0, 0), mat=m_fur, parent=torso)
    create_part("EarL", "cone", (-0.12, -0.5, 0.4), (0.1, 0.1, 0.2), mat=m_fur, parent=torso)
    create_part("EarR", "cone", (0.12, -0.5, 0.4), (0.1, 0.1, 0.2), mat=m_fur, parent=torso)
    create_part("EyeL", "sphere", (-0.1, -0.72, 0.24), (0.06, 0.06, 0.06), mat=m_eye_w, parent=torso)
    create_part("EyeR", "sphere", (0.1, -0.72, 0.24), (0.06, 0.06, 0.06), mat=m_eye_w, parent=torso)
    tail = create_part("Tail", "cone", (0, 0.56, 0.12), (0.14, 0.14, 0.45), rot=(0.8, 0, 0), mat=m_fur, parent=torso)
    la = create_empty("FL", (-0.16, -0.32, -0.12), torso)
    create_part("FLM", "cyl", (0, 0, -0.22), (0.12, 0.12, 0.44), mat=m_fur, parent=la)
    ra = create_empty("FR", (0.16, -0.32, -0.12), torso)
    create_part("FRM", "cyl", (0, 0, -0.22), (0.12, 0.12, 0.44), mat=m_fur, parent=ra)
    ll = create_empty("BL", (-0.16, 0.32, -0.12), torso)
    create_part("BLM", "cyl", (0, 0, -0.22), (0.12, 0.12, 0.44), mat=m_fur, parent=ll)
    rl = create_empty("BR", (0.16, 0.32, -0.12), torso)
    create_part("BRM", "cyl", (0, 0, -0.22), (0.12, 0.12, 0.44), mat=m_fur, parent=rl)
    animate_biped_clips(root, torso, la, ra, ll, rl)
    export_glb("wolf.glb")

    # 3. Orc
    clear_scene()
    root = create_empty("mob_orc")
    m_skin = make_mat("OrcSkin", (0.34, 0.52, 0.2), roughness=0.65)
    m_iron = make_mat("OrcIron", (0.25, 0.27, 0.3), metallic=0.8, roughness=0.45)
    m_red = make_mat("OrcPaint", (0.75, 0.12, 0.12), roughness=0.5)
    torso = create_empty("OrcTorso", (0, 0, 1.0), root)
    create_part("Chest", "cube", (0, 0, 0.08), (0.68, 0.44, 0.72), mat=m_skin, parent=torso, bevel=0.05)
    create_part("Head", "sphere", (0, 0, 0.6), (0.42, 0.4, 0.42), mat=m_skin, parent=torso)
    create_part("TuskL", "cone", (-0.1, -0.2, 0.54), (0.06, 0.06, 0.16), rot=(-0.4, 0, 0), mat=make_mat("Ivory", (0.95, 0.92, 0.8)), parent=torso)
    create_part("TuskR", "cone", (0.1, -0.2, 0.54), (0.06, 0.06, 0.16), rot=(-0.4, 0, 0), mat=make_mat("Ivory2", (0.95, 0.92, 0.8)), parent=torso)
    create_part("PauldronL", "sphere", (-0.42, 0, 0.32), (0.32, 0.32, 0.28), mat=m_iron, parent=torso)
    create_part("Warpaint", "cube", (0, -0.23, 0.14), (0.36, 0.04, 0.16), mat=m_red, parent=torso)
    la = create_empty("OrcLA", (-0.44, 0, 0.24), torso)
    create_part("OrcLAM", "cyl", (0, 0, -0.25), (0.18, 0.18, 0.5), mat=m_skin, parent=la)
    ra = create_empty("OrcRA", (0.44, 0, 0.24), torso)
    create_part("OrcRAM", "cyl", (0, 0, -0.25), (0.18, 0.18, 0.5), mat=m_skin, parent=ra)
    create_part("AxeHaft", "cyl", (0, -0.2, -0.15), (0.07, 0.07, 0.95), rot=(0.3, 0, 0), mat=m_iron, parent=ra)
    create_part("AxeBlade", "cube", (0, -0.35, 0.25), (0.08, 0.36, 0.32), mat=m_iron, parent=ra, bevel=0.02)
    ll = create_empty("OrcLL", (-0.18, 0, -0.32), torso)
    create_part("OrcLLM", "cyl", (0, 0, -0.26), (0.2, 0.2, 0.54), mat=m_iron, parent=ll)
    rl = create_empty("OrcRL", (0.18, 0, -0.32), torso)
    create_part("OrcRLM", "cyl", (0, 0, -0.26), (0.2, 0.2, 0.54), mat=m_iron, parent=rl)
    animate_biped_clips(root, torso, la, ra, ll, rl)
    export_glb("orc.glb")

    # 4. Boss Golem
    clear_scene()
    root = create_empty("mob_boss_golem")
    m_rock = make_mat("Obsidian", (0.14, 0.12, 0.16), metallic=0.25, roughness=0.75)
    m_magma = make_mat("Magma", (1.0, 0.42, 0.05), emission=(1.0, 0.38, 0.02), emission_strength=4.5)
    torso = create_empty("GolemTorso", (0, 0, 1.35), root)
    create_part("Body", "ico", (0, 0, 0.1), (1.05, 0.72, 1.1), mat=m_rock, parent=torso)
    create_part("Core", "ico", (0, -0.3, 0.12), (0.36, 0.36, 0.36), mat=m_magma, parent=torso)
    create_part("Head", "cube", (0, 0, 0.8), (0.48, 0.46, 0.46), mat=m_rock, parent=torso, bevel=0.05)
    create_part("Crown", "torus", (0, 0, 1.06), (0.42, 0.42, 0.42), mat=m_magma, parent=torso)
    la = create_empty("GolemLA", (-0.72, 0, 0.35), torso)
    create_part("GolemLAM", "cube", (0, 0, -0.42), (0.34, 0.34, 0.88), mat=m_rock, parent=la, bevel=0.04)
    ra = create_empty("GolemRA", (0.72, 0, 0.35), torso)
    create_part("GolemRAM", "cube", (0, 0, -0.42), (0.34, 0.34, 0.88), mat=m_rock, parent=ra, bevel=0.04)
    ll = create_empty("GolemLL", (-0.28, 0, -0.48), torso)
    create_part("GolemLLM", "cube", (0, 0, -0.38), (0.32, 0.34, 0.76), mat=m_rock, parent=ll, bevel=0.04)
    rl = create_empty("GolemRL", (0.28, 0, -0.48), torso)
    create_part("GolemRLM", "cube", (0, 0, -0.38), (0.32, 0.34, 0.76), mat=m_rock, parent=rl, bevel=0.04)
    animate_biped_clips(root, torso, la, ra, ll, rl)
    export_glb("boss_golem.glb")


def build_props():
    # Pine Tree
    clear_scene()
    m_bark = make_mat("Bark", (0.28, 0.18, 0.1), roughness=0.9)
    m_pine = make_mat("PineLeaf", (0.07, 0.32, 0.16), roughness=0.75)
    create_part("Trunk", "cyl", (0, 0, 0.75), (0.28, 0.28, 1.5), mat=m_bark)
    create_part("Cone1", "cone", (0, 0, 1.7), (1.4, 1.4, 1.3), mat=m_pine)
    create_part("Cone2", "cone", (0, 0, 2.45), (1.05, 1.05, 1.15), mat=m_pine)
    create_part("Cone3", "cone", (0, 0, 3.1), (0.7, 0.7, 0.9), mat=m_pine)
    export_glb("pine_tree.glb")

    # Oak Tree
    clear_scene()
    m_bark = make_mat("Bark", (0.28, 0.18, 0.1), roughness=0.9)
    m_oak = make_mat("OakLeaf", (0.12, 0.42, 0.18), roughness=0.75)
    create_part("Trunk", "cyl", (0, 0, 0.7), (0.34, 0.34, 1.4), mat=m_bark)
    create_part("Canopy1", "ico", (0, 0, 1.9), (1.6, 1.5, 1.25), mat=m_oak)
    create_part("Canopy2", "ico", (0.45, 0.25, 1.65), (1.0, 1.0, 0.9), mat=m_oak)
    export_glb("oak_tree.glb")

    # Brazier
    clear_scene()
    m_stone = make_mat("Stone", (0.25, 0.28, 0.34), roughness=0.8)
    m_fire = make_mat("Fire", (1.0, 0.55, 0.1), emission=(1.0, 0.45, 0.05), emission_strength=4.0)
    create_part("Pedestal", "cyl", (0, 0, 0.45), (0.55, 0.55, 0.9), mat=m_stone)
    create_part("Bowl", "torus", (0, 0, 0.95), (0.75, 0.75, 0.75), mat=m_stone)
    create_part("Flame", "cone", (0, 0, 1.25), (0.42, 0.42, 0.65), mat=m_fire)
    export_glb("brazier.glb")

    # Campfire
    clear_scene()
    m_bark = make_mat("Bark", (0.28, 0.18, 0.1), roughness=0.9)
    m_fire = make_mat("Fire", (1.0, 0.55, 0.1), emission=(1.0, 0.45, 0.05), emission_strength=4.0)
    create_part("Log1", "cyl", (0, 0, 0.1), (0.14, 0.14, 0.85), rot=(1.57, 0, 0.4), mat=m_bark)
    create_part("Log2", "cyl", (0, 0, 0.1), (0.14, 0.14, 0.85), rot=(1.57, 0, -0.4), mat=m_bark)
    create_part("Flame", "cone", (0, 0, 0.38), (0.45, 0.45, 0.7), mat=m_fire)
    export_glb("campfire.glb")

    # Magma Obelisk
    clear_scene()
    m_obs = make_mat("Obsidian", (0.12, 0.1, 0.14), metallic=0.3, roughness=0.6)
    m_mag = make_mat("MagmaCrystal", (1.0, 0.4, 0.05), emission=(1.0, 0.35, 0.02), emission_strength=4.5)
    create_part("Base", "cube", (0, 0, 0.35), (0.9, 0.9, 0.7), mat=m_obs, bevel=0.05)
    create_part("Spire", "cone", (0, 0, 1.6), (0.65, 0.65, 2.0), mat=m_obs)
    create_part("Crystal", "ico", (0, 0, 2.85), (0.38, 0.38, 0.55), mat=m_mag)
    export_glb("obelisk.glb")

    # Portal
    clear_scene()
    m_portal_ring = make_mat("PortalFrame", (0.3, 0.35, 0.45), metallic=0.8, roughness=0.3)
    m_portal_glow = make_mat("PortalVortex", (0.2, 0.75, 1.0), emission=(0.15, 0.7, 1.0), emission_strength=4.0, alpha=0.85)
    create_part("Frame", "torus", (0, 0, 1.2), (1.8, 1.8, 1.8), rot=(1.57, 0, 0), mat=m_portal_ring)
    create_part("Vortex", "cyl", (0, 0, 1.2), (1.5, 1.5, 0.08), rot=(1.57, 0, 0), mat=m_portal_glow)
    export_glb("portal.glb")


if __name__ == "__main__":
    for hero in ["warrior", "mage", "archer", "assassin", "paladin"]:
        build_hero(hero)
    build_monsters()
    build_props()
    print("[Blender 5.2] All 15 GLB models exported successfully!")

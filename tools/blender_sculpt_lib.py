import math
import bpy
import bmesh
from mathutils import Euler, Vector


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _hash2(x, y, seed=1):
    n = math.sin(x * 12.9898 + y * 78.233 + seed * 43.12) * 43758.5453
    return n - math.floor(n)


def _fbm(u, v, seed=1):
    val = 0.0
    amp = 0.5
    freq = 6.0
    for i in range(4):
        ix = math.floor(u * freq)
        iy = math.floor(v * freq)
        fx = (u * freq) - ix
        fy = (v * freq) - iy
        fx = fx * fx * (3.0 - 2.0 * fx)
        fy = fy * fy * (3.0 - 2.0 * fy)
        a = _hash2(ix, iy, seed + i)
        b = _hash2(ix + 1, iy, seed + i)
        c = _hash2(ix, iy + 1, seed + i)
        d = _hash2(ix + 1, iy + 1, seed + i)
        val += amp * ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy)
        freq *= 2.05
        amp *= 0.5
    return val


def make_pbr_mat(
    name,
    c_dark,
    c_light,
    metallic=0.2,
    roughness=0.55,
    emission=None,
    emission_strength=0.0,
    alpha=1.0,
    pattern="fbm",
    bump_strength=0.35,
    size=256,
    seed=1,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")

    img = bpy.data.images.new(f"{name}_albedo", width=size, height=size)
    r_img = bpy.data.images.new(f"{name}_rough", width=size, height=size)
    n_img = bpy.data.images.new(f"{name}_normal", width=size, height=size)

    r_img.colorspace_settings.name = "Non-Color"
    n_img.colorspace_settings.name = "Non-Color"

    pixels = [0.0] * (size * size * 4)
    rpixels = [0.0] * (size * size * 4)
    heights = [0.0] * (size * size)

    for py in range(size):
        for px in range(size):
            u = px / size
            v = py / size
            n = _fbm(u, v, seed)
            if pattern == "plate":
                streak = _fbm(u * 0.4, v * 3.5, seed + 5)
                rivet = 1.0 if ((px % 32 in (4, 5)) and (py % 32 in (4, 5))) else 0.0
                f = min(1.0, 0.3 + 0.55 * streak + 0.35 * rivet)
                h = 0.4 * streak + 0.6 * rivet
            elif pattern == "magma":
                vein = abs(math.sin(u * 14.0 + n * 4.5) * math.cos(v * 14.0 - n * 4.0))
                f = 1.0 if vein < 0.14 else (0.12 + n * 0.28)
                h = 0.05 if vein < 0.14 else (0.5 + 0.5 * n)
            elif pattern == "fur":
                f = 0.25 + 0.75 * _fbm(u * 6.0, v * 1.1, seed)
                h = f
            elif pattern == "stone":
                brick = ((py // 32) % 2) * 32
                seam = (py % 32 < 2) or ((px + brick) % 64 < 2)
                f = 0.12 if seam else (0.45 + 0.55 * n)
                h = 0.1 if seam else (0.55 + 0.45 * n)
            else:
                f = 0.3 + 0.7 * n
                h = n

            heights[py * size + px] = h
            idx = (py * size + px) * 4
            pixels[idx] = max(0.0, min(1.0, c_dark[0] * (1 - f) + c_light[0] * f))
            pixels[idx + 1] = max(0.0, min(1.0, c_dark[1] * (1 - f) + c_light[1] * f))
            pixels[idx + 2] = max(0.0, min(1.0, c_dark[2] * (1 - f) + c_light[2] * f))
            pixels[idx + 3] = alpha

            rv = max(0.22, min(0.95, roughness + (0.5 - n) * 0.20))
            rpixels[idx] = rv
            rpixels[idx + 1] = rv
            rpixels[idx + 2] = rv
            rpixels[idx + 3] = 1.0

    # Bake tangent-space normal map from height field
    npixels = [0.0] * (size * size * 4)
    strength = bump_strength * 3.0
    for py in range(size):
        for px in range(size):
            hl = heights[py * size + ((px - 1) % size)]
            hr = heights[py * size + ((px + 1) % size)]
            hu = heights[((py - 1) % size) * size + px]
            hd = heights[((py + 1) % size) * size + px]
            dx = (hl - hr) * strength
            dy = (hu - hd) * strength
            dz = 1.0
            inv = 1.0 / math.sqrt(dx * dx + dy * dy + dz * dz)
            idx = (py * size + px) * 4
            npixels[idx] = (dx * inv) * 0.5 + 0.5
            npixels[idx + 1] = (dy * inv) * 0.5 + 0.5
            npixels[idx + 2] = (dz * inv) * 0.5 + 0.5
            npixels[idx + 3] = 1.0

    img.pixels.foreach_set(pixels)
    img.pack()
    r_img.pixels.foreach_set(rpixels)
    r_img.pack()
    n_img.pixels.foreach_set(npixels)
    n_img.pack()

    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])

    rtex = nt.nodes.new("ShaderNodeTexImage")
    rtex.image = r_img
    nt.links.new(rtex.outputs["Color"], bsdf.inputs["Roughness"])

    ntex = nt.nodes.new("ShaderNodeTexImage")
    ntex.image = n_img
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = bump_strength
    nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])

    bsdf.inputs["Metallic"].default_value = metallic
    if emission and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else "OPAQUE"
        bsdf.inputs["Alpha"].default_value = alpha
    return mat


def make_joint(name, loc=(0, 0, 0), parent=None, rot=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = Euler(rot, "XYZ")
    obj.rotation_mode = "XYZ"
    if parent:
        obj.parent = parent
    return obj


def finalize_mesh(bm, name, mat=None, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), subsurf=0, bevel=0.0, smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = Euler(rot, "XYZ")
    obj.scale = scale
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    if bevel > 0:
        bm_mod = obj.modifiers.new("Bevel", "BEVEL")
        bm_mod.width = bevel
        bm_mod.segments = 2
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
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def sculpt_cross_section(name, sections, segments=16, mat=None, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), subsurf=0, bevel=0.0, smooth=True):
    bm = bmesh.new()
    rings = []
    for rx, ry, y_off, z in sections:
        ring = []
        for s in range(segments):
            ang = (s / segments) * math.pi * 2.0
            vx = math.cos(ang) * rx
            vy = math.sin(ang) * ry + y_off
            ring.append(bm.verts.new((vx, vy, z)))
        rings.append(ring)

    for i in range(len(rings) - 1):
        for s in range(segments):
            ns = (s + 1) % segments
            bm.faces.new((rings[i][s], rings[i][ns], rings[i + 1][ns], rings[i + 1][s]))

    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    return finalize_mesh(bm, name, mat=mat, parent=parent, loc=loc, rot=rot, subsurf=subsurf, bevel=bevel, smooth=smooth)


def sculpt_jagged_rock(name, radius=0.4, seed=1, mat=None, parent=None, loc=(0, 0, 0), scale=(1, 1, 1)):
    """Create a craggy asymmetric basalt/stone shard (never a smooth sphere)."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=radius)
    for v in bm.verts:
        n = _fbm(v.co.x * 1.8 + 0.5, v.co.y * 1.8 + v.co.z * 1.4, seed)
        disp = 0.68 + n * 0.65
        v.co *= disp
    return finalize_mesh(bm, name, mat=mat, parent=parent, loc=loc, scale=scale, subsurf=0, smooth=False)


def sculpt_shield(name, mat_face, mat_rim, parent=None, loc=(0, 0, 0)):
    bm = bmesh.new()
    pts = [
        (0.0, -0.36), (-0.23, -0.14), (-0.27, 0.16), (-0.19, 0.31),
        (0.0, 0.35), (0.19, 0.31), (0.27, 0.16), (0.23, -0.14),
    ]
    front = [bm.verts.new((-0.03, x, z)) for x, z in pts]
    back = [bm.verts.new((0.03, x * 0.92, z * 0.92)) for x, z in pts]
    cf = bm.verts.new((-0.08, 0.0, 0.02))
    cb = bm.verts.new((0.04, 0.0, 0.02))
    n = len(pts)
    for i in range(n):
        ni = (i + 1) % n
        bm.faces.new((front[i], front[ni], cf))
        bm.faces.new((back[ni], back[i], cb))
        bm.faces.new((front[ni], front[i], back[i], back[ni]))
    sh = finalize_mesh(bm, name, mat=mat_rim, parent=parent, loc=loc, bevel=0.01, smooth=False)
    # Center boss emblem
    sculpt_cross_section(f"{name}_Boss", [(0.02, 0.08, 0, -0.08), (0.05, 0.10, 0, 0.0), (0.02, 0.08, 0, 0.08)], segments=8, mat=mat_face, parent=sh, loc=(-0.05, 0, 0.03), smooth=False)
    return sh


def sculpt_greatsword(name, mat_blade, mat_gold, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    bm = bmesh.new()
    w0, w1, L = 0.075, 0.052, 1.08
    r0 = [bm.verts.new(p) for p in [(0, -w0, 0.16), (0.022, 0, 0.16), (0, w0, 0.16), (-0.022, 0, 0.16)]]
    r1 = [bm.verts.new(p) for p in [(0, -w1, L * 0.8), (0.016, 0, L * 0.8), (0, w1, L * 0.8), (-0.016, 0, L * 0.8)]]
    tip = bm.verts.new((0, 0, L))
    for i in range(4):
        ni = (i + 1) % 4
        bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))
        bm.faces.new((r1[i], r1[ni], tip))
    bm.faces.new(list(reversed(r0)))
    blade = finalize_mesh(bm, name, mat=mat_blade, parent=parent, loc=loc, rot=rot, smooth=False)

    sculpt_cross_section(f"{name}_Guard", [(0.025, 0.18, 0, 0.12), (0.038, 0.24, 0, 0.15), (0.025, 0.18, 0, 0.18)], segments=6, mat=mat_gold, parent=blade, smooth=False)
    sculpt_cross_section(f"{name}_Grip", [(0.028, 0.028, 0, -0.14), (0.022, 0.022, 0, 0.12)], segments=8, mat=mat_gold, parent=blade, smooth=False)
    sculpt_cross_section(f"{name}_Pommel", [(0.02, 0.02, 0, -0.20), (0.048, 0.048, 0, -0.16), (0.02, 0.02, 0, -0.13)], segments=8, mat=mat_gold, parent=blade, smooth=False)
    return blade


def sculpt_battleaxe(name, mat_blade, mat_haft, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    """Double-headed notched Orc battleaxe."""
    haft = sculpt_cross_section(name, [(0.032, 0.032, 0, -0.18), (0.038, 0.038, 0, 0.92)], segments=8, mat=mat_haft, parent=parent, loc=loc, rot=rot, smooth=False)
    for sy in (-1, 1):
        bm = bmesh.new()
        pts = [(0.03, 0.06 * sy, 0.62), (0.03, 0.28 * sy, 0.48), (0.01, 0.34 * sy, 0.72), (0.03, 0.26 * sy, 0.94), (0.03, 0.06 * sy, 0.82)]
        f_verts = [bm.verts.new((p[0], p[1], p[2])) for p in pts]
        b_verts = [bm.verts.new((-p[0], p[1], p[2])) for p in pts]
        n = len(pts)
        for i in range(n):
            ni = (i + 1) % n
            bm.faces.new((f_verts[i], f_verts[ni], b_verts[ni], b_verts[i]))
        bm.faces.new(f_verts)
        bm.faces.new(list(reversed(b_verts)))
        finalize_mesh(bm, f"{name}_Blade_{sy}", mat=mat_blade, parent=haft, smooth=False)
    return haft


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


def animate_biped(pelvis, arm_l, arm_r, leg_l, leg_r, style="melee"):
    base_z = pelvis.location.z
    base_al_y = arm_l.rotation_euler.y
    base_ar_y = arm_r.rotation_euler.y
    joints = [pelvis, arm_l, arm_r, leg_l, leg_r]

    def pose(f, pz=0.0, px=0.0, prz=0.0, al=0.0, ar=0.0, ll=0.0, lr=0.0):
        pelvis.location.z = base_z + pz
        pelvis.keyframe_insert("location", index=2, frame=f)
        pelvis.rotation_euler.x = px
        pelvis.keyframe_insert("rotation_euler", index=0, frame=f)
        pelvis.rotation_euler.z = prz
        pelvis.keyframe_insert("rotation_euler", index=2, frame=f)
        for j, rx in [(arm_l, al), (arm_r, ar), (leg_l, ll), (leg_r, lr)]:
            j.rotation_euler.x = rx
            j.keyframe_insert("rotation_euler", index=0, frame=f)
        arm_l.rotation_euler.y = base_al_y
        arm_l.keyframe_insert("rotation_euler", index=1, frame=f)
        arm_r.rotation_euler.y = base_ar_y
        arm_r.keyframe_insert("rotation_euler", index=1, frame=f)

    # Idle: breathing bob + combat ready guard sway
    pose(1, 0.0, 0.03, 0.0, 0.10, -0.10, 0.0, 0.0)
    pose(15, 0.035, 0.01, 0.04, 0.18, -0.18, 0.02, -0.02)
    pose(30, 0.0, 0.03, 0.0, 0.10, -0.10, 0.0, 0.0)
    for j in joints:
        push_nla(j, "Idle", 1, 30)

    # Walk: expressive stride + hip counter-twist + vertical bob
    pose(40, 0.0, 0.08, -0.12, 0.62, -0.62, -0.62, 0.62)
    pose(46, 0.05, 0.05, 0.0, 0.0, 0.0, 0.0, 0.0)
    pose(52, 0.0, 0.08, 0.12, -0.62, 0.62, 0.62, -0.62)
    pose(58, 0.05, 0.05, 0.0, 0.0, 0.0, 0.0, 0.0)
    pose(64, 0.0, 0.08, -0.12, 0.62, -0.62, -0.62, 0.62)
    for j in joints:
        push_nla(j, "Walk", 40, 64)

    # Attack: distinct class/monster combat choreography
    if style == "caster":
        pose(70, 0.0, 0.0, 0.0, 0.10, -0.10, 0.0, 0.0)
        pose(76, 0.07, -0.12, -0.15, -1.15, -1.25, 0.10, -0.10)
        pose(83, -0.02, 0.18, 0.25, -0.35, -1.55, -0.15, 0.15)
        pose(92, 0.0, 0.03, 0.0, 0.10, -0.10, 0.0, 0.0)
    elif style == "archer":
        pose(70, 0.0, 0.02, 0.10, -0.95, -0.25, 0.10, -0.10)
        pose(77, -0.02, 0.04, 0.38, -1.38, -0.95, 0.18, -0.18)
        pose(83, 0.02, -0.05, -0.10, -1.30, 0.42, 0.05, -0.05)
        pose(92, 0.0, 0.03, 0.0, 0.10, -0.10, 0.0, 0.0)
    elif style == "dual":
        pose(70, -0.06, 0.16, -0.20, -0.30, -0.30, 0.20, -0.20)
        pose(75, 0.04, 0.24, -0.45, -1.45, -1.35, -0.25, 0.25)
        pose(82, -0.04, 0.26, 0.48, 0.85, 0.95, 0.25, -0.25)
        pose(90, 0.0, 0.03, 0.0, 0.10, -0.10, 0.0, 0.0)
    elif style == "heavy":
        pose(70, 0.0, 0.04, 0.0, 0.10, -0.10, 0.0, 0.0)
        pose(78, 0.12, -0.18, 0.0, -2.10, -2.10, 0.15, -0.15)
        pose(85, -0.10, 0.28, 0.0, 0.72, 0.72, -0.22, 0.22)
        pose(94, 0.0, 0.03, 0.0, 0.10, -0.10, 0.0, 0.0)
    else:  # melee
        pose(70, 0.0, 0.04, 0.0, 0.15, -0.25, 0.10, -0.10)
        pose(76, 0.04, -0.06, -0.38, -0.45, -1.68, 0.22, -0.22)
        pose(83, -0.05, 0.20, 0.45, 0.28, 0.92, -0.22, 0.22)
        pose(92, 0.0, 0.03, 0.0, 0.10, -0.10, 0.0, 0.0)
    for j in joints:
        push_nla(j, "Attack", 70, 94 if style == "heavy" else 92)


def render_studio_preview(out_png):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.filepath = out_png
    scene.view_settings.view_transform = "AgX" if "AgX" in [e.identifier for e in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"

    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.07, 0.09, 0.13, 1.0)
    bg.inputs[1].default_value = 0.9

    # Soft Sun Key + Cool Rim + Warm Fill (no harsh rectangular area speculars)
    key = bpy.data.lights.new("KeySun", "SUN")
    key.energy = 2.6
    key.angle = 0.45
    ko = bpy.data.objects.new("KeySun", key)
    bpy.context.collection.objects.link(ko)
    ko.rotation_euler = Euler((0.85, 0.2, 0.65), "XYZ")

    rim = bpy.data.lights.new("RimSun", "SUN")
    rim.energy = 1.4
    rim.color = (0.65, 0.85, 1.0)
    ro = bpy.data.objects.new("RimSun", rim)
    bpy.context.collection.objects.link(ro)
    ro.rotation_euler = Euler((-0.9, 0.0, -2.5), "XYZ")

    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (2.1, -3.1, 1.75)
    direction = Vector((0, 0, 0.95)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.ops.render.render(write_still=True)

    for obj in (ko, ro, cam):
        bpy.data.objects.remove(obj, do_unlink=True)

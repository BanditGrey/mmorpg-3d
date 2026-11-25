import os
import json
import bpy
from mathutils import Vector, Euler

MODELS_DIR = r"d:\MMORPG\client\public\models"
OUT_DIR = r"d:\MMORPG\references"
TARGETS = ["warrior", "mage", "paladin", "archer", "assassin", "slime", "wolf", "orc", "boss_golem"]


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_mat(name, color, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.55
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 1.6
    return mat


def render_wire(name):
    clear()
    glb_path = os.path.join(MODELS_DIR, f"{name}.glb")
    bpy.ops.import_scene.gltf(filepath=glb_path)

    m_clay = make_mat("ClayMesh", (0.24, 0.28, 0.36))
    m_wire = make_mat("WireEdge", (0.25, 0.90, 1.0), emission=(0.25, 0.90, 1.0))

    verts_total = 0
    faces_total = 0
    clips = set()

    for obj in bpy.context.scene.objects:
        if obj.animation_data:
            for trk in obj.animation_data.nla_tracks:
                clips.add(trk.name)
        if obj.type == "MESH":
            verts_total += len(obj.data.vertices)
            faces_total += len(obj.data.polygons)
            obj.data.materials.clear()
            obj.data.materials.append(m_clay)
            obj.data.materials.append(m_wire)
            wf = obj.modifiers.new("WireOverlay", "WIREFRAME")
            wf.thickness = 0.0045
            wf.use_replace = False
            wf.material_offset = 1
            wf.use_even_offset = True

    scene = bpy.context.scene
    scene.render.engine = (
        "BLENDER_EEVEE_NEXT"
        if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
        else "BLENDER_EEVEE"
    )
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    out_png = os.path.join(OUT_DIR, f"wire_{name}.png")
    scene.render.filepath = out_png

    world = bpy.data.worlds.new("WireWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.04, 0.05, 0.08, 1.0)

    key = bpy.data.lights.new("Key", "SUN")
    key.energy = 2.2
    ko = bpy.data.objects.new("Key", key)
    bpy.context.collection.objects.link(ko)
    ko.rotation_euler = Euler((0.85, 0.2, 0.65), "XYZ")

    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (2.1, -3.1, 1.75)
    cam.rotation_euler = (Vector((0, 0, 0.95)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.ops.render.render(write_still=True)

    return {"name": name, "verts": verts_total, "faces": faces_total, "clips": sorted(clips)}


if __name__ == "__main__":
    stats = [render_wire(t) for t in TARGETS]
    with open(os.path.join(OUT_DIR, "mesh_stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
    print("MESH_STATS:", json.dumps(stats))

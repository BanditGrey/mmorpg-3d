import math
import random
import bpy


def _noise2d(x, y, seed=1):
    n = math.sin(x * 12.9898 + y * 78.233 + seed * 43.12) * 43758.5453
    return n - math.floor(n)


def bake_pbr_material(
    name,
    base_rgb,
    detail_rgb,
    metallic=0.1,
    roughness=0.5,
    emission_rgb=None,
    emission_strength=0.0,
    alpha=1.0,
    pattern="grain",
    size=128,
    seed=1,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")

    img = bpy.data.images.new(f"{name}_tex", width=size, height=size)
    pixels = [0.0] * (size * size * 4)

    for py in range(size):
        for px in range(size):
            u = px / size
            v = py / size
            t = _noise2d(px * 0.25, py * 0.25, seed)
            if pattern == "stone":
                brick = ((py // 16) % 2) * 16
                seam = (py % 16 == 0) or ((px + brick) % 32 == 0)
                f = 0.15 if seam else (0.55 + t * 0.45)
            elif pattern == "magma":
                vein = abs(math.sin(u * 12.0 + t * 2.5) * math.cos(v * 12.0 - t * 2.0))
                f = 1.0 if vein < 0.16 else (0.15 + t * 0.25)
            elif pattern == "fur":
                f = 0.4 + 0.6 * _noise2d(px * 0.8, py * 0.15, seed)
            elif pattern == "metal":
                streak = _noise2d(px * 0.08, py * 0.6, seed)
                f = 0.5 + 0.5 * streak
            elif pattern == "wood":
                ring = math.sin(u * 24.0 + t * 1.8) * 0.5 + 0.5
                f = 0.35 + 0.65 * ring
            else:
                f = 0.4 + 0.6 * t

            r = base_rgb[0] * (1.0 - f) + detail_rgb[0] * f
            g = base_rgb[1] * (1.0 - f) + detail_rgb[1] * f
            b = base_rgb[2] * (1.0 - f) + detail_rgb[2] * f
            idx = (py * size + px) * 4
            pixels[idx] = max(0.0, min(1.0, r))
            pixels[idx + 1] = max(0.0, min(1.0, g))
            pixels[idx + 2] = max(0.0, min(1.0, b))
            pixels[idx + 3] = alpha

    img.pixels.foreach_set(pixels)
    img.pack()

    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.image = img
    nt.links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])

    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission_rgb and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emission_rgb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else "OPAQUE"
        bsdf.inputs["Alpha"].default_value = alpha
    return mat
